"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { fetchAdminPlaces, markVerified, setPlaceHidden, type AdminPlaceRow } from "./adminData";
import { VERIFICATION_LABEL, formatDateTime, isOlderThan30Days } from "./format";
import styles from "./admin.module.css";

// 장소 관리 목록 (07_admin_places.md) — 숨긴 장소 포함 보기, 실확인, 숨기기·되살리기
export default function PlacesTable() {
  const { showToast } = useAuth();
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [rows, setRows] = useState<AdminPlaceRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminPlaces(submitted, includeHidden)
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
  }, [submitted, includeHidden, reload]);

  async function run(id: string, action: () => Promise<void>, message: string) {
    setBusyId(id);
    try {
      await action();
      showToast(message);
      setReload((n) => n + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  function verify(row: AdminPlaceRow) {
    // 확인일은 실제로 영업정보를 확인했을 때만 갱신한다 (DB.md §3.11)
    if (!window.confirm(`'${row.name}'의 영업정보를 지금 실제로 확인했나요?\n확인일이 지금 시각으로 바뀝니다.`)) return;
    run(row.id, () => markVerified(row.id), "확인 처리했습니다.");
  }

  function toggleHidden(row: AdminPlaceRow) {
    const hide = !row.deleted_at;
    if (hide && !window.confirm(`'${row.name}'을(를) 숨길까요? 사이트 검색에서 보이지 않게 됩니다. (나중에 되살릴 수 있음)`)) return;
    run(row.id, () => setPlaceHidden(row.id, hide), hide ? "숨겼습니다." : "되살렸습니다.");
  }

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>장소 관리</h1>
        <Link href="/admin/places/new" className="btn btn-primary">
          새 장소 등록
        </Link>
      </div>

      <form
        className={styles.toolbar}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(search);
        }}
      >
        <input
          className="input"
          type="search"
          placeholder="장소명·주소 검색 (Enter)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value === "") setSubmitted("");
          }}
        />
        <label className={styles.check}>
          <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
          숨긴 장소 포함
        </label>
      </form>

      {failed && <p className={styles.error}>장소 목록을 불러오지 못했습니다.</p>}

      <div className={styles.tableWrap}>
        {rows === null && !failed && <p className={styles.empty}>불러오는 중…</p>}
        {rows?.length === 0 && <p className={styles.empty}>조건에 맞는 장소가 없습니다.</p>}
        {rows && rows.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>장소명</th>
                <th>카테고리</th>
                <th>지역</th>
                <th>검증</th>
                <th>마지막 확인</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stale = isOlderThan30Days(row.last_verified_at);
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/places/${row.id}/edit`}>{row.name}</Link>
                      {row.deleted_at && <span className={`${styles.pill} ${styles.pillMuted}`}> 숨김</span>}
                    </td>
                    <td>{row.categories?.name}</td>
                    <td>
                      {row.province} {row.city_district}
                    </td>
                    <td>
                      <span className={`${styles.pill} ${row.verification_status === "verified" ? styles.pillOk : styles.pillWarn}`}>
                        {VERIFICATION_LABEL[row.verification_status]}
                      </span>
                    </td>
                    <td className={styles.num}>
                      {formatDateTime(row.last_verified_at)}
                      {stale && <span className={`${styles.pill} ${styles.pillWarn}`}> 오래됨</span>}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/places/${row.id}/edit`} className="btn">
                          편집
                        </Link>
                        <button type="button" className="btn" disabled={busyId === row.id} onClick={() => verify(row)}>
                          실제로 확인함
                        </button>
                        <button type="button" className="btn" disabled={busyId === row.id} onClick={() => toggleHidden(row)}>
                          {row.deleted_at ? "되살리기" : "숨기기"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
