import type { GeolocationResult } from "../types/location";
import type { Coordinates } from "../types/location";

const USE_MOCK = import.meta.env.VITE_MOCK_MODE === "true";

// モック用: シミュレーション状態管理
let mockWatchCounter = 0;
const mockWatchTimers = new Map<number, ReturnType<typeof setInterval>>();
let mockSimulationTarget: Coordinates | null = null;
let mockCurrentLat = 0;
let mockCurrentLng = 0;

/**
 * モックモード用: シミュレーションの目的地を設定
 */
export function setMockDestination(dest: Coordinates): void {
  mockSimulationTarget = dest;
}

/**
 * ブラウザの Geolocation API で現在地を取得
 */
export function getCurrentPosition(): Promise<GeolocationResult> {
  if (USE_MOCK) {
    return Promise.resolve({
      lat: mockCurrentLat || 34.702332,
      lng: mockCurrentLng || 135.555110,
      accuracy: 10,
    });
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * 位置情報の継続的な監視
 * モックモード時: 3秒ごとに目的地へ向かって移動をシミュレート
 */
export function watchPosition(
  callback: (result: GeolocationResult) => void,
  onError?: (error: Error) => void
): number {
  if (USE_MOCK) {
    const id = ++mockWatchCounter;
    const INTERVAL_MS = 3000;
    // 1回のステップで移動する割合（全行程の約5%ずつ → 約60秒で到着）
    const STEP_RATIO = 0.05;

    const timer = setInterval(() => {
      if (!mockSimulationTarget) {
        onError?.(new Error("Mock destination not set"));
        return;
      }

      const dLat = mockSimulationTarget.lat - mockCurrentLat;
      const dLng = mockSimulationTarget.lng - mockCurrentLng;

      // 目的地に十分近ければそのまま目的地座標を返す
      if (Math.abs(dLat) < 0.0001 && Math.abs(dLng) < 0.0001) {
        mockCurrentLat = mockSimulationTarget.lat;
        mockCurrentLng = mockSimulationTarget.lng;
      } else {
        mockCurrentLat += dLat * STEP_RATIO;
        mockCurrentLng += dLng * STEP_RATIO;
      }

      console.log(
        `[Mock Geolocation] Position: ${mockCurrentLat.toFixed(6)}, ${mockCurrentLng.toFixed(6)}`
      );

      callback({
        lat: mockCurrentLat,
        lng: mockCurrentLng,
        accuracy: 10,
      });
    }, INTERVAL_MS);

    mockWatchTimers.set(id, timer);
    return id;
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser");
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      onError?.(new Error(`Geolocation error: ${error.message}`));
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

/**
 * watchPosition の監視を停止
 */
export function clearWatch(watchId: number): void {
  if (USE_MOCK) {
    const timer = mockWatchTimers.get(watchId);
    if (timer) {
      clearInterval(timer);
      mockWatchTimers.delete(watchId);
    }
    return;
  }
  navigator.geolocation.clearWatch(watchId);
}
