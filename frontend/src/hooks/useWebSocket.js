import { useEffect, useRef } from "react";
import { WS } from "../constants";

export function useWebSocket({ onMessage, onConnect, onDisconnect }) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  useEffect(() => {
    function connect() {
      const clientId = `dashboard-${Date.now()}`;
      const ws = new WebSocket(`${WS}/ws/${clientId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        onConnect?.();
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected — reconnecting in 3s...");
        onDisconnect?.();
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
      };

      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        try {
          const msg = JSON.parse(e.data);
          onMessage?.(msg);
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };
    }

    connect();

    // Keepalive ping every 25 seconds
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 25000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);
}
