"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { DashboardMap } from "@/components/maps";

export default function MapPage() {
  const [agents, setAgents] = useState<{ id: string; name: string; lat: number; lng: number; deliveryId?: string }[]>([]);
  const [orderMarkers, setOrderMarkers] = useState<{ id: string; address: string; lat: number; lng: number; status: string }[]>([]);
  const { onAgentLocation } = useSocket();

  useEffect(() => {
    // Fetch agents and active orders
    Promise.all([api.get("/auth/agents"), api.get("/orders/")]).then(([a, o]) => {
      setAgents(a.data.filter((ag: Record<string, unknown>) => ag.location).map((ag: Record<string, unknown>) => ({
        id: ag.uid, name: ag.name, lat: (ag.location as Record<string, number>).lat, lng: (ag.location as Record<string, number>).lng,
      })));
      const active = o.data.filter((or: Record<string, string>) => ["dispatched", "out_for_delivery"].includes(or.status));
      setOrderMarkers(active.map((or: Record<string, unknown>) => ({
        id: or.id, address: (or.delivery_address as Record<string, string>).address,
        lat: (or.delivery_address as Record<string, number>).lat, lng: (or.delivery_address as Record<string, number>).lng,
        status: or.status,
      })));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = onAgentLocation((data) => {
      setAgents((prev) => prev.map((a) => a.id === data.agentId ? { ...a, lat: data.lat, lng: data.lng, deliveryId: data.deliveryId } : a));
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Live Delivery Map</h1>
      <DashboardMap agents={agents} orders={orderMarkers} />
      <div className="flex gap-4 text-sm text-neutral-400">
        <span>🟢 Agents: {agents.length}</span>
        <span>🟠 Active Orders: {orderMarkers.length}</span>
      </div>
    </div>
  );
}
