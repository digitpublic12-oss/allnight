import type { NextConfig } from "next";

// cacheComponents·partialPrefetching(생성 도구 기본값)은 끈다.
// Cloudflare 런타임(workerd)에서 켜 두면 페이지 응답이 멈추는 문제가 확인됨 (5-2 호환성 확인, 2026-11-05).
const nextConfig: NextConfig = {};

export default nextConfig;
