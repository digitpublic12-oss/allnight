"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navigate } from "@/features/shell/navigation";
import {
  KAKAO_MAP_APP_KEY,
  loadKakaoMaps,
  type CustomOverlay,
  type KakaoMapInstance,
  type KakaoMaps,
  type Marker,
} from "./kakaoSdk";
import { getMapState, getServerMapState, subscribeMap, type MapPlace } from "./mapStore";
import styles from "./KakaoMap.module.css";

// 지도는 전체 viewport 배경이고 왼쪽 400px 패널이 위에 겹친다 (DESIGN.md §4).
// 핀이 패널 아래에 숨지 않도록 왼쪽 여백을 패널 너비 + 여유만큼 둔다.
const PANEL_COVER_PX = 400 + 32;
const FIT_PADDING = { top: 72, right: 72, bottom: 72, left: PANEL_COVER_PX + 48 };
const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const DEFAULT_LEVEL = 8;
const FOCUS_LEVEL = 4;

type Status = "loading" | "ready" | "error" | "noKey";

// /place/:id 또는 /place/:id/correct 에서 장소 ID를 읽는다
function selectedIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/place\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<KakaoMaps | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const labelRef = useRef<CustomOverlay | null>(null);
  const extraMarkerRef = useRef<Marker | null>(null);

  const [status, setStatus] = useState<Status>(KAKAO_MAP_APP_KEY ? "loading" : "noKey");
  const [attempt, setAttempt] = useState(0);
  const { places, focus } = useSyncExternalStore(subscribeMap, getMapState, getServerMapState);
  const selectedId = selectedIdFromPath(usePathname());

  // 1) SDK를 불러와 지도를 한 번 만든다
  useEffect(() => {
    if (!KAKAO_MAP_APP_KEY || mapRef.current) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng),
          level: DEFAULT_LEVEL,
        });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        sdkRef.current = maps;
        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // 2) 검색 결과가 바뀌면 핀을 다시 그리고, 결과가 모두 보이게 지도 범위를 맞춘다.
  //    (지도만 움직였을 때 자동 재검색은 하지 않는다 — DESIGN.md §4)
  useEffect(() => {
    const maps = sdkRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !maps || !map) return;

    const markers = markersRef.current;
    markers.forEach((marker) => marker.setMap(null));
    markers.clear();

    const withCoords = places.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (withCoords.length === 0) return;

    const bounds = new maps.LatLngBounds();
    for (const place of withCoords) {
      const position = new maps.LatLng(place.latitude, place.longitude);
      const marker = new maps.Marker({ position, map, title: place.name, clickable: true });
      maps.event.addListener(marker, "click", () => navigate(`/place/${place.id}`));
      markers.set(place.id, marker);
      bounds.extend(position);
    }

    // 상세 화면을 보는 중이면 그 장소에 맞춘 위치를 유지한다
    if (selectedIdFromPath(window.location.pathname)) return;
    if (withCoords.length === 1) {
      map.setLevel(FOCUS_LEVEL);
      centerBesidePanel(maps, map, withCoords[0]);
    } else {
      const { top, right, bottom, left } = FIT_PADDING;
      map.setBounds(bounds, top, right, bottom, left);
    }
  }, [status, places]);

  // 3) 상세 화면에 열린 장소를 강조하고 지도 가운데로 옮긴다
  useEffect(() => {
    const maps = sdkRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !maps || !map) return;

    labelRef.current?.setMap(null);
    labelRef.current = null;
    extraMarkerRef.current?.setMap(null);
    extraMarkerRef.current = null;
    markersRef.current.forEach((marker) => marker.setZIndex(0));

    if (!selectedId) return;
    const place =
      (focus?.id === selectedId ? focus : null) ?? places.find((p) => p.id === selectedId) ?? null;
    if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return;

    const position = new maps.LatLng(place.latitude, place.longitude);
    const marker = markersRef.current.get(place.id);
    if (marker) {
      marker.setZIndex(10);
    } else {
      // 상세 주소로 바로 들어와 검색 결과에 없는 장소
      extraMarkerRef.current = new maps.Marker({ position, map, title: place.name });
    }

    const label = document.createElement("div");
    label.className = styles.label;
    label.textContent = place.name; // textContent라 장소명에 HTML이 섞여도 안전
    labelRef.current = new maps.CustomOverlay({ position, content: label, yAnchor: 2.6, zIndex: 20, map });

    map.setLevel(FOCUS_LEVEL);
    centerBesidePanel(maps, map, place);
  }, [status, selectedId, focus, places]);

  return (
    <div className={styles.map}>
      <div ref={containerRef} className={styles.canvas} aria-label="장소 지도" role="region" />

      {status === "ready" && (
        <button
          type="button"
          className={`btn ${styles.areaSearch}`}
          disabled
          title="지도 영역 기준 검색은 아직 준비 중입니다"
        >
          이 지역 검색
        </button>
      )}

      {status !== "ready" && (
        <div className={styles.notice} role={status === "error" ? "alert" : undefined}>
          {status === "loading" && <p>지도를 불러오는 중…</p>}
          {status === "noKey" && <p>지도 키가 설정되지 않았습니다 (NEXT_PUBLIC_KAKAO_MAP_APP_KEY)</p>}
          {status === "error" && (
            <>
              <p>지도를 불러오지 못했습니다.</p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((n) => n + 1);
                }}
              >
                다시 시도
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 장소를 화면 정가운데가 아니라 "패널을 뺀 보이는 영역"의 가운데에 둔다
function centerBesidePanel(maps: KakaoMaps, map: KakaoMapInstance, place: MapPlace) {
  map.setCenter(new maps.LatLng(place.latitude, place.longitude));
  map.panBy(-PANEL_COVER_PX / 2, 0);
}
