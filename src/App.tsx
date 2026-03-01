import { useEffect, useState, useRef } from "react";
import { geocode } from "./services/api";
import StationBoard from "./components/ArrivalAlert";
import { LocationWatcher } from "./services/locationWatcher";
import { getCurrentPosition } from "./services/geolocation";
import type { Coordinates, GeolocationResult, GeocodeResult } from "./types/location";
import "./App.css";

type AppState = "picking" | "monitoring" | "countdown" | "arrived";

function App() {
  const [state, setState] = useState<AppState>("picking");
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState("未設定");
  const [currentLocation, setCurrentLocation] = useState<GeolocationResult | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<LocationWatcher | null>(null);

  const [currentTime, setCurrentTime] = useState("");

  // Destination picker modal
  const [showStationModal, setShowStationModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification setting
  const [notifyDistance, setNotifyDistance] = useState(3000);
  const [notifyLabel, setNotifyLabel] = useState("3km前で通知");
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Feature toggles
  const [alarmSound, setAlarmSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [drowsyPrevention, setDrowsyPrevention] = useState(false);

  // Initial distance for progress calculation
  const [initialDistance, setInitialDistance] = useState<number | null>(null);

  // Countdown timer (30 seconds after arrival)
  const [countdown, setCountdown] = useState(30);

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // Search handler
  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const result = await geocode(value);
        setSearchResults([result]);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "検索に失敗しました");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectDestination = (result: GeocodeResult) => {
    setDestination({ lat: result.lat, lng: result.lng });
    setDestinationName(result.formattedAddress);
    setShowStationModal(false);
    setSearchInput("");
    setSearchResults([]);
    setSearchError(null);
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

  const toggleAlarm = async () => {
    if (state === "monitoring") {
      if (watcher) {
        watcher.stop();
        setWatcher(null);
      }
      setState("picking");
      setCurrentLocation(null);
      setDistance(null);
      setInitialDistance(null);
      return;
    }

    if (!destination) {
      setError("目的地を設定してください");
      return;
    }

    setError(null);
    try {
      const position = await getCurrentPosition();
      setCurrentLocation(position);
      const dist = calculateDistance(position, destination);
      setDistance(dist);
      setInitialDistance(dist);

      const watcherInstance = new LocationWatcher({
        destination,
        alertThresholdMeters: notifyDistance,
        onArrival: () => {
          setState("countdown");
          setCountdown(30);
        },
        onLocationUpdate: (location) => {
          setCurrentLocation(location);
          const d = calculateDistance(location, destination);
          setDistance(d);
        },
        onError: (err) => setError(`位置情報エラー: ${err.message}`),
      });

      await watcherInstance.start(position);
      setWatcher(watcherInstance);
      setState("monitoring");
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    }
  };

  useEffect(() => {
    return () => {
      if (watcher) watcher.stop();
    };
  }, [watcher]);

  // Countdown timer: 30s → arrived
  useEffect(() => {
    if (state !== "countdown") return;
    if (countdown <= 0) {
      setState("arrived");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [state, countdown]);

  // Auto-dismiss error
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const formatDistance = (d: number) =>
    d < 1000 ? `${d}m` : `${(d / 1000).toFixed(1)}km`;

  const progressPercent =
    initialDistance && distance !== null
      ? Math.min(100, Math.max(0, ((initialDistance - distance) / initialDistance) * 100))
      : 0;

  const shortDestName =
    destinationName === "未設定"
      ? "未設定"
      : destinationName.length > 10
        ? destinationName.slice(-10)
        : destinationName;

  // Countdown → show timer before SL
  if (state === "countdown") {
    return (
      <div className="countdown-screen">
        <div className="countdown-content">
          <div className="countdown-icon">🚃</div>
          <div className="countdown-title">まもなく到着します</div>
          <div className="countdown-timer">{countdown}</div>
          <div className="countdown-label">秒後にアラームが鳴ります</div>
          <div className="countdown-bar-track">
            <div
              className="countdown-bar-fill"
              style={{ width: `${((30 - countdown) / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Arrived → show SL animation
  if (state === "arrived") {
    return <StationBoard />;
  }

  return (
    <div className="dashboard">
      {/* Top Navigation */}
      <nav className="topnav">
        <div className="topnav-left">
          <div className="topnav-logo">😴</div>
          <div className="topnav-title">寝過ごし防止アラーム</div>
          <div className="topnav-subtitle">Desktop Dashboard</div>
        </div>
        <div className="topnav-right">
          <div className="topnav-status">
            <div className={`status-dot ${state !== "monitoring" ? "inactive" : ""}`} />
            <span>{state === "monitoring" ? "監視中" : "待機中"}</span>
          </div>
          <div className="topnav-time">{currentTime}</div>
          <div className="topnav-train-icon">🚃</div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="main-layout">
        {/* LEFT COLUMN */}
        <div className="left-col">
          {/* Route Map Card */}
          <div className="route-card">
            <div className="route-card-header">
              <div className="skyline-bg" />
              <div className="route-title-row">
                <div className="route-title">ルート情報</div>
              </div>
              <div className="station-map">
                <div className="stations-labels">
                  <div className="station-label-item">
                    <div className="station-label-badge">
                      {currentLocation ? "現在地" : "出発地"}
                    </div>
                  </div>
                  <div className="station-label-item">
                    <div className="station-label-badge destination">{shortDestName}</div>
                  </div>
                </div>
                <div className="track-visual">
                  <div className="track-rail" />
                  <div
                    className="track-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div className="track-station-dot passed" style={{ left: "5%" }} />
                  {state === "monitoring" && (
                    <div
                      className="track-station-dot current"
                      style={{
                        left: `${Math.max(8, Math.min(88, 5 + progressPercent * 0.9))}%`,
                      }}
                    />
                  )}
                  <div className="track-station-dot upcoming" style={{ left: "95%" }} />
                  {state === "monitoring" && (
                    <div
                      className="track-train"
                      style={{
                        left: `${Math.max(8, Math.min(88, 5 + progressPercent * 0.9))}%`,
                      }}
                    >
                      🚃
                    </div>
                  )}
                  <div className="track-pin">
                    <div className="pin-body">
                      <div className="pin-body-inner" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="route-info-bar">
              <div className="route-info-item">
                <div className="route-info-icon">📍</div>
                <div>
                  <div className="route-info-label">現在地</div>
                  <div className="route-info-value">
                    {currentLocation
                      ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                      : "未取得"}
                  </div>
                </div>
              </div>
              <div className="route-info-item">
                <div className="route-info-icon">🏁</div>
                <div>
                  <div className="route-info-label">目的地まで</div>
                  <div className="route-info-value">
                    {distance !== null ? formatDistance(distance) : "—"}
                  </div>
                </div>
              </div>
              <div className="route-info-item">
                <div className="route-info-icon">⏱️</div>
                <div>
                  <div className="route-info-label">ステータス</div>
                  <div className="route-info-value">
                    {state === "monitoring"
                      ? distance !== null && distance <= notifyDistance
                        ? "もうすぐ到着！"
                        : "移動中..."
                      : "待機中"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Detail Card */}
          {state === "monitoring" && currentLocation && destination && (
            <div className="station-list-card">
              <div className="card-header">
                <div className="card-title">位置情報詳細</div>
              </div>
              <div className="station-table">
                <div className="station-row current-station">
                  <div className="sr-dot current" />
                  <div>
                    <div className="sr-name">現在地</div>
                    <div className="sr-name-en">Current Location</div>
                  </div>
                  <div className="sr-time">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                  <div>
                    <span className="sr-status now">現在</span>
                  </div>
                  <div className="sr-tag" />
                </div>
                <div className="station-row destination-station">
                  <div className="sr-dot dest" />
                  <div>
                    <div className="sr-name">{shortDestName}</div>
                    <div className="sr-name-en">Destination</div>
                  </div>
                  <div className="sr-time">
                    {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
                  </div>
                  <div>
                    <span className="sr-status upcoming">—</span>
                  </div>
                  <div className="sr-tag">
                    <span className="dest-badge">目的地</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">
          {/* Alarm Control */}
          <div className="alarm-card">
            <div className="card-header">
              <div className="card-title">アラーム設定</div>
            </div>
            <div className="alarm-card-inner">
              <div className="alarm-settings">
                <div
                  className={`alarm-setting ${state === "monitoring" ? "disabled" : ""}`}
                  onClick={() => state !== "monitoring" && setShowStationModal(true)}
                >
                  <div className="alarm-setting-left">
                    <div className="alarm-setting-icon">🚉</div>
                    <div>
                      <div className="alarm-setting-label">目的地</div>
                      <div className="alarm-setting-value">{shortDestName}</div>
                    </div>
                  </div>
                  <div className="alarm-setting-arrow">›</div>
                </div>
                <div
                  className={`alarm-setting ${state === "monitoring" ? "disabled" : ""}`}
                  onClick={() => state !== "monitoring" && setShowNotifyModal(true)}
                >
                  <div className="alarm-setting-left">
                    <div className="alarm-setting-icon">🔔</div>
                    <div>
                      <div className="alarm-setting-label">通知タイミング</div>
                      <div className="alarm-setting-value">{notifyLabel}</div>
                    </div>
                  </div>
                  <div className="alarm-setting-arrow">›</div>
                </div>
              </div>

              <div className="alarm-btn-wrap">
                <button
                  className={`alarm-btn ${state === "monitoring" ? "active" : ""}`}
                  onClick={toggleAlarm}
                  disabled={state !== "monitoring" && !destination}
                >
                  <span className="alarm-btn-icon">
                    {state === "monitoring" ? "🔴" : "⏰"}
                  </span>
                  <span>{state === "monitoring" ? "アラーム停止" : "アラーム開始"}</span>
                </button>
              </div>

              <div className="feature-toggles">
                <div className="feature-toggle" onClick={() => setAlarmSound(!alarmSound)}>
                  <div className="feature-toggle-left">
                    <div className="feature-toggle-icon">🔔</div>
                    <div>
                      <div className="feature-toggle-name">アラーム音</div>
                      <div className="feature-toggle-desc">
                        目的地が近づくとアラームで通知
                      </div>
                    </div>
                  </div>
                  <div className={`toggle-switch ${alarmSound ? "on" : ""}`} />
                </div>
                <div className="feature-toggle" onClick={() => setVibration(!vibration)}>
                  <div className="feature-toggle-left">
                    <div className="feature-toggle-icon">📳</div>
                    <div>
                      <div className="feature-toggle-name">振動通知</div>
                      <div className="feature-toggle-desc">バイブレーションで通知</div>
                    </div>
                  </div>
                  <div className={`toggle-switch ${vibration ? "on" : ""}`} />
                </div>
                <div
                  className="feature-toggle"
                  onClick={() => setDrowsyPrevention(!drowsyPrevention)}
                >
                  <div className="feature-toggle-left">
                    <div className="feature-toggle-icon">😪</div>
                    <div>
                      <div className="feature-toggle-name">うとうと防止</div>
                      <div className="feature-toggle-desc">
                        定期的に軽いアラームで起こす
                      </div>
                    </div>
                  </div>
                  <div className={`toggle-switch ${drowsyPrevention ? "on" : ""}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Sleep Illustration */}
          <div className="sleep-card">
            <div className="sleeper-visual">
              <div className="sleeper-body">
                <div className="person-hair" />
                <div className="person-head" />
                <div className="person-suit" />
                <div className="seat" />
                <div className="zzz-bubble">
                  Z<small>z</small>
                  <small style={{ fontSize: "0.6em" }}>z</small>..
                </div>
              </div>
            </div>
            <div className="sleep-text-big">Zzz..</div>
          </div>

          {/* Warning */}
          <div className="warning-card">
            <div className="warning-icon">⚠</div>
            <div className="warning-text">注意: 寝過ごしにご注意ください！</div>
          </div>
        </div>
      </div>

      {/* Station Modal (Destination Picker) */}
      {showStationModal && (
        <div
          className="modal-overlay show"
          onClick={(e) => e.target === e.currentTarget && setShowStationModal(false)}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">🚉 目的地を検索</div>
              <button
                className="modal-close"
                onClick={() => {
                  setShowStationModal(false);
                  setSearchInput("");
                  setSearchResults([]);
                  setSearchError(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-search">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="住所・駅名を入力..."
                  className="modal-search-input"
                  autoFocus
                />
              </div>
              {searching && <div className="modal-loading">検索中...</div>}
              {searchError && <div className="modal-error">{searchError}</div>}
              {searchResults.map((result) => (
                <div
                  key={`${result.lat}-${result.lng}`}
                  className="modal-option"
                  onClick={() => selectDestination(result)}
                >
                  <div className="opt-dot" />
                  <div>
                    <div>{result.formattedAddress}</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>
                      ({result.lat.toFixed(6)}, {result.lng.toFixed(6)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && (
        <div
          className="modal-overlay show"
          onClick={(e) => e.target === e.currentTarget && setShowNotifyModal(false)}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">🔔 通知タイミング</div>
              <button className="modal-close" onClick={() => setShowNotifyModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {[
                { label: "1km前で通知", value: 1000 },
                { label: "2km前で通知", value: 2000 },
                { label: "3km前で通知", value: 3000 },
                { label: "5km前で通知", value: 5000 },
                { label: "到着時に通知", value: 500 },
              ].map(({ label, value }) => (
                <div
                  key={value}
                  className={`modal-option ${notifyDistance === value ? "selected" : ""}`}
                  onClick={() => {
                    setNotifyDistance(value);
                    setNotifyLabel(label);
                    setShowNotifyModal(false);
                  }}
                >
                  {label}
                  <div className="opt-check">✓</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

export default App;
