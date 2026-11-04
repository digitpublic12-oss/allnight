// 표준 카테고리 8개 (docs/PRD.md §5.4, docs/SITEMAP.md §4).
// 실제 식별자는 DB의 categories 테이블이 단일 기준이며, DB 연결 후 이 목록은 DB 조회로 대체한다.
export const CATEGORIES = [
  "음식·카페",
  "쇼핑·생활",
  "학습·업무",
  "의료·응급",
  "여가·문화",
  "운동·건강",
  "교통·이동",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];
