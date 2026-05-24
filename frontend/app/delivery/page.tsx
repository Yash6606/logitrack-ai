"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";
import { fetchRoute } from "@/lib/osrm";
import { Order, Payout } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LiveTrackingMap } from "@/components/maps";
import { Truck, Phone, MapPin, DollarSign, CheckCircle, XCircle, LogOut, Loader2, ArrowRight, Building2, Lock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function DeliveryPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { sendLocationUpdate, joinRoom, socket } = useSocket();
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState({ total_deliveries: 0, total_earnings: 0, available_balance: 0, total_paid_out: 0 });
  const [selectedDelivery, setSelectedDelivery] = useState<Order | null>(null);
  const [simulating, setSimulating] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef(0);
  const [agentPos, setAgentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [agentTrail, setAgentTrail] = useState<[number, number][]>([]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const waypointsRef = useRef<[number, number][]>([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [payoutStage, setPayoutStage] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [payoutTxId, setPayoutTxId] = useState("");
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const handleCashOut = async () => {
    setCashingOut(true);
    setPayoutSuccess(false);
    setPayoutStage("Opening secure Stripe Connect channel...");
    await new Promise((r) => setTimeout(r, 800));
    setPayoutStage("Authorizing instant deposit to HDFC Bank...");
    await new Promise((r) => setTimeout(r, 800));
    setPayoutStage(`Transferring ₹${earnings.available_balance.toLocaleString()}...`);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const res = await api.post("/payouts/payout");
      setPayoutTxId(res.data.stripe_transaction_id);
      setPayoutSuccess(true);
      toast.success("Instant payout completed!");
      fetchData();
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Payout failed";
      toast.error(err);
      setIsPayoutModalOpen(false);
    } finally {
      setCashingOut(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([api.get("/delivery/my-deliveries"), api.get("/delivery/earnings")]);
      setDeliveries(d.data);
      setEarnings(e.data);
    } catch (e) { console.error(e); }

    try {
      const p = await api.get("/payouts/history");
      setPayouts(p.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "delivery_agent") {
        if (user.role === "business_owner") {
          router.replace("/dashboard");
        } else {
          router.replace("/shop");
        }
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "delivery_agent") {
      fetchData();
      joinRoom(`user:${user.uid}`);
    }
  }, [user, loading, fetchData, joinRoom]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/delivery/${orderId}/status`, { status });
      toast.success(`Status updated: ${status}`);
      fetchData();
      
      const deliveryObj = deliveries.find((d) => d.id === orderId) || selectedDelivery;
      if (deliveryObj) {
        socket?.emit("order_status_change", {
          orderId,
          customerId: deliveryObj.customer_id,
          status: status === "delivered" ? "delivered" : status,
        });
      }

      if (status === "delivered" || status === "failed" || status === "returned") {
        stopSimulation();
      }
    } catch { toast.error("Update failed"); }
  };

  const startSimulation = async (delivery: Order) => {
    if (simulating) stopSimulation();
    setSelectedDelivery(delivery);
    setFetchingRoute(true);
    stepRef.current = 0;

    await updateStatus(delivery.id, "out_for_delivery");

    const endLat = delivery.delivery_address.lat;
    const endLng = delivery.delivery_address.lng;

    // Determine start position
    let startLat = endLat + (Math.random() - 0.5) * 0.05;
    let startLng = endLng + (Math.random() - 0.5) * 0.05;

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
      } catch {
        // Use fallback position
      }
    }

    // Fetch real road route from OSRM
    try {
      const route = await fetchRoute(startLat, startLng, endLat, endLng);
      waypointsRef.current = route.waypoints;
      setRoutePath(route.waypoints);

      // Format distance and ETA
      const distKm = (route.distanceMeters / 1000).toFixed(1);
      const etaMin = Math.ceil(route.durationSeconds / 60);
      if (route.distanceMeters > 0) {
        setRouteInfo({ distance: `${distKm} km`, eta: `${etaMin} min` });
      }
    } catch {
      // Fallback: straight line
      const fallback: [number, number][] = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        fallback.push([startLat + t * (endLat - startLat), startLng + t * (endLng - startLng)]);
      }
      waypointsRef.current = fallback;
      setRoutePath(fallback);
    }

    setFetchingRoute(false);
    setSimulating(true);
    runSimulationLoop(delivery);
  };

  const runSimulationLoop = (delivery: Order) => {
    const waypoints = waypointsRef.current;
    if (waypoints.length === 0) return;

    // Calculate step interval: skip some waypoints if too many, so total time is ~60-90s
    const maxSteps = 30;
    const stride = Math.max(1, Math.floor(waypoints.length / maxSteps));

    // Set initial position
    setAgentPos({ lat: waypoints[0][0], lng: waypoints[0][1] });
    setAgentTrail([[waypoints[0][0], waypoints[0][1]]]);

    simulationRef.current = setInterval(() => {
      stepRef.current += 1;
      const wpIndex = Math.min(stepRef.current * stride, waypoints.length - 1);
      const [lat, lng] = waypoints[wpIndex];

      setAgentPos({ lat, lng });
      setAgentTrail((prev) => [...prev, [lat, lng]]);

      sendLocationUpdate({
        deliveryId: delivery.id,
        lat,
        lng,
        agentId: user?.uid || "",
        timestamp: new Date().toISOString(),
      });

      if (wpIndex >= waypoints.length - 1) stopSimulation();
    }, 2000);
  };

  const stopSimulation = () => {
    if (simulationRef.current) clearInterval(simulationRef.current);
    setSimulating(false);
    stepRef.current = 0;
    setAgentPos(null);
    setAgentTrail([]);
    setRoutePath([]);
    setRouteInfo(null);
    waypointsRef.current = [];
  };

  useEffect(() => () => stopSimulation(), []);

  if (loading || !user || user.role !== "delivery_agent") {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-neutral-400 text-sm">Verifying authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-cyan-400" />
          <span className="font-bold">LogiTrack Agent</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">{user?.name}</span>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Earnings */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 uppercase">Available for Cash Out</p>
                <p className="text-3xl font-bold text-green-400">₹{earnings.available_balance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">{earnings.total_deliveries} deliveries</p>
                <Badge variant="outline" className="border-green-500/30 text-green-400 mt-1">₹50/delivery</Badge>
              </div>
            </div>
            
            <Separator className="bg-neutral-800" />
            
            <div className="flex justify-between text-xs text-neutral-400 font-mono">
              <div>Total Earnings: <span className="text-neutral-200 font-sans">₹{earnings.total_earnings.toLocaleString()}</span></div>
              <div>Already Paid Out: <span className="text-neutral-200 font-sans">₹{earnings.total_paid_out.toLocaleString()}</span></div>
            </div>

            {earnings.available_balance > 0 ? (
              <Button 
                onClick={() => {
                  setPayoutSuccess(false);
                  setIsPayoutModalOpen(true);
                }} 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold"
              >
                <Zap className="h-4 w-4 mr-2 fill-current" /> Stripe Instant Cash Out
              </Button>
            ) : (
              <Button 
                disabled
                className="w-full bg-neutral-800 text-neutral-500 cursor-not-allowed font-bold"
              >
                <Zap className="h-4 w-4 mr-2" /> No Earnings to Cash Out
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        {payouts.length > 0 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-400 fill-current" /> Recent Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payouts.slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/60 hover:border-neutral-800 transition-colors text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                      <span>HDFC Bank •••• 5678</span>
                    </div>
                    <div className="text-neutral-500 text-[10px]">{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-green-400 font-sans font-bold text-sm">₹{p.amount.toLocaleString()}</div>
                    <div className="text-[9px] text-neutral-500">{p.stripe_transaction_id}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Map */}
        {selectedDelivery && (
          <div>
            <h2 className="text-sm font-medium mb-2 text-neutral-400">Live Tracking</h2>
            <LiveTrackingMap
              agentPosition={agentPos}
              destination={selectedDelivery.delivery_address}
              deliveryId={selectedDelivery.id}
              routePath={routePath}
              trail={agentTrail}
            />
            {fetchingRoute && (
              <div className="flex items-center gap-2 mt-2 text-yellow-400 text-sm">
                <Loader2 className="h-3 w-3 animate-spin" /> Finding shortest route...
              </div>
            )}
            {simulating && (
              <div className="flex items-center gap-2 mt-2 text-cyan-400 text-sm">
                <Loader2 className="h-3 w-3 animate-spin" /> Following road route
                {routeInfo && (
                  <span className="text-neutral-500 ml-1">• {routeInfo.distance} • ETA {routeInfo.eta}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Deliveries */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Today&apos;s Deliveries ({deliveries.length})</h2>
          <div className="space-y-3">
            {deliveries.map((d) => (
              <Card key={d.id} className="bg-neutral-900 border-neutral-800">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-neutral-400">#{d.id}</p>
                      <p className="font-medium mt-1">{d.items.map((i) => i.product_name).join(", ")}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{d.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-neutral-400">
                    <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {d.delivery_address.address}</div>
                    {d.customer_name && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {d.customer_name} • {d.customer_phone}</div>}
                    <div className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> ₹{d.total_amount.toLocaleString()}</div>
                  </div>
                  <Separator className="my-3 bg-neutral-800" />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs border-cyan-500/30 text-cyan-400" onClick={() => startSimulation(d)}>
                      <MapPin className="h-3 w-3 mr-1" /> {simulating && selectedDelivery?.id === d.id ? "Tracking..." : "Start GPS"}
                    </Button>
                    <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700" onClick={() => updateStatus(d.id, "delivered")}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Delivered
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400" onClick={() => updateStatus(d.id, "failed")}>
                      <XCircle className="h-3 w-3 mr-1" /> Failed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deliveries.length === 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="py-8 text-center text-neutral-500">No deliveries assigned yet</CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Stripe Connect Payout Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={() => { if (!cashingOut) setIsPayoutModalOpen(false); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-400 fill-current" /> Stripe Connect Payout
            </DialogTitle>
          </DialogHeader>

          {cashingOut && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in duration-300">
              <Loader2 className="h-12 w-12 animate-spin text-green-500" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">{payoutStage}</p>
                <p className="text-xs text-neutral-500">Stripe Connect network simulation active</p>
              </div>
            </div>
          )}

          {payoutSuccess && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-green-400">Transfer Successful</h3>
                <p className="text-sm text-neutral-400">Funds have been credited instantly.</p>
              </div>

              <div className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Destination</span>
                  <span className="text-white font-sans flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> HDFC Bank *5678</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Amount Cashed Out</span>
                  <span className="text-green-400 font-sans font-bold">₹{earnings.available_balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Stripe Transfer ID</span>
                  <span className="text-neutral-300">{payoutTxId}</span>
                </div>
              </div>

              <Button onClick={() => setIsPayoutModalOpen(false)} className="w-full bg-green-600 hover:bg-green-700">
                Back to Dashboard
              </Button>
            </div>
          )}

          {!cashingOut && !payoutSuccess && (
            <div className="space-y-6 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Ready for Cash Out</p>
                <p className="text-4xl font-extrabold text-white">₹{earnings.available_balance.toLocaleString()}</p>
              </div>

              <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Direct Deposit Destination</span>
                  <span className="text-green-400 font-semibold border border-green-500/20 px-1.5 py-0.5 rounded bg-green-500/10">Instant Transfer</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="font-semibold text-white">HDFC Bank Checking</div>
                  <div className="font-mono text-neutral-400">•••• 5678</div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-400">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Simulated payout handles standard banking transfers through secure mock sandbox channels.</span>
              </div>

              <Button 
                onClick={handleCashOut}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold h-11"
              >
                Confirm and Cash Out ₹{earnings.available_balance.toLocaleString()}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
