"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/supabase";
import styles from "./MySubmissionsPanel.module.css";

type Row = {
  id: string;
  type: "new_place" | "correction";
  status: "received" | "in_review" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  proposed_data: { name?: string };
  places: { name: string } | null;
};

const STATUS_LABEL: Record<Row["status"], string> = {
  received: "접수됨",
  in_review: "검토 중",
  approved: "반영됨",
  rejected: "반려됨",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

// 회원 본인 제보의 처리 상태·반려 사유 (PRD 최종 확정 Q5). RLS가 본인 것만 돌려준다.
export default function MySubmissionsPanel({ onBack }: { onBack: () => void }) {
  const { user, ready, openAuth } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    db.from("submissions")
      .select("id, type, status, created_at, rejection_reason, proposed_data, places:place_id(name)")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setFailed(true);
        else setRows(data as unknown as Row[]);
      });
  }, [user]);

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <button type="button" className={`btn ${styles.back}`} onClick={onBack}>
          ← 뒤로
        </button>
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>내 제보</h2>

        {ready && !user && (
          <div className={styles.state}>
            <p>로그인하면 내가 보낸 제보의 처리 상태를 볼 수 있습니다.</p>
            <button type="button" className="btn btn-primary" onClick={() => openAuth()}>
              로그인
            </button>
          </div>
        )}
        {user && failed && <p className={styles.state}>제보 목록을 불러오지 못했습니다.</p>}
        {user && !failed && rows === null && <p className={styles.state}>불러오는 중…</p>}
        {user && rows?.length === 0 && <p className={styles.state}>아직 보낸 제보가 없습니다.</p>}

        {user && rows && rows.length > 0 && (
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.name}>
                    {row.type === "correction" ? row.places?.name ?? "삭제된 장소" : row.proposed_data.name}
                  </span>
                  <span className={`${styles.badge} ${styles[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                </div>
                <p className={styles.meta}>
                  {row.type === "correction" ? "정보 수정 제보" : "신규 장소 제보"} · {formatDate(row.created_at)}
                </p>
                {row.status === "rejected" && row.rejection_reason && (
                  <p className={styles.reason}>반려 사유: {row.rejection_reason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
