import { useEffect, useState } from "react";
import { DestinationPicker } from "./components/DestinationPicker";
import { ArrivalAlert } from "./components/ArrivalAlert";
import { LocationWatcher } from "./services/locationWatcher";
import { getCurrentPosition } from "./services/geolocation";
import type { Coordinates, GeolocationResult } from "./types/location";
import "./App.css";

type AppState = "picking" | "monitoring" | "arrived";

function App() {
  const [state, setState] = useState<AppState>("picking");
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<GeolocationResult | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<LocationWatcher | null>(null);

  const handleDestinationConfirmed = async (dest: Coordinates, destName: string) => {
    setDestination(dest);
    setDestinationName(destName);
    setError(null);

    try {
      const position = await getCurrentPosition();
      setCurrentLocation(position);

      const watcherInstance = new LocationWatcher({
        destination: dest,
        alertThresholdMeters: 3000,
        onArrival: () => {
          setState("arrived");
        },
        onLocationUpdate: (location) => {
          setCurrentLocation(location);
          const dist = calculateDistance(location, dest);
          setDistance(dist);
        },
        onError: (err) => {
          setError(`位置情報エラー: ${err.message}`);
        },
      });

      await watcherInstance.start(position);
      setWatcher(watcherInstance);
      setState("monitoring");
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(message);
    }
  };

  const handleArrivalDismiss = () => {
    if (watcher) {
      watcher.stop();
      setWatcher(null);
    }
    setState("picking");
    setDestination(null);
    setCurrentLocation(null);
    setDistance(null);
  };

  const calculateDistance = (from: GeolocationResult, to: Coordinates): number => {
    const R = 6371000;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  useEffect(() => {
    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, [watcher]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🗺️ 目的地通知アプリ</h1>
      </header>

      <main className="app-main">
        {state === "picking" && (
          <DestinationPicker onDestinationConfirmed={handleDestinationConfirmed} />
        )}

        {state === "monitoring" && destination && currentLocation && (
          <div className="monitoring-panel">
            <h2>監視中...</h2>
            <div className="location-info">
              <div className="info-item">
                <label>現在地:</label>
                <span>
                  ({currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)})
                </span>
              </div>
              <div className="info-item">
                <label>目的地:</label>
                <span>
                  ({destination.lat.toFixed(6)}, {destination.lng.toFixed(6)})
                </span>
              </div>
              {distance !== null && (
                <div className="info-item distance-display">
                  <label>距離:</label>
                  <span className="distance-value">
                    {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(2)}km`}
                  </span>
                </div>
              )}
            </div>
            <p className="status-message">
              {distance !== null && distance <= 3000
                ? "⚠️ もうすぐ到着します！"
                : "位置情報を監視中..."}
            </p>
            <button
              className="cancel-button"
              onClick={() => {
                if (watcher) {
                  watcher.stop();
                  setWatcher(null);
                }
                setState("picking");
                setDestination(null);
                setCurrentLocation(null);
                setDistance(null);
              }}
            >
              キャンセル
            </button>
          </div>
        )}

        {state === "arrived" && (
          <ArrivalAlert
            destination={destinationName || "目的地"}
            onDismiss={handleArrivalDismiss}
          />
        )}

        {error && <div className="error-banner">{error}</div>}
      </main>
    </div>
  );
}

export default App;
