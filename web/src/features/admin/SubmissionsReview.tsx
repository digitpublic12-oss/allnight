"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchPlaceDetail, fetchTags, type PlaceDetail, type TagRow } from "@/features/place/placeDetail";
import { fetchCategories, type CategoryRow } from "@/features/search/searchPlaces";
import type { HoursInput, ProposedData } from "@/features/submission/validate";
import { approveSubmission, fetchSubmissions, rejectSubmission, type SubmissionRow } from "./adminData";
import { SUBMISSION_STATUS_LABEL, formatDateTime, formatHours } from "./format";
import styles from "./admin.module.css";

type Tab = "new_place" | "correction" | "done";
const TABS: { id: Tab; label: string }[] = [
  { id: "new_place", label: "신규 장소" },
  { id: "correction", label: "정보 수정" },
  { id: "done", label: "처리 완료" },
];

const FIELD_LABEL: Record<string, string> = {
  name: "장소명",
  category_id: "카테고리",
  address_full: "주소",
  address_detail: "상세 주소",
  province: "시·도",
  city_district: "시·군·구",
  neighborhood: "읍·면·동",
  phone: "전화번호",
  website_url: "웹사이트",
  tag_ids: "태그",
  hours: "영업시간",
};

/** "37.5573, 126.9245" 처럼 붙여넣은 좌표를 읽는다 */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const nums = text.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const lat = Number(nums[0]);
  const lng = Number(nums[1]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// 현재 장소 값을 제보 데이터와 같은 모양으로 만든다 (비교용)
function currentAsProposed(place: PlaceDetail): ProposedData {
  const hours: HoursInput = {};
  for (let wd = 1; wd <= 7; wd++) hours[String(wd)] = { status: "unknown", intervals: [] };
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
    address_detail: place.address_detail,
    province: place.province,
    city_district: place.city_district,
    neighborhood: place.neighborhood,
    phone: place.phone,
    website_url: place.website_url,
    tag_ids: place.place_tags.map((t) => t.tag_id),
    hours,
  };
}

