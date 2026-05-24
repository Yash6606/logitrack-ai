"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit("join_room", { room });
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit("leave_room", { room });
  }, []);

  const sendLocationUpdate = useCallback((data: {
    deliveryId: string;
    lat: number;
    lng: number;
    agentId: string;
    timestamp: string;
  }) => {
    socketRef.current?.emit("location_update", data);
  }, []);

  const onDeliveryLocation = useCallback((cb: (data: { deliveryId: string; lat: number; lng: number }) => void) => {
    socketRef.current?.on("delivery_location", cb);
    return () => { socketRef.current?.off("delivery_location", cb); };
  }, []);

  const onAgentLocation = useCallback((cb: (data: { agentId: string; lat: number; lng: number; deliveryId: string }) => void) => {
    socketRef.current?.on("agent_location", cb);
    return () => { socketRef.current?.off("agent_location", cb); };
  }, []);

  const onOrderUpdate = useCallback((cb: (data: { orderId: string; status: string }) => void) => {
    socketRef.current?.on("order_update", cb);
    return () => { socketRef.current?.off("order_update", cb); };
  }, []);

  const onDashboardUpdate = useCallback((cb: (data: unknown) => void) => {
    socketRef.current?.on("dashboard_update", cb);
    return () => { socketRef.current?.off("dashboard_update", cb); };
  }, []);

  const onNotification = useCallback((cb: (data: { message: string; type: string }) => void) => {
    socketRef.current?.on("notification", cb);
    return () => { socketRef.current?.off("notification", cb); };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    joinRoom,
    leaveRoom,
    sendLocationUpdate,
    onDeliveryLocation,
    onAgentLocation,
    onOrderUpdate,
    onDashboardUpdate,
    onNotification,
  };
}
