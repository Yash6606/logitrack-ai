"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Order, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Brain, AlertTriangle, CheckCircle, RefreshCcw, Loader2 } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

const statusColors: Record<string, string> = {
  placed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  dispatched: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  out_for_delivery: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  returned: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function OrdersPage() {
  const { socket } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [refundStageMessage, setRefundStageMessage] = useState("");

  const fetchData = async () => {
    try {
      const [o, a] = await Promise.all([api.get("/orders/"), api.get("/auth/agents")]);
      setOrders(o.data);
      setAgents(a.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchData();
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        socket?.emit("order_status_change", {
          orderId,
          customerId: order.customer_id,
          status,
        });
      }
    } catch { toast.error("Failed to update status"); }
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    try {
      await api.put(`/orders/${orderId}/assign`, { agent_id: agentId });
      toast.success("Agent assigned!");
      fetchData();
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        socket?.emit("order_status_change", {
          orderId,
          customerId: order.customer_id,
          status: "confirmed",
        });
      }
    } catch { toast.error("Failed to assign agent"); }
  };

  const autoAssign = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    try {
      const res = await api.post("/ai/auto-assign", order.delivery_address);
      if (res.data.assigned_agent) {
        await assignAgent(orderId, res.data.assigned_agent.agent_id);
        toast.success(`AI assigned: ${res.data.assigned_agent.name}`);
      }
    } catch { toast.error("Auto-assign failed"); }
  };

  const handleRefund = async (orderId: string) => {
    if (!selectedOrder) return;
    setRefunding(true);
    setRefundStageMessage("Contacting Stripe developer servers...");
    await new Promise((r) => setTimeout(r, 800));
    setRefundStageMessage("Initializing card reversal...");
    await new Promise((r) => setTimeout(r, 800));
    setRefundStageMessage(`Crediting ₹${selectedOrder.total_amount.toLocaleString()}...`);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const res = await api.post(`/orders/${orderId}/refund`);
      toast.success("Refund issued successfully!");
      setSelectedOrder((prev) => 
        prev ? { ...prev, payment_status: "refunded", refund_id: res.data.refund_id } : null
      );
      fetchData();
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Refund failed";
      toast.error(err);
    } finally {
      setRefunding(false);
    }
  };

  const nextStatus: Record<string, string> = {
    placed: "confirmed", confirmed: "dispatched", dispatched: "out_for_delivery", out_for_delivery: "delivered",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800">
                <TableHead>Order ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} className="border-neutral-800 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell className="text-sm">{o.items.length} items</TableCell>
                  <TableCell className="text-right font-medium">₹{o.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[o.status] || ""}>{o.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={o.payment_status === "paid" ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}>
                      {o.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {o.delivery_agent_id ? (
                      <span className="text-xs text-neutral-400">{o.delivery_agent_id.slice(0, 8)}...</span>
                    ) : (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <select
                          className="h-7 text-xs bg-neutral-800 border border-neutral-700 rounded px-2 text-white"
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) assignAgent(o.id, e.target.value); }}
                        >
                          <option value="" disabled>Assign</option>
                          {agents.map((a) => (
                            <option key={a.uid} value={a.uid}>{a.name}</option>
                          ))}
                        </select>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-500/30 text-cyan-400" onClick={() => autoAssign(o.id)}>
                          <Brain className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {nextStatus[o.status] && (
                      <Button size="sm" variant="outline" className="text-xs border-neutral-700" onClick={() => updateStatus(o.id, nextStatus[o.status])}>
                        → {nextStatus[o.status].replace(/_/g, " ")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 max-w-lg">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-neutral-500">Order ID:</span> <span className="font-mono">{selectedOrder.id}</span></div>
                <div><span className="text-neutral-500">Status:</span> <Badge variant="outline" className={statusColors[selectedOrder.status]}>{selectedOrder.status}</Badge></div>
                <div><span className="text-neutral-500">Total:</span> ₹{selectedOrder.total_amount.toLocaleString()}</div>
                <div><span className="text-neutral-500">Payment:</span> {selectedOrder.payment_id}</div>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-2">Items</p>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 text-sm border-b border-neutral-800">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="text-neutral-500">Delivery: </span>{selectedOrder.delivery_address.address}
              </div>

              {/* Stripe Refund Section */}
              {selectedOrder.status === "returned" && selectedOrder.payment_status === "refund_pending" && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Refund Available
                    </span>
                    <span className="text-neutral-500 font-mono">Stripe Test Charge</span>
                  </div>
                  <Button 
                    onClick={() => handleRefund(selectedOrder.id)} 
                    disabled={refunding}
                    className="w-full bg-red-600 hover:bg-red-700 text-xs font-bold h-9"
                  >
                    {refunding ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCcw className="h-3 w-3 mr-1.5" />}
                    {refunding ? refundStageMessage : `Issue Refund (₹${selectedOrder.total_amount.toLocaleString()})`}
                  </Button>
                </div>
              )}

              {selectedOrder.payment_status === "refunded" && (
                <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/10 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Refund Completed
                    </span>
                    <span className="text-neutral-500 font-mono">Stripe Sandbox Receipt</span>
                  </div>
                  {selectedOrder.refund_id && (
                    <div className="flex justify-between font-mono text-[10px] text-neutral-400 mt-1.5">
                      <span>Stripe Refund ID:</span>
                      <span>{selectedOrder.refund_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
