// Thin WebSocket client to the Lacuna server. Owns the single socket, queues sends made
// before it's open, routes every ServerMsg to a handler, and auto-reconnects (firing an
// onReady each time it opens so the store can re-send `resume` and rejoin a live match).

import type { ClientMsg, ServerMsg } from "./protocol";

const SERVER_URL =
  (import.meta.env.VITE_LACUNA_SERVER as string | undefined) ?? "ws://localhost:8787";

type MsgHandler = (m: ServerMsg) => void;
type StatusHandler = (connected: boolean) => void;

let ws: WebSocket | null = null;
let onMsg: MsgHandler = () => {};
let onStatus: StatusHandler = () => {};
let onReady: () => void = () => {};
let outbox: ClientMsg[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wantOpen = false;

export function netConfig(handlers: { onMsg: MsgHandler; onStatus?: StatusHandler; onReady?: () => void }): void {
  onMsg = handlers.onMsg;
  if (handlers.onStatus) onStatus = handlers.onStatus;
  if (handlers.onReady) onReady = handlers.onReady;
}

export function netConnect(): void {
  wantOpen = true;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  open();
}

function open(): void {
  try {
    ws = new WebSocket(SERVER_URL);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    onStatus(true);
    for (const m of outbox) ws!.send(JSON.stringify(m));
    outbox = [];
    onReady();
  };
  ws.onmessage = (e) => {
    let m: ServerMsg;
    try {
      m = JSON.parse(e.data as string) as ServerMsg;
    } catch {
      return;
    }
    onMsg(m);
  };
  ws.onclose = () => {
    onStatus(false);
    ws = null;
    if (wantOpen) scheduleReconnect();
  };
  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (wantOpen) open();
  }, 1500);
}

export function netSend(m: ClientMsg): void {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  else {
    outbox.push(m);
    netConnect();
  }
}

export function netDisconnect(): void {
  wantOpen = false;
  outbox = [];
  ws?.close();
  ws = null;
}
