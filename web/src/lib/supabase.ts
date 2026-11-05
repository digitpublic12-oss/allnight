import { createClient } from "@supabase/supabase-js";

// 공개용 주소와 publishable 키만 쓴다. 데이터 보호는 Supabase RLS(읽기 전용)가 맡는다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase 설정이 없습니다. web/.env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 넣어주세요.",
  );
}

// 로그인 기능이 없으므로 세션을 저장하지 않는다.
export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
