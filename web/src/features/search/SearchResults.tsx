import type { CoverageStatus, PlaceResult } from "./searchPlaces";
import styles from "./SearchResults.module.css";

// 그룹 순서와 문구는 DB 정렬(full → partial → unknown → closed)과 DESIGN.md §2.1을 따른다
const GROUPS: { status: CoverageStatus; title: string; badge: string }[] = [
  { status: "full", title: "전체 영업", badge: "영업 중" },
  { status: "partial", title: "일부 영업", badge: "일부 영업" },
  { status: "unknown", title: "영업정보 미확인", badge: "⚠ 미확인" },
  { status: "closed", title: "영업하지 않음", badge: "영업 안 함" },
];

const VERIFICATION_LABEL = {
  verified: null,
  needs_check: "확인 필요",
  unverified: "미확인 정보",
} as const;

type Props =
  | { state: "loading" }
  | { state: "error"; onRetry: () => void }
  | { state: "done"; places: PlaceResult[]; onReset: () => void };

export default function SearchResults(props: Props) {
  if (props.state === "loading") {
    return (
      <div className={styles.skeleton} aria-busy="true" aria-label="검색 중">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <div className={styles.message} role="alert">
        <p className={styles.messageTitle}>장소 정보를 불러오지 못했습니다</p>
        <p className={styles.messageText}>네트워크 상태를 확인해주세요.</p>
        <button type="button" className="btn" onClick={props.onRetry}>
          다시 시도
        </button>
      </div>
    );
  }

  if (props.places.length === 0) {
    return (
      <div className={styles.message}>
        <p className={styles.messageTitle}>선택한 조건에 맞는 장소가 없습니다</p>
        <button type="button" className="btn" onClick={props.onReset}>
          필터 초기화
        </button>
      </div>
    );
  }

  return (
    <div className={styles.groups}>
      {GROUPS.map((group) => {
        const items = props.places.filter((p) => p.coverage_status === group.status);
        if (items.length === 0) return null;
        return (
          <section key={group.status} aria-label={group.title}>
            <h3 className={styles.groupTitle}>
              {group.title} <span>{items.length}</span>
            </h3>
            <ul className={styles.list}>
              {items.map((place) => {
                const verification = VERIFICATION_LABEL[place.verification_status];
                return (
                  <li key={place.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <span className={styles.name} title={place.name}>
                        {place.name}
                      </span>
                      <span className={`${styles.badge} ${styles[group.status]}`}>{group.badge}</span>
                    </div>
                    <p className={styles.meta}>
                      {place.category_name} · {place.city_district}
                      {place.neighborhood ? ` ${place.neighborhood}` : ""}
                    </p>
                    {(verification || (place.last_verified_at && place.is_older_than_30_days)) && (
                      <p className={styles.warning}>
                        {verification}
                        {verification && place.last_verified_at && place.is_older_than_30_days && " · "}
                        {place.last_verified_at && place.is_older_than_30_days && "정보 오래됨 (30일 이상 미확인)"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
