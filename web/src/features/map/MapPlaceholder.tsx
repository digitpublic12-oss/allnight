import styles from "./MapPlaceholder.module.css";

// 네이버 지도 연결 전 임시 지도 영역. 5-6단계에서 실제 지도 컴포넌트로 교체한다.
export default function MapPlaceholder() {
  return (
    <div className={styles.map} role="img" aria-label="지도 영역 (네이버 지도 연결 전)">
      <button type="button" className={`btn ${styles.areaSearch}`} disabled>
        이 지역 검색
      </button>
      <p className={styles.notice}>지도 영역 · 네이버 지도 연결 예정</p>
    </div>
  );
}
