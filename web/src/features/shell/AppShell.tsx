import MapPlaceholder from "@/features/map/MapPlaceholder";
import SearchPanel from "@/features/search/SearchPanel";
import TopMenu from "./TopMenu";
import styles from "./AppShell.module.css";

// `/`와 `/place/:placeId`가 같은 화면을 쓴다. 어떤 패널을 보일지는 SearchPanel이 주소를 보고 정한다.
export default function AppShell() {
  return (
    <>
      <main className={styles.shell}>
        <MapPlaceholder />
        <SearchPanel />
        <TopMenu />
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
