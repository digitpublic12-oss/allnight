# ALLNIGHT Android 앱 (`app/`)

Capacitor 로 만든 Android 프로젝트. 화면·기능은 `../web` 을 **배포한 주소**를 그대로 불러온다.
(지도, 로그인, 제보, 관리자 등 web 기능이 코드 복사 없이 동일하게 동작)

```
allnight-app/
├─ web/   Next.js 웹 (Cloudflare 배포) — 기능 개발은 여기서만
├─ app/   Android 앱 (이 폴더) — web 을 감싸는 껍데기
└─ supabase/  공용 DB (web·app 공통)
```

## 규칙
- 기능 수정은 `web/` 에서 하고 web 을 배포하면 앱에도 바로 반영된다 (앱 재빌드 불필요).
- 앱 재빌드가 필요한 경우: 앱 이름·아이콘·패키지명·불러오는 주소(`capacitor.config.js`)·네이티브 플러그인 변경.

## APK 만들기
1. Android Studio 설치 (JDK, Android SDK 포함)
2. `cd app && npm install`
3. `npx cap sync android` → `npx cap open android` (Android Studio 가 열림)
4. Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
   (스토어 배포용은 서명된 AAB: Build → Generate Signed Bundle / APK)

## web 최신 버전 사용
- **운영(기본)**: 앱은 배포 주소를 불러오므로 `cd web && npm run deploy` 만 하면 앱을 켤 때마다 최신 web 이 보인다. 앱 재빌드·재설치 불필요.
- **배포 전 테스트**: web 을 `npm run dev -- -H 0.0.0.0` 으로 켜고 `cd app && npm run sync:dev` → 에뮬레이터가 PC 의 `http://10.0.2.2:3000` 을 불러온다. 끝나면 `npm run sync:prod` 로 되돌린 뒤 APK 를 빌드한다.
- ⚠ APK 는 반드시 `sync:prod` 상태에서 빌드한다 (dev 주소가 들어가면 다른 사람 폰에서 안 열림).

## 설정
- 주소: `capacitor.config.js` 의 `PROD_URL` (지금: `https://allnight.digitpublic12.workers.dev`). 바꾼 뒤 `npx cap sync android`.
- 패키지명: `com.allnight.app` (스토어 등록 전에 확정. 바꾸면 `android/` 도 다시 맞춰야 함)
- 카카오 지도 키는 도메인 제한이 있으니 Kakao Developers 의 허용 도메인에 위 배포 주소가 등록돼 있어야 한다.
- `.keystore`, `.jks`, `local.properties` 는 Git 에 올리지 않는다 (`.gitignore` 처리됨).

## 주의
- 인터넷 연결이 필요하다. 연결 실패 시 `www/index.html` 안내 화면이 뜬다.
- 순수 WebView 앱은 Play 스토어 심사에서 거절될 수 있다. 필요하면 푸시 알림·위치 등 네이티브 기능을 추가한다.
