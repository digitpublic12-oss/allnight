// 패널 전환은 페이지 이동 없이 주소만 바꾼다 (SITEMAP.md §1, §3). SearchPanel이 주소를 보고 패널을 고른다.
// 앱 안에서 몇 번 이동했는지 세어 두었다가, [뒤로]가 사이트 밖으로 나가지 않게 한다.

let depth = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    depth = Math.max(0, depth - 1);
  });
}

export function navigate(path: string) {
  depth += 1;
  window.history.pushState(null, "", path);
}

export function goBack(fallback = "/") {
  if (depth > 0) {
    window.history.back();
  } else {
    // 상세·제보 주소로 바로 들어온 경우엔 돌아갈 기록이 없으므로 주소만 바꾼다
    window.history.replaceState(null, "", fallback);
  }
}
