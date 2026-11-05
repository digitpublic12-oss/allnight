"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchPlaceDetail, fetchTags, type TagRow } from "@/features/place/placeDetail";
import { fetchCategories, type CategoryRow } from "@/features/search/searchPlaces";
import HoursEditor from "@/features/submission/HoursEditor";
import { EMPTY_FORM, formFromPlace, type FormState } from "@/features/submission/placeForm";
import { PROVINCES, validateProposed, type FieldErrors } from "@/features/submission/validate";
import { markVerified, savePlace } from "./adminData";
import { VERIFICATION_LABEL, formatDateTime } from "./format";
import { parseCoordinates } from "./SubmissionsReview";
import styles from "./admin.module.css";

type Meta = {
  verification_status: "verified" | "needs_check" | "unverified";
  last_verified_at: string | null;
  deleted_at: string | null;
};

// 관리자 장소 등록·편집 (08_admin_place_edit.md). 저장은 관리자 함수가 하고 변경 전후를 기록한다.
// 날짜별 예외·사진은 이번 범위에서 제외.
export default function PlaceEditor({ placeId }: { placeId: string | null }) {
  const router = useRouter();
  const { showToast } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coords, setCoords] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound">(placeId ? "loading" : "ready");
  const [errors, setErrors] = useState<FieldErrors & { coords?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (!placeId) return;
    fetchPlaceDetail(placeId, "9999-12-31").then((place) => {
      if (!place) return setState("notFound");
      setForm(formFromPlace(place));
      setCoords(`${place.latitude}, ${place.longitude}`);
      setMeta({
        verification_status: place.verification_status,
        last_verified_at: place.last_verified_at,
        deleted_at: place.deleted_at,
      });
      setState("ready");
    });
  }, [placeId, reload]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBanner(null);
    const { data, errors: found } = validateProposed("new_place", { ...form, memo: undefined });
    const parsed = parseCoordinates(coords);
    const allErrors: FieldErrors & { coords?: string } = { ...found };
    if (!parsed) allErrors.coords = "좌표를 '위도, 경도' 형식으로 입력해주세요.";
    if (Object.keys(allErrors).length > 0 || !parsed || !data.hours) {
      setErrors(allErrors);
      setBanner("입력 내용을 확인해주세요.");
      return;
    }
    setSaving(true);
    try {
      const id = await savePlace(placeId, { ...data, hours: data.hours, latitude: parsed.lat, longitude: parsed.lng });
      showToast(placeId ? "저장했습니다." : "새 장소를 등록했습니다.");
      if (!placeId) router.replace(`/admin/places/${id}/edit`);
      else setReload((n) => n + 1);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function verifyNow() {
    if (!placeId) return;
    if (!window.confirm("영업정보를 지금 실제로 확인했나요? 확인일이 지금 시각으로 바뀝니다.")) return;
    try {
      await markVerified(placeId);
      showToast("확인 처리했습니다.");
      setReload((n) => n + 1);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "확인 처리하지 못했습니다.");
    }
  }

  if (state === "loading") return <p className={styles.muted}>불러오는 중…</p>;
  if (state === "notFound") {
    return (
      <div className={styles.gate}>
        <p className={styles.gateTitle}>장소를 찾을 수 없습니다</p>
        <Link href="/admin/places">장소 목록으로</Link>
      </div>
    );
  }

  const fieldError = (key: keyof typeof errors) => (errors[key] ? <span className={styles.fieldError}>{errors[key]}</span> : null);

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{placeId ? "장소 편집" : "새 장소 등록"}</h1>
        <Link href="/admin/places">← 목록</Link>
      </div>

      {banner && (
        <p className={styles.error} role="alert">
          {banner}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSave} noValidate>
        {placeId && meta && (
          <section className={styles.box} aria-label="검증 상태">
            <p>
              <strong>검증 상태:</strong> {VERIFICATION_LABEL[meta.verification_status]} · 마지막 확인{" "}
              {formatDateTime(meta.last_verified_at)}
              {meta.deleted_at && " · 숨김 상태"}
            </p>
            <p className={styles.hint}>
              단순 오탈자 수정은 확인일을 바꾸지 않습니다. 관리자가 영업시간을 새로 확인한 경우에만 아래 버튼을 누르세요.
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn" onClick={verifyNow}>
                실제로 확인함 (확인일 갱신)
              </button>
            </div>
          </section>
        )}

        <label className={styles.field}>
          <span>장소명 *</span>
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          {fieldError("name")}
        </label>

        <fieldset className={styles.field}>
          <legend>카테고리 *</legend>
          <div className={styles.chips}>
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
          {fieldError("category_id")}
        </fieldset>

        <fieldset className={styles.field}>
          <legend>위치 *</legend>
          <div className={styles.row2}>
            <select className="input" aria-label="시·도" value={form.province} onChange={(e) => update("province", e.target.value)}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              className="input"
              aria-label="시·군·구"
              placeholder="시·군·구"
              value={form.city_district}
              onChange={(e) => update("city_district", e.target.value)}
            />
          </div>
          <input
            className="input"
            aria-label="도로명 주소"
            placeholder="도로명 주소"
            value={form.address_full}
            onChange={(e) => update("address_full", e.target.value)}
          />
          <div className={styles.row2}>
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
          <input
            className="input"
            aria-label="좌표"
            placeholder="좌표: 위도, 경도 (예: 37.5573, 126.9245)"
            value={coords}
            onChange={(e) => {
              setCoords(e.target.value);
              setErrors((prev) => ({ ...prev, coords: undefined }));
            }}
          />
          {fieldError("province")}
          {fieldError("city_district")}
          {fieldError("address_full")}
          {fieldError("coords")}
          <span className={styles.hint}>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address_full)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              구글 지도에서 주소 열기
            </a>{" "}
            → 위치를 마우스 오른쪽 클릭 → 맨 위 좌표를 눌러 복사 → 좌표 칸에 붙여넣기
          </span>
        </fieldset>

        <fieldset className={styles.field}>
          <legend>요일별 영업시간 *</legend>
          <HoursEditor value={form.hours} onChange={(h) => update("hours", h)} error={errors.hours} />
        </fieldset>

        <fieldset className={styles.field}>
          <legend>부가 정보</legend>
          <div className={styles.row2}>
            <input className="input" placeholder="전화번호" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            <input
              className="input"
              placeholder="웹사이트 (https://…)"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
            />
          </div>
          {fieldError("phone")}
          {fieldError("website_url")}
          <div className={styles.chips} aria-label="태그">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip"
                aria-pressed={form.tag_ids.includes(t.id)}
                onClick={() =>
                  update("tag_ids", form.tag_ids.includes(t.id) ? form.tag_ids.filter((id) => id !== t.id) : [...form.tag_ids, t.id])
                }
              >
                #{t.name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.stickyBar}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "저장 중…" : placeId ? "저장" : "등록"}
          </button>
          <Link href="/admin/places" className="btn">
            취소
          </Link>
        </div>
      </form>
    </>
  );
}