export default function SubmissionsReview() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "new_place") as Tab;
  const { showToast } = useAuth();

  const [rows, setRows] = useState<SubmissionRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSubmissions(tab)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setFailed(false);
        }
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [tab, reload]);

  const describe = useCallback(
    (key: string, value: unknown): string => {
      if (value === null || value === undefined || value === "") return "(없음)";
      if (key === "category_id") return categories.find((c) => c.id === value)?.name ?? String(value);
      if (key === "tag_ids") {
        const names = (value as string[]).map((id) => tags.find((t) => t.id === id)?.name ?? "?");
        return names.length ? names.map((n) => `#${n}`).join(" ") : "(없음)";
      }
      if (key === "hours") return formatHours(value as HoursInput).join("\n");
      return String(value);
    },
    [categories, tags],
  );

  const selected = useMemo(() => rows?.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  function changeTab(next: Tab) {
    setSelectedId(null);
    setRows(null);
    router.replace(`/admin/submissions?tab=${next}`);
  }

  function afterAction(message: string) {
    showToast(message);
    setSelectedId(null);
    setReload((n) => n + 1);
  }

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>제보 승인</h1>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => changeTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {failed && <p className={styles.error}>제보 목록을 불러오지 못했습니다.</p>}

      <div className={selected ? styles.split : undefined}>
        <div className={styles.tableWrap}>
          {rows === null && !failed && <p className={styles.empty}>불러오는 중…</p>}
          {rows?.length === 0 && <p className={styles.empty}>{tab === "done" ? "처리한 제보가 없습니다." : "대기 중인 제보가 없습니다."}</p>}
          {rows && rows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>장소</th>
                  {tab === "done" && <th>종류</th>}
                  <th>제보자</th>
                  <th>{tab === "done" ? "처리" : "접수"}</th>
                  {tab === "done" && <th>결과</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`${styles.clickable} ${r.id === selectedId ? styles.selected : ""}`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td>
                      <button type="button" className={styles.linkButton} onClick={() => setSelectedId(r.id)}>
                        {r.type === "new_place" ? r.proposed_data.name : r.places?.name ?? "삭제된 장소"}
                      </button>
                    </td>
                    {tab === "done" && <td>{r.type === "new_place" ? "신규" : "수정"}</td>}
                    <td>{r.submitter?.nickname ?? "비회원"}</td>
                    <td className={styles.num}>{formatDateTime(tab === "done" ? r.reviewed_at : r.created_at)}</td>
                    {tab === "done" && (
                      <td>
                        <span className={`${styles.pill} ${r.status === "approved" ? styles.pillOk : styles.pillWarn}`}>
                          {SUBMISSION_STATUS_LABEL[r.status]}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <ReviewDetail
            key={selected.id}
            row={selected}
            describe={describe}
            onClose={() => setSelectedId(null)}
            onDone={afterAction}
          />
        )}
      </div>
    </>
  );
}

type DetailProps = {
  row: SubmissionRow;
  describe: (key: string, value: unknown) => string;
  onClose: () => void;
  onDone: (message: string) => void;
};

function ReviewDetail({ row, describe, onClose, onDone }: DetailProps) {
  const [current, setCurrent] = useState<ProposedData | null>(null);
  const [coords, setCoords] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = row.status === "received" || row.status === "in_review";
  const data = row.proposed_data;
  const changedKeys = Object.keys(data).filter((k) => k !== "memo");

  useEffect(() => {
    if (row.type !== "correction" || !row.place_id) return;
    fetchPlaceDetail(row.place_id, "9999-12-31").then((place) => place && setCurrent(currentAsProposed(place)));
  }, [row.type, row.place_id]);

  async function approve() {
    setError(null);
    let lat: number | undefined;
    let lng: number | undefined;
    if (row.type === "new_place") {
      const parsed = parseCoordinates(coords);
      if (!parsed) return setError("좌표를 '위도, 경도' 형식으로 입력해주세요. 예: 37.5573, 126.9245");
      lat = parsed.lat;
      lng = parsed.lng;
    }
    setBusy(true);
    try {
      await approveSubmission(row.id, lat, lng);
      onDone(row.type === "new_place" ? "승인했습니다. 새 장소가 공개되었습니다." : "승인했습니다. 장소 정보에 반영되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setError(null);
    if (!reason.trim()) return setError("반려 사유를 입력해주세요.");
    setBusy(true);
    try {
      await rejectSubmission(row.id, reason);
      onDone("반려했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "반려하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const mapSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address_full ?? "")}`;

  return (
    <aside className={styles.detail} aria-label="제보 검토">
      <div className={styles.pageHead}>
        <h2 className={styles.detailTitle}>
          {row.type === "new_place" ? "신규 장소 제보" : `정보 수정 제보 · ${row.places?.name ?? ""}`}
        </h2>
        <button type="button" className={styles.linkButton} onClick={onClose}>
          닫기
        </button>
      </div>

      <dl className={styles.kv}>
        <dt>제보자</dt>
        <dd>{row.submitter?.nickname ?? "비회원"}</dd>
        {row.guest_email && (
          <>
            <dt>연락 이메일</dt>
            <dd>{row.guest_email}</dd>
          </>
        )}
        <dt>접수</dt>
        <dd>{formatDateTime(row.created_at)}</dd>
        {!pending && (
          <>
            <dt>결과</dt>
            <dd>
              {SUBMISSION_STATUS_LABEL[row.status]} · {formatDateTime(row.reviewed_at)}
              {row.rejection_reason ? `\n사유: ${row.rejection_reason}` : ""}
            </dd>
          </>
        )}
        {data.memo && (
          <>
            <dt>제보 메모</dt>
            <dd>{data.memo}</dd>
          </>
        )}
      </dl>

      {row.type === "new_place" ? (
        <dl className={styles.kv}>
          {Object.keys(FIELD_LABEL)
            .filter((k) => k in data)
            .map((k) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{FIELD_LABEL[k]}</dt>
                <dd>{describe(k, data[k as keyof ProposedData])}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <table className={`${styles.table} ${styles.diff}`}>
          <thead>
            <tr>
              <th>항목</th>
              <th>지금</th>
              <th>바꾸자는 값</th>
            </tr>
          </thead>
          <tbody>
            {changedKeys.map((k) => (
              <tr key={k}>
                <td>{FIELD_LABEL[k] ?? k}</td>
                <td>{current ? describe(k, current[k as keyof ProposedData]) : "…"}</td>
                <td>{describe(k, data[k as keyof ProposedData])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {pending && !rejecting && (
        <div className={styles.box}>
          {row.type === "new_place" && (
            <label className={styles.field}>
              <span>좌표 (위도, 경도) *</span>
              <input
                className="input"
                placeholder="예: 37.5573, 126.9245"
                value={coords}
                onChange={(e) => setCoords(e.target.value)}
              />
              <span className={styles.hint}>
                <a href={mapSearch} target="_blank" rel="noopener noreferrer">
                  구글 지도에서 주소 열기
                </a>{" "}
                → 장소 위치를 마우스 오른쪽 클릭 → 맨 위 숫자(좌표)를 누르면 복사됩니다. 여기에 붙여넣으세요.
              </span>
            </label>
          )}
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={approve}>
              승인
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setRejecting(true)}>
              반려
            </button>
          </div>
        </div>
      )}

      {pending && rejecting && (
        <div className={styles.box}>
          <label className={styles.field}>
            <span>반려 사유 * (제보자가 볼 수 있습니다)</span>
            <textarea
              className={`input ${styles.textarea}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 확인해 보니 이미 폐업한 장소입니다."
            />
          </label>
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={reject}>
              반려 확정
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setRejecting(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
