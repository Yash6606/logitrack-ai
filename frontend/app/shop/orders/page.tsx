"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const statusColors: Record<string, string> = {
  placed: "bg-yellow-500/20 text-yellow-400", confirmed: "bg-blue-500/20 text-blue-400",
  dispatched: "bg-purple-500/20 text-purple-400", out_for_delivery: "bg-orange-500/20 text-orange-400",
  delivered: "bg-green-500/20 text-green-400", returned: "bg-red-500/20 text-red-400",
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rateOrder, setRateOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => { api.get("/orders/").then((r) => setOrders(r.data)).catch(console.error); }, []);

  const submitRating = async () => {
    if (!rateOrder) return;
    try {
      await api.post(`/delivery/${rateOrder.id}/rate`, { rating, comment: "" });
      toast.success("Rating submitted!"); setRateOrder(null);
    } catch { toast.error("Failed"); }
  };

  const submitReturn = async () => {
    if (!returnOrder) return;
    try {
      await api.post(`/orders/${returnOrder.id}/return`, { order_id: returnOrder.id, reason: returnReason });
      toast.success("Return processed!"); setReturnOrder(null);
      api.get("/orders/").then((r) => setOrders(r.data));
    } catch (e: unknown) { toast.error("Return failed — may be outside 24hr window"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <Card key={o.id} className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-neutral-400">#{o.id}</p>
                  <p className="text-sm mt-1">{o.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}</p>
                </div>
                <Badge variant="outline" className={statusColors[o.status]}>{o.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm"><span className="text-neutral-400">Total: </span><span className="font-bold">₹{o.total_amount.toLocaleString()}</span></div>
                <div className="flex gap-2">
                  {["dispatched", "out_for_delivery"].includes(o.status) && (
                    <Link href={`/shop/track?orderId=${o.id}`}><Button size="sm" variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">Track</Button></Link>
                  )}
                  {o.status === "delivered" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400" onClick={() => setRateOrder(o)}><Star className="h-3 w-3 mr-1" /> Rate</Button>
                      <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400" onClick={() => setReturnOrder(o)}><RotateCcw className="h-3 w-3 mr-1" /> Return</Button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">{new Date(o.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <Card className="bg-neutral-900 border-neutral-800"><CardContent className="py-8 text-center text-neutral-500">No orders yet</CardContent></Card>}
      </div>

      {/* Rate Dialog */}
      <Dialog open={!!rateOrder} onOpenChange={() => setRateOrder(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader><DialogTitle>Rate Delivery</DialogTitle></DialogHeader>
          <div className="flex gap-2 justify-center py-4">
            {[1,2,3,4,5].map((s) => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`h-8 w-8 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"}`} />
              </button>
            ))}
          </div>
          <Button onClick={submitRating} className="bg-blue-600">Submit Rating</Button>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returnOrder} onOpenChange={() => setReturnOrder(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader><DialogTitle>Return Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">Returns accepted within 24 hours of delivery only.</p>
            <Label>Reason</Label>
            <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Why are you returning?" className="bg-neutral-800 border-neutral-700" />
            <Button onClick={submitReturn} className="w-full bg-red-600 hover:bg-red-700">Submit Return</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
