"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { db } from "@/lib/supabase";
import AuthModal from "./AuthModal";
import styles from "./Toast.module.css";

export type Profile = { nickname: string; role: "member" | "admin" };

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  /** 첫 세션 확인이 끝났는지. 끝나기 전에는 로그인 여부로 화면을 나누지 않는다. */
  ready: boolean;
  /** 로그인 창을 연다. 로그인에 성공하면 onSuccess로 원래 하려던 작업을 이어간다 (05_auth_modal.md §2.3). */
  openAuth: (onSuccess?: () => void) => void;
  signOut: () => Promise<void>;
  showToast: (message: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await db.from("profiles").select("nickname, role").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const afterLogin = useRef<(() => void) | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // 로그인·로그아웃·토큰 갱신을 모두 이 한 곳에서 받아 화면 상태를 맞춘다
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setReady(true);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      // 콜백 안에서 바로 DB를 부르면 Supabase 내부 잠금과 겹칠 수 있어 다음 차례로 미룬다
      setTimeout(() => {
        loadProfile(nextUser.id).then(setProfile);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const openAuth = useCallback((onSuccess?: () => void) => {
    afterLogin.current = onSuccess;
    setModalOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    await db.auth.signOut();
    showToast("로그아웃되었습니다.");
  }, [showToast]);

  function handleAuthSuccess(message: string) {
    setModalOpen(false);
    showToast(message);
    const next = afterLogin.current;
    afterLogin.current = undefined;
    next?.();
  }

  return (
    <AuthContext.Provider value={{ user, profile, ready, openAuth, signOut, showToast }}>
      {children}
      {modalOpen && (
        <AuthModal
          onClose={() => {
            afterLogin.current = undefined;
            setModalOpen(false);
          }}
          onSuccess={handleAuthSuccess}
        />
      )}
      {/* 비차단 알림은 화면 우측 하단 (DESIGN.md §9) */}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && <p className={styles.toast}>{toast}</p>}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있습니다.");
  return value;
}
