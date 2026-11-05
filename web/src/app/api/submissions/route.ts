import { createServerClient } from "@/lib/supabaseServer";
import { validateGuestEmail, validateProposed, type SubmissionType } from "@/features/submission/validate";

// 제보 접수 API (DB.md §3.7, §7.3: 비회원·회원 제보는 이 제한된 서버 경로로만 받는다)
// 순서: 크기 제한 → Turnstile(사람 확인) → 회원 확인 → 입력 검사 → 참조 데이터 확인 → 회원 요청 제한 → 저장

const MAX_BODY_BYTES = 20_000;
const MEMBER_LIMIT_PER_HOUR = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, message: string, errors?: Record<string, string>) {
  return Response.json({ ok: false, message, errors }, { status });
}

async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || !token) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = (await res.json()) as { success?: boolean };
  return result.success === true;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, "제보 내용이 너무 깁니다.");

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "요청 형식이 올바르지 않습니다.");
  }

  const type = body.type as SubmissionType;
  if (type !== "new_place" && type !== "correction") return fail(400, "제보 종류가 올바르지 않습니다.");

  // 1) 사람 확인. 토큰은 한 번만 쓸 수 있어 화면은 제출할 때마다 새로 받는다.
  const human = await verifyTurnstile(body.turnstileToken, request.headers.get("cf-connecting-ip"));
  if (!human) return fail(403, "자동 입력 방지 확인에 실패했습니다. 확인 상자를 다시 체크해주세요.");

  const db = createServerClient();

  // 2) 회원이면 로그인 토큰으로 본인을 확인한다. 토큰이 있는데 틀리면 거절(다른 사람 행세 방지).
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data, error } = await db.auth.getUser(authHeader.slice("Bearer ".length));
    if (error || !data.user) return fail(401, "로그인이 만료되었습니다. 다시 로그인해주세요.");
    userId = data.user.id;
  }

  // 3) 입력 검사 — 허용된 칸만 남긴 데이터로 저장한다
  const { data: proposed, errors } = validateProposed(type, body.data);
  const guest = userId ? { email: null } : validateGuestEmail(body.guestEmail);
  if (guest.error) errors.guest_email = guest.error;
  const placeId = type === "correction" ? String(body.placeId ?? "") : null;
  if (type === "correction" && !UUID.test(placeId ?? "")) errors.form = "수정할 장소가 올바르지 않습니다.";
  if (Object.keys(errors).length > 0) return fail(400, "입력 내용을 확인해주세요.", errors as Record<string, string>);

  // 4) 카테고리·태그·대상 장소가 실제로 있는지 확인
  if (proposed.category_id) {
    const { data } = await db.from("categories").select("id").eq("id", proposed.category_id).eq("is_active", true).maybeSingle();
    if (!data) return fail(400, "입력 내용을 확인해주세요.", { category_id: "카테고리를 다시 골라주세요." });
  }
  if (proposed.tag_ids && proposed.tag_ids.length > 0) {
    const { data } = await db.from("tags").select("id").in("id", proposed.tag_ids).eq("is_active", true);
    if ((data ?? []).length !== proposed.tag_ids.length) {
      return fail(400, "입력 내용을 확인해주세요.", { tag_ids: "선택할 수 없는 태그가 있습니다." });
    }
  }
  if (placeId) {
    const { data } = await db.from("places").select("id").eq("id", placeId).is("deleted_at", null).maybeSingle();
    if (!data) return fail(404, "수정할 장소를 찾을 수 없습니다.");
  }

  // 5) 회원 요청 제한 (비회원은 Turnstile이 막는다)
  if (userId) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= MEMBER_LIMIT_PER_HOUR) return fail(429, "제보가 너무 많습니다. 잠시 후 다시 시도해주세요.");
  }

  // 6) 제보함에 저장. 공개 장소(places)에는 관리자 승인 전까지 아무것도 만들지 않는다.
  const { error } = await db.from("submissions").insert({
    type,
    place_id: placeId,
    proposed_data: proposed,
    submitted_by: userId,
    guest_email: guest.email,
  });
  if (error) return fail(500, "제보 접수 중 오류가 발생했습니다. 다시 시도해주세요.");

  return Response.json({ ok: true }, { status: 201 });
}
