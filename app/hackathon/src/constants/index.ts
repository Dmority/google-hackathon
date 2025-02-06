// WebSocket関連の定数
export const SOCKET_CONFIG = {
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  TIMEOUT: 30000,
  RECONNECTION_ATTEMPTS: 10,
  POLLING_INTERVAL: 3000,
} as const;

// WebSocketイベント名
export const SOCKET_EVENTS = {
  JOIN_ROOM: "join-room",
  LEAVE_ROOM: "leave-room",
  NEW_MESSAGE: "new-message",
  MESSAGE_RECEIVED: "message-received",
  MESSAGES_READ: "messages-read",
  READ_STATUS_UPDATED: "read-status-updated",
} as const;

// メッセージ関連の定数
export const MESSAGE_CONFIG = {
  READ_STATUS_UPDATE_DELAY: 1000,
  POLLING_INTERVAL: 3000,
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  FETCH_MESSAGES_ERROR: "メッセージの読み込みに失敗しました",
  SEND_MESSAGE_ERROR: "メッセージの送信に失敗しました",
  SOCKET_CONNECTION_ERROR: "WebSocket接続エラー",
} as const;

// WebSocket接続設定
export const SOCKET_CONNECTION_CONFIG = {
  path: "/api/socket/",
  transports: ["websocket"] as string[],
  reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
  reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
  timeout: 60000,
  reconnection: true,
  reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
  forceNew: false,
  withCredentials: false,
} as const;
