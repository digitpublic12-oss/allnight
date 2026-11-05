import { db } from "@/lib/supabase";
import type { HoursInput, ProposedData } from "@/features/submission/validate";

// 관리자 화면의 데이터 읽기·쓰기. 읽기는 관리자 RLS 정책, 쓰기는 관리자 확인 함수(RPC)를 거친다.
// 관리자가 아닌 사람이 불러도 DB가 빈 결과나 '권한 없음' 오류를 돌려준다.

export type SubmissionStatus = "received" | "in_review" | "approved" | "rejected";

export type SubmissionRow = {
  id: string;
  type: "new_place" | "correction";
  status: SubmissionStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  guest_email: string | null;
  place_id: string | null;
  result_place_id: string | null;
  proposed_data: ProposedData;
  places: { name: string } | null;
  submitter: { nickname: string } | null;
};

export type AdminPlaceRow = {
  id: string;
  name: string;
  province: string;
  city_district: string;
  verification_status: "verified" | "needs_check" | "unverified";
  last_verified_at: string | null;
  deleted_at: string | null;
  categories: { name: string } | null;
};

export type DashboardCounts = {
  pendingNew: number;
  pendingCorrection: number;
  places: number;
  verified: number;
  stale: number;
  hidden: number;
};

const PENDING: SubmissionStatus[] = ["received", "in_review"];

async function count(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count: n, error } = await query;
  if (error) throw error;
  return n ?? 0;
}

export async function fetchDashboardCounts(): Promise<DashboardCounts> {
  const head = { count: "exact" as const, head: true };
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [pendingNew, pendingCorrection, places, verified, stale, hidden] = await Promise.all([
    count(db.from("submissions").select("id", head).eq("type", "new_place").in("status", PENDING)),
    count(db.from("submissions").select("id", head).eq("type", "correction").in("status", PENDING)),
    count(db.from("places").select("id", head).is("deleted_at", null)),
    count(db.from("places").select("id", head).is("deleted_at", null).eq("verification_status", "verified")),
    // 정보 오래됨: 확인 이력이 없거나 30일이 지난 공개 장소
    count(db.from("places").select("id", head).is("deleted_at", null).or(`last_verified_at.is.null,last_verified_at.lt.${monthAgo}`)),
    count(db.from("places").select("id", head).not("deleted_at", "is", null)),
  ]);
  return { pendingNew, pendingCorrection, places, verified, stale, hidden };
}

const SUBMISSION_COLUMNS = `
  id, type, status, created_at, reviewed_at, rejection_reason, guest_email, place_id, result_place_id, proposed_data,
  places:place_id(name),
  submitter:profiles!submissions_submitted_by_fkey(nickname)
`;

export async function fetchSubmissions(filter: "new_place" | "correction" | "done", limit = 100): Promise<SubmissionRow[]> {
  let query = db.from("submissions").select(SUBMISSION_COLUMNS);
  if (filter === "done") {
    query = query.in("status", ["approved", "rejected"]).order("reviewed_at", { ascending: false });
  } else {
    // 먼저 들어온 제보부터 처리한다
    query = query.eq("type", filter).in("status", PENDING).order("created_at", { ascending: true });
  }
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return data as unknown as SubmissionRow[];
}

export async function approveSubmission(id: string, latitude?: number, longitude?: number): Promise<string> {
  const { data, error } = await db.rpc("approve_submission", {
    p_submission_id: id,
    p_latitude: latitude ?? null,
    p_longitude: longitude ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await db.rpc("reject_submission", { p_submission_id: id, p_reason: reason });
  if (error) throw new Error(error.message);
}

export async function fetchAdminPlaces(search: string, includeHidden: boolean): Promise<AdminPlaceRow[]> {
  let query = db
    .from("places")
    .select("id, name, province, city_district, verification_status, last_verified_at, deleted_at, categories(name)")
    .order("name");
  if (!includeHidden) query = query.is("deleted_at", null);
  const keyword = search.trim().replace(/[%_,()]/g, "");
  if (keyword) query = query.or(`name.ilike.%${keyword}%,address_full.ilike.%${keyword}%`);
  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data as unknown as AdminPlaceRow[];
}

export async function markVerified(placeId: string, method?: string): Promise<void> {
  const { error } = await db.rpc("admin_mark_verified", { p_place_id: placeId, p_method: method ?? null, p_note: null });
  if (error) throw new Error(error.message);
}

export async function setPlaceHidden(placeId: string, hidden: boolean): Promise<void> {
  const { error } = await db.rpc("admin_set_place_hidden", { p_place_id: placeId, p_hidden: hidden });
  if (error) throw new Error(error.message);
}

export type AdminPlaceData = ProposedData & { latitude: number; longitude: number; hours: HoursInput };

/** placeId가 null이면 새 장소를 만든다. 저장된 장소 ID를 돌려준다. */
export async function savePlace(placeId: string | null, data: AdminPlaceData): Promise<string> {
  const { data: id, error } = await db.rpc("admin_save_place", { p_place_id: placeId, p_data: data });
  if (error) throw new Error(error.message);
  return id as string;
}
