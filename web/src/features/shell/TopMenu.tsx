"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import styles from "./TopMenu.module.css";

// 지도 위 우측 상단 플로팅 메뉴 (SITEMAP.md §1). 관리자 메뉴는 일반 화면에 노출하지 않는다.
export default function TopMenu() {
  const { user, profile, ready, openAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  // 첫 세션 확인 전에는 아무것도 그리지 않는다(로그인 버튼이 잠깐 깜빡이는 것 방지)
  if (!ready) return <nav className={styles.menu} aria-label="사용자 메뉴" />;

  return (
    <nav className={styles.menu} aria-label="사용자 메뉴">
      {user ? (
        <div className={styles.account} ref={menuRef}>
          <button
            type="button"
            className={`btn ${styles.float}`}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((v) => !v)}
          >
            {profile?.nickname ?? "내 계정"} ▾
          </button>
          {open && (
            <div className={styles.dropdown} role="menu">
              <p className={styles.email}>{user.email}</p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className={`btn ${styles.float}`} onClick={() => openAuth()}>
          로그인
        </button>
      )}
    </nav>
  );
}
