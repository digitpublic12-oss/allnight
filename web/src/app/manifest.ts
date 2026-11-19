import type { MetadataRoute } from "next";

// PWA 설치 정보. 화면·기능에는 영향을 주지 않는다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ALLNIGHT — 밤에 열려 있는 곳 찾기",
    short_name: "ALLNIGHT",
    description: "18:00부터 익일 07:00까지, 원하는 시간에 실제로 영업하는 장소를 지도에서 찾습니다.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
