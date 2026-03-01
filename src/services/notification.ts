let swRegistration: ServiceWorkerRegistration | null = null;
let spamInterval: ReturnType<typeof setInterval> | null = null;

export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Service Worker registration failed:", err);
  }
}

const MESSAGES = [
  "起きて！！！！！",
  "目的地だよ！！！",
  "降りて！！！！！",
  "寝るな！！！！！",
  "ここだよ！！！！",
  "起きろ！！！！！",
  "到着！！！！！！",
  "やばい！！！！！",
  "乗り過ごすぞ！！",
  "今すぐ降りろ！！",
];

let notifCounter = 0;

function fireOne(): void {
  if (Notification.permission !== "granted") return;
  const msg = MESSAGES[notifCounter % MESSAGES.length];
  notifCounter++;
  // tag をユニークにして通知が重なるようにする
  const tag = `nesugoshi-spam-${notifCounter}`;
  if (swRegistration) {
    swRegistration.showNotification("🚨 寝過ごし防止アラーム 🚨", {
      body: msg,
      icon: "/vite.svg",
      tag,
      requireInteraction: true,
    } as NotificationOptions);
  } else {
    new Notification("🚨 寝過ごし防止アラーム 🚨", {
      body: msg,
      icon: "/vite.svg",
      tag,
      requireInteraction: true,
    });
  }
}

/** 200msごとに通知を連打し続ける */
export function startNotificationSpam(): void {
  stopNotificationSpam();
  notifCounter = 0;
  fireOne();
  spamInterval = setInterval(fireOne, 200);
}

/** 通知連打を停止 */
export function stopNotificationSpam(): void {
  if (spamInterval) {
    clearInterval(spamInterval);
    spamInterval = null;
  }
}
