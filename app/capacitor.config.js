// 앱은 ../web 을 "배포한 주소"를 그대로 불러온다 → web 을 배포하면 앱에 즉시 최신 버전이 반영된다.
// 주소는 환경변수 ALLNIGHT_WEB_URL 로 바꿀 수 있다 (npm run sync:dev / sync:prod 참고).
const PROD_URL = "https://allnight.digitpublic12.workers.dev";
const url = process.env.ALLNIGHT_WEB_URL || PROD_URL;

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId: "com.allnight.app",
  appName: "ALLNIGHT",
  webDir: "www", // 서버 연결 실패 시 보여줄 안내 화면만 들어 있다
  server: {
    url,
    cleartext: url.startsWith("http://"), // 개발용 http 주소일 때만 허용
    allowNavigation: ["*.kakao.com", "*.kakaocdn.net", "*.supabase.co", "challenges.cloudflare.com"],
  },
  android: { allowMixedContent: false },
};
