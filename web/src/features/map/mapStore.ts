import type { PlaceResult } from "@/features/search/searchPlaces";

// 검색 패널(목록)과 지도가 같은 장소를 보도록 잇는 작은 저장소.
// - places: 마지막으로 끝난 검색 결과 (SearchPanel이 넣는다)
// - focus: 지금 상세 화면에 열린 장소 (PlaceDetailPanel이 넣는다). 상세 주소로 바로 들어와
//          검색 결과에 없는 장소도 지도에 표시하기 위해 따로 둔다.

export type MapPlace = Pick<PlaceResult, "id" | "name" | "latitude" | "longitude">;

type MapState = { places: MapPlace[]; focus: MapPlace | null };

const EMPTY: MapState = { places: [], focus: null };
let state: MapState = EMPTY;
const listeners = new Set<() => void>();

function update(next: MapState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function setMapPlaces(places: MapPlace[]) {
  update({ ...state, places });
}

export function setMapFocus(focus: MapPlace | null) {
  if (state.focus?.id === focus?.id) return;
  update({ ...state, focus });
}

export function subscribeMap(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMapState(): MapState {
  return state;
}

export function getServerMapState(): MapState {
  return EMPTY;
}
