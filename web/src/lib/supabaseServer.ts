import { createClient } from "@supabase/supabase-js";

// ⚠ 서버(API 라우트) 전용. 이 파일을 화면 컴포넌트에서 import 하지 않는다.
// SUPABASE_SECRET_KEY는 RLS를 무시하는 마스터키라, 입력 검사와 Turnstile 확인을 통과한 요청에만 쓴다.
// 값은 요청 시점에 읽는다 (Cloudflare에서는 실행 환경 변수로 주입됨).
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("서버 설정(SUPABASE_SECRET_KEY)이 없습니다.");
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
