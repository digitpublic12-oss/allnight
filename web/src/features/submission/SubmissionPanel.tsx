"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchPlaceDetail, fetchTags, type PlaceDetail, type TagRow } from "@/features/place/placeDetail";
import { fetchCategories, type CategoryRow } from "@/features/search/searchPlaces";
import { db } from "@/lib/supabase";
import HoursEditor, { emptyHours } from "./HoursEditor";
import Turnstile from "./Turnstile";
import {
  PROVINCES,
  validateGuestEmail,
  validateProposed,
  type FieldErrors,
  type HoursInput,
  type ProposedData,
} from "./validate";
import styles from "./SubmissionPanel.module.css";

type Props =
  | { mode: "new"; onBack: () => void; onOpenCorrection: (placeId: string) => void }
  | { mode: "correction"; placeId: string; onBack: () => void };

type FormState = {
  name: string;
  category_id: string;
  address_full: string;
  address_detail: string;
  province: string;
  city_district: string;
  neighborhood: string;
  phone: string;
  website_url: string;
  tag_ids: string[];
  hours: HoursInput;
  memo: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  category_id: "",
  address_full: "",
  address_detail: "",
  province: "서울특별시",
  city_district: "",
  neighborhood: "",
  phone: "",
  website_url: "",
  tag_ids: [],
  hours: emptyHours(),
  memo: "",
};

// 현재 장소 정보로 폼을 채운다 (04 정보 수정 제보: 프리필)
function formFromPlace(place: PlaceDetail): FormState {
  const hours = emptyHours();
  for (const day of place.place_regular_day_status) {
    hours[String(day.weekday)] = {
      status: day.status,
      intervals: [...day.place_regular_intervals]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((it) => ({ start: it.start_time.slice(0, 5), end: it.end_time.slice(0, 5), next_day: it.end_day_offset === 1 })),
    };
  }
  return {
    name: place.name,
    category_id: place.category_id,
    address_full: place.address_full,
    address_detail: place.address_detail ?? "",
    province: place.province,
    city_district: place.city_district,
    neighborhood: place.neighborhood ?? "",
    phone: place.phone ?? "",
    website_url: place.website_url ?? "",
    tag_ids: place.place_tags.map((t) => t.tag_id),
    hours,
    memo: "",
  };
}

