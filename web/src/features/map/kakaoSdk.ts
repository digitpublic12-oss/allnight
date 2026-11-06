// 카카오 지도 JavaScript SDK를 한 번만 불러온다.
// 공식 타입 패키지가 없어 이 앱이 쓰는 기능만 최소한으로 타입을 정의한다.
// 키(NEXT_PUBLIC_KAKAO_MAP_APP_KEY)는 브라우저 공개용 JavaScript 키이며,
// 실제 보호는 Kakao Developers의 [플랫폼 → Web → 사이트 도메인] 등록이 맡는다.

export type LatLng = object;

export interface LatLngBounds {
  extend(position: LatLng): void;
}

export interface KakaoMapInstance {
  setCenter(position: LatLng): void;
  setLevel(level: number): void;
  setBounds(bounds: LatLngBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  panBy(dx: number, dy: number): void;
  addControl(control: object, position: number): void;
}

export interface Marker {
  setMap(map: KakaoMapInstance | null): void;
  setZIndex(zIndex: number): void;
}

export interface CustomOverlay {
  setMap(map: KakaoMapInstance | null): void;
}

export interface KakaoMaps {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => LatLng;
  LatLngBounds: new () => LatLngBounds;
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => KakaoMapInstance;
  Marker: new (options: { position: LatLng; map?: KakaoMapInstance; title?: string; clickable?: boolean }) => Marker;
  CustomOverlay: new (options: {
    position: LatLng;
    content: HTMLElement;
    yAnchor?: number;
    zIndex?: number;
    map?: KakaoMapInstance;
  }) => CustomOverlay;
  ZoomControl: new () => object;
  ControlPosition: { BOTTOMRIGHT: number };
  event: { addListener(target: object, type: string, handler: () => void): void };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

export const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "";

let loading: Promise<KakaoMaps> | null = null;

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (loading) return loading;

  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const ready = () => {
      const maps = window.kakao?.maps;
      if (!maps) return reject(new Error("kakao.maps 없음"));
      // autoload=false 로 불러왔으므로 load()가 끝난 뒤에 지도 기능을 쓸 수 있다
      maps.load(() => resolve(maps));
    };

    if (window.kakao?.maps) return ready();

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_APP_KEY)}&autoload=false`;
    script.async = true;
    script.onload = ready;
    // 등록되지 않은 도메인·꺼진 지도 서비스면 SDK 주소가 401/403을 돌려줘 여기로 온다
    script.onerror = () => {
      script.remove();
      reject(new Error("카카오 지도 SDK 로드 실패"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // 다시 시도할 수 있게 비운다
    throw error;
  });

  return loading;
}
