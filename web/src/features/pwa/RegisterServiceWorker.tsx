"use client";

import { useEffect } from "react";

// 서비스 워커를 등록한다. 개발 중(next dev)에는 캐시 혼선을 막기 위해 등록하지 않는다.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // 등록 실패는 서비스 이용에 영향이 없으므로 조용히 무시한다.
    });
  }, []);
  return null;
}