// 수정 제보는 "처음과 달라진 칸"만 보낸다 (DB.md §8.3)
function changedFields(initial: FormState, current: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys: (keyof FormState)[] = [
    "name", "category_id", "address_full", "address_detail", "province", "city_district",
    "neighborhood", "phone", "website_url", "tag_ids", "hours",
  ];
  for (const key of keys) {
    const a = key === "tag_ids" ? [...initial.tag_ids].sort() : initial[key];
    const b = key === "tag_ids" ? [...current.tag_ids].sort() : current[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = current[key];
  }
  if (current.memo.trim()) out.memo = current.memo;
  return out;
}

export default function SubmissionPanel(props: Props) {
  const { user, showToast } = useAuth();
  const isCorrection = props.mode === "correction";
  const placeId = props.mode === "correction" ? props.placeId : null;

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [initial, setInitial] = useState<FormState>(EMPTY_FORM);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [placeName, setPlaceName] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notFound" | "error">(isCorrection ? "loading" : "ready");
  const [guestEmail, setGuestEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [similar, setSimilar] = useState<{ id: string; name: string; address_full: string }[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    if (!placeId) return;
    fetchPlaceDetail(placeId, "9999-12-31")
      .then((place) => {
        if (!place) return setLoadState("notFound");
        const prefilled = formFromPlace(place);
        setInitial(prefilled);
        setForm(prefilled);
        setPlaceName(place.name);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [placeId]);

  // 신규 제보: 이름이 비슷한 기존 장소를 보여 중복 제보를 줄인다 (막지는 않음)
  useEffect(() => {
    if (isCorrection) return;
    const keyword = form.name.trim().replace(/[%_,()]/g, "");
    const timer = setTimeout(async () => {
      if (keyword.length < 2) return setSimilar([]);
      const { data } = await db.from("places").select("id, name, address_full").ilike("name", `%${keyword}%`).limit(3);
      setSimilar(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name, isCorrection]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial) || guestEmail !== "",
    [form, initial, guestEmail],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  }

  function cancel() {
    if (dirty && !done && !window.confirm("작성 중인 내용이 저장되지 않고 사라집니다. 정말 나가시겠습니까?")) return;
    props.onBack();
  }

  function focusFirstError() {
    // 다음 그리기 후 첫 오류 칸으로 이동 (03 §4.1)
    setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner(null);

    const type = isCorrection ? "correction" : "new_place";
    const payload = isCorrection ? changedFields(initial, form) : { ...form };
    const { errors: found } = validateProposed(type, payload);
    if (!user) {
      const guest = validateGuestEmail(guestEmail);
      if (guest.error) found.guest_email = guest.error;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      if (found.form) setBanner(found.form);
      focusFirstError();
      return;
    }
    if (!token) {
      setBanner("자동 입력 방지 확인 상자가 통과될 때까지 잠시 기다려주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const { data: session } = await db.auth.getSession();
      if (session.session) headers.Authorization = `Bearer ${session.session.access_token}`;

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type,
          placeId,
          data: payload as ProposedData,
          guestEmail: user ? undefined : guestEmail,
          turnstileToken: token,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: FieldErrors };
      if (!res.ok || !result.ok) {
        setErrors(result.errors ?? {});
        setBanner(result.message ?? "제보 접수 중 오류가 발생했습니다. 다시 시도해주세요.");
        if (result.errors) focusFirstError();
        return;
      }
      setDone(true);
      showToast("제보가 접수되었습니다.");
    } catch {
      setBanner("제보 접수 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
      // Turnstile 통과 표시는 한 번만 쓸 수 있으므로 매번 새로 받는다
      setTurnstileReset((n) => n + 1);
    }
  }

  const title = isCorrection ? "정보 수정 제보" : "신규 야간 장소 제보";

  if (done) {
    return (
      <div className={styles.panel}>
        <div className={styles.done}>
          <p className={styles.doneTitle}>제보가 접수되었습니다</p>
          <p className={styles.muted}>관리자 확인 후 서비스에 반영됩니다.</p>
          {user && <p className={styles.muted}>처리 상태는 오른쪽 위 메뉴의 &lsquo;내 제보&rsquo;에서 볼 수 있습니다.</p>}
          <button type="button" className="btn btn-primary" onClick={props.onBack}>
            확인 / 지도 둘러보기
          </button>
        </div>
      </div>
    );
  }

  const invalid = (key: keyof FieldErrors) => (errors[key] ? { "aria-invalid": true as const } : {});
  const errorText = (key: keyof FieldErrors) =>
    errors[key] ? <span className={styles.error}>{errors[key]}</span> : null;

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <button type="button" className={`btn ${styles.back}`} onClick={cancel}>
          ← 취소
        </button>
      </div>

      {loadState === "loading" && <p className={styles.state}>장소 정보를 불러오는 중…</p>}
      {loadState === "notFound" && <p className={styles.state}>수정할 장소를 찾을 수 없습니다.</p>}
      {loadState === "error" && <p className={styles.state}>장소 정보를 불러오지 못했습니다.</p>}

      {loadState === "ready" && (
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.muted}>
              {isCorrection
                ? `‘${placeName}’의 바뀐 정보만 고쳐서 보내주세요. 관리자 확인 후 반영됩니다.`
                : "제보해주신 장소는 관리자 검토 후 등록됩니다."}
            </p>
          </header>

          {banner && (
            <p className={styles.banner} role="alert">
              {banner}
            </p>
          )}

          <label className={styles.field}>
            <span>장소명 *</span>
            <input className="input" {...invalid("name")} value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errorText("name")}
          </label>
          {!isCorrection && similar.length > 0 && (
            <div className={styles.similar}>
              <p>이미 등록된 장소인가요?</p>
              <ul>
                {similar.map((place) => (
                  <li key={place.id}>
                    <span>
                      <strong>{place.name}</strong> · {place.address_full}
                    </span>
                    <button
                      type="button"
                      onClick={() => props.mode === "new" && props.onOpenCorrection(place.id)}
                    >
                      이 장소 정보 수정 제보하기
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className={styles.field}>
            <legend>카테고리 *</legend>
            <div className={styles.chips} {...invalid("category_id")}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={form.category_id === c.id}
                  onClick={() => update("category_id", c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {errorText("category_id")}
          </fieldset>

          <fieldset className={styles.field}>
            <legend>위치 *</legend>
            <div className={styles.row}>
              <select
                className="input"
                aria-label="시·도"
                {...invalid("province")}
                value={form.province}
                onChange={(e) => update("province", e.target.value)}
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                className="input"
                aria-label="시·군·구"
                placeholder="시·군·구 (예: 마포구)"
                {...invalid("city_district")}
                value={form.city_district}
                onChange={(e) => update("city_district", e.target.value)}
              />
            </div>
            <input
              className="input"
              aria-label="도로명 주소"
              placeholder="도로명 주소 (예: 서울 마포구 양화로 160)"
              {...invalid("address_full")}
              value={form.address_full}
              onChange={(e) => update("address_full", e.target.value)}
            />
            <div className={styles.row}>
              <input
                className="input"
                aria-label="읍·면·동"
                placeholder="동 (선택)"
                value={form.neighborhood}
                onChange={(e) => update("neighborhood", e.target.value)}
              />
              <input
                className="input"
                aria-label="상세 주소"
                placeholder="층·호수 (선택)"
                value={form.address_detail}
                onChange={(e) => update("address_detail", e.target.value)}
              />
            </div>
            {errorText("province")}
            {errorText("city_district")}
            {errorText("address_full")}
            <span className={styles.hint}>지도 연결 전이라 주소는 직접 입력합니다. 정확한 위치는 관리자가 확인합니다.</span>
          </fieldset>

          <fieldset className={styles.field} {...invalid("hours")}>
            <legend>영업시간 *</legend>
            <HoursEditor value={form.hours} onChange={(h) => update("hours", h)} error={errors.hours} />
          </fieldset>

          <fieldset className={styles.field}>
            <legend>부가 정보 (선택)</legend>
            <input
              className="input"
              aria-label="전화번호"
              placeholder="전화번호"
              {...invalid("phone")}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
            {errorText("phone")}
            <input
              className="input"
              aria-label="웹사이트"
              placeholder="웹사이트·SNS (https://…)"
              {...invalid("website_url")}
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
            />
            {errorText("website_url")}
            {tags.length > 0 && (
              <div className={styles.chips} aria-label="태그">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="chip"
                    aria-pressed={form.tag_ids.includes(t.id)}
                    onClick={() =>
                      update(
                        "tag_ids",
                        form.tag_ids.includes(t.id) ? form.tag_ids.filter((id) => id !== t.id) : [...form.tag_ids, t.id],
                      )
                    }
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            )}
            {errorText("tag_ids")}
          </fieldset>

          <label className={styles.field}>
            <span>제보 근거·메모 (선택)</span>
            <textarea
              className={`input ${styles.textarea}`}
              placeholder="예: 11월 3일 새벽 1시에 직접 방문해서 확인했어요."
              {...invalid("memo")}
              value={form.memo}
              onChange={(e) => update("memo", e.target.value)}
            />
            {errorText("memo")}
          </label>

          {!user && (
            <label className={styles.field}>
              <span>연락 이메일 (선택)</span>
              <input
                className="input"
                type="email"
                placeholder="결과 안내가 필요하면 남겨주세요"
                {...invalid("guest_email")}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
              {errorText("guest_email")}
              <span className={styles.hint}>이메일은 관리자만 볼 수 있습니다.</span>
            </label>
          )}

          <Turnstile onToken={setToken} resetKey={turnstileReset} />

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "접수 중…" : "제보 제출하기"}
          </button>
        </form>
      )}
    </div>
  );
}
