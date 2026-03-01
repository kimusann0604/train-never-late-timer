import type { GeolocationResult } from "../types/location";

/**
 * ブラウザの Geolocation API で現在地を取得
 */
export function getCurrentPosition(): Promise<GeolocationResult> {
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
 */
export function watchPosition(
  callback: (result: GeolocationResult) => void,
  onError?: (error: Error) => void
): number {
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
  navigator.geolocation.clearWatch(watchId);
}
