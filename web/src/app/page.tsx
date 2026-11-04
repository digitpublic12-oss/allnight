import MapPlaceholder from "@/features/map/MapPlaceholder";
import SearchPanel from "@/features/search/SearchPanel";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <main className={styles.shell}>
        <MapPlaceholder />
        <SearchPanel />
      </main>
      <div className={styles.unsupported} role="alert">
        <p>
          ALLNIGHT는 1024px 이상의 데스크톱 환경에 최적화되어 있습니다.
          <br />더 넓은 화면에서 이용해주세요.
        </p>
      </div>
    </>
  );
}
