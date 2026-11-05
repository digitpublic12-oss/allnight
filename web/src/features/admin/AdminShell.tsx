"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import styles from "./admin.module.css";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/submissions", label: "제보 승인" },
  { href: "/admin/places", label: "장소 관리" },
];

// 관리자 공통 셸 (06_admin_dashboard.md §2.1, DESIGN.md §11): 지도 없이 왼쪽 메뉴 + 표 중심.
// 화면에서 막는 것은 안내용일 뿐이고, 실제 권한은 DB(RLS·관리자 함수)가 확인한다.
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, ready, openAuth, signOut } = useAuth();

  if (!ready || (user && !profile)) {
    return <p className={styles.gate}>확인 중…</p>;
  }

  if (!user) {
    return (
      <div className={styles.gate}>
        <p className={styles.gateTitle}>관리자 로그인이 필요합니다</p>
        <button type="button" className="btn btn-primary" onClick={() => openAuth()}>
          로그인
        </button>
        <Link href="/">사이트로 돌아가기</Link>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className={styles.gate} role="alert">
        <p className={styles.gateTitle}>접근 권한이 없습니다</p>
        <p className={styles.muted}>관리자 계정으로 로그인해야 볼 수 있는 화면입니다.</p>
        <Link href="/">사이트로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>🌙 ALLNIGHT 관리자</p>
        <nav aria-label="관리자 메뉴">
          <ul>
            {NAV.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={active ? styles.navActive : undefined} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.sidebarFoot}>
          <p className={styles.muted}>{profile.nickname}</p>
          <Link href="/">사이트 보기</Link>
          <button type="button" className={styles.linkButton} onClick={() => signOut()}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
