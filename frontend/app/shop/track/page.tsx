"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";
import { fetchRoute } from "@/lib/osrm";
import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveTrackingMap } from "@/components/maps";
import { Truck, Package, MapPin, Clock } from "lucide-react";

function TrackContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const { joinRoom, onDeliveryLocation, onOrderUpdate } = useSocket();
  const [order, setOrder] = useState<Order | null>(null);
  const [agentPos, setAgentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [agentTrail, setAgentTrail] = useState<[number, number][]>([]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const hasRoute = useRef(false);

  useEffect(() => {
    if (orderId) {
      api.get(`/orders/${orderId}`).then((r) => setOrder(r.data)).catch(console.error);
      joinRoom(`delivery:${orderId}`);
    }
  }, [orderId]);

  useEffect(() => {
    const unsub = onDeliveryLocation((data) => {
      if (data.deliveryId === orderId) {
        setAgentPos({ lat: data.lat, lng: data.lng });
        setAgentTrail((prev) => [...prev, [data.lat, data.lng]]);

        // On first agent position, fetch the road route from agent to destination
        if (!hasRoute.current && order?.delivery_address) {
          hasRoute.current = true;
          fetchRoute(
            data.lat, data.lng,
            order.delivery_address.lat, order.delivery_address.lng
          ).then((route) => {
            setRoutePath(route.waypoints);
          }).catch(() => {});
        }
      }
    });
    return unsub;
  }, [orderId, order]);

  useEffect(() => {
    const unsub = onOrderUpdate((data) => {
      if (data.orderId === orderId && order) {
        setOrder({ ...order, status: data.status });
      }
    });
    return unsub;
  }, [orderId, order]);

  const steps = ["placed", "confirmed", "dispatched", "out_for_delivery", "delivered"];
  const currentStep = order ? steps.indexOf(order.status) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Track Order</h1>

      {!orderId ? (
        <Card className="bg-neutral-900 border-neutral-800"><CardContent className="py-8 text-center text-neutral-500">No order ID provided. Go to My Orders to track.</CardContent></Card>
      ) : (
        <>
          {/* Status Timeline */}
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                {steps.map((s, i) => (
                  <div key={s} className="flex flex-col items-center flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentStep ? "bg-blue-500 text-white" : "bg-neutral-800 text-neutral-500"}`}>
                      {i + 1}
                    </div>
                    <p className={`text-[10px] mt-1 text-center ${i <= currentStep ? "text-blue-400" : "text-neutral-500"}`}>
                      {s.replace(/_/g, " ")}
                    </p>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 w-full mt-2 ${i < currentStep ? "bg-blue-500" : "bg-neutral-800"}`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <LiveTrackingMap
            agentPosition={agentPos}
            destination={order?.delivery_address || null}
            deliveryId={orderId}
            routePath={routePath}
            trail={agentTrail}
          />

          {/* Order Info */}
          {order && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Order ID</span>
                  <span className="font-mono">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status</span>
                  <Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Delivery</span>
                  <span>{order.delivery_address.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Items</span>
                  <span>{order.items.map((i) => i.product_name).join(", ")}</span>
                </div>
                {agentPos && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Truck className="h-4 w-4 animate-pulse" />
                    Agent is live on map
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<div className="text-center py-8">Loading...</div>}><TrackContent /></Suspense>;
}
