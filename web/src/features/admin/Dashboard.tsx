"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDashboardCounts, fetchSubmissions, type DashboardCounts, type SubmissionRow } from "./adminData";
import { formatDateTime } from "./format";
import styles from "./admin.module.css";

// 운영 현황 (06_admin_dashboard.md §2.2~2.4)
export default function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [recent, setRecent] = useState<SubmissionRow[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([fetchDashboardCounts(), fetchSubmissions("new_place", 5), fetchSubmissions("correction", 5)])
      .then(([c, news, corrections]) => {
        setCounts(c);
        setRecent([...news, ...corrections].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, 5));
      })
      .catch(() => setFailed(true));
  }, []);

  const cards = counts && [
    { label: "신규 장소 제보 대기", value: counts.pendingNew, href: "/admin/submissions?tab=new_place", warn: counts.pendingNew > 0 },
    { label: "정보 수정 제보 대기", value: counts.pendingCorrection, href: "/admin/submissions?tab=correction", warn: counts.pendingCorrection > 0 },
    { label: "공개 장소", value: counts.places, href: "/admin/places" },
    { label: "확인됨", value: counts.verified, href: "/admin/places" },
    { label: "정보 오래됨 (30일+)", value: counts.stale, href: "/admin/places", warn: counts.stale > 0 },
    { label: "숨긴 장소", value: counts.hidden, href: "/admin/places" },
  ];

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>대시보드</h1>
        <Link href="/admin/places/new" className="btn btn-primary">
          새 장소 등록
        </Link>
      </div>

      {failed && <p className={styles.error}>통계를 불러오지 못했습니다. 새로고침해 주세요.</p>}
      {!failed && !cards && <p className={styles.muted}>불러오는 중…</p>}

      {cards && (
        <div className={styles.cards}>
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className={`${styles.card} ${card.warn ? styles.cardWarn : ""}`}>
              <span className={styles.muted}>{card.label}</span>
              <span className={styles.cardValue}>{card.value}</span>
            </Link>
          ))}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>먼저 처리할 제보</h2>
        {recent.length === 0 ? (
          <p className={styles.muted}>대기 중인 제보가 없습니다.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>종류</th>
                  <th>장소</th>
                  <th>제보자</th>
                  <th>접수</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/submissions?tab=${s.type}`}>{s.type === "new_place" ? "신규" : "수정"}</Link>
                    </td>
                    <td>{s.type === "new_place" ? s.proposed_data.name : s.places?.name}</td>
                    <td>{s.submitter?.nickname ?? "비회원"}</td>
                    <td className={styles.num}>{formatDateTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
