"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { db } from "@/lib/supabase";
import styles from "./AuthModal.module.css";

type Tab = "login" | "signup";

type Props = {
  onClose: () => void;
  onSuccess: (message: string) => void;
};

// Supabase 오류를 05_auth_modal.md §4의 안내 문구로 바꾼다
function toMessage(error: AuthError, tab: Tab): string {
  switch (error.code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "user_already_exists":
    case "email_exists":
      return "이미 사용 중인 이메일 주소입니다.";
    case "weak_password":
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    case "email_not_confirmed":
      return "이메일 인증이 완료되지 않은 계정입니다.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    default:
      return tab === "login" ? "로그인하지 못했습니다. 잠시 후 다시 시도해주세요." : "가입하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 모달로 열면 바깥 화면은 키보드·마우스가 닿지 않는다(포커스 트랩). 닫히면 열었던 버튼으로 포커스를 돌린다.
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
    return () => opener?.focus();
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setPassword("");
    setPasswordConfirm("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === "signup") {
      if (password.length < 6) return setError("비밀번호는 최소 6자 이상이어야 합니다.");
      if (password !== passwordConfirm) return setError("비밀번호가 일치하지 않습니다.");
    }

    setSubmitting(true);
    const { error: authError } =
      tab === "login"
        ? await db.auth.signInWithPassword({ email, password })
        : await db.auth.signUp({ email, password });
    setSubmitting(false);

    if (authError) {
      setError(toMessage(authError, tab));
      if (tab === "login") {
        setPassword("");
        passwordRef.current?.focus();
      }
      return;
    }
    onSuccess(tab === "login" ? "로그인되었습니다." : "회원가입이 완료되었습니다.");
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="auth-title"
      // ESC
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 어두운 배경을 누르면 닫힌다 (대화상자 바깥 = dialog 요소 자체를 누른 경우)
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.box}>
        <div className={styles.head}>
          <h2 id="auth-title" className="visually-hidden">
            {tab === "login" ? "로그인" : "회원가입"}
          </h2>
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === "login"} onClick={() => switchTab("login")}>
              로그인
            </button>
            <button type="button" role="tab" aria-selected={tab === "signup"} onClick={() => switchTab("signup")}>
              회원가입
            </button>
          </div>
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>이메일 주소</span>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>비밀번호</span>
            <input
              ref={passwordRef}
              className="input"
              type="password"
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              placeholder={tab === "login" ? "비밀번호 입력" : "6자 이상"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {tab === "signup" && (
            <>
              <label className={styles.field}>
                <span>비밀번호 확인</span>
                <input
                  className="input"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </label>
              <p className={styles.hint}>가입 시 시스템에서 랜덤 닉네임(예: 새벽고양이482)이 자동으로 부여됩니다.</p>
            </>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "처리 중…" : tab === "login" ? "로그인" : "회원가입 완료"}
          </button>
        </form>

        {tab === "login" && (
          <p className={styles.switch}>
            계정이 없으신가요?{" "}
            <button type="button" onClick={() => switchTab("signup")}>
              회원가입
            </button>
          </p>
        )}
      </div>
    </dialog>
  );
}
