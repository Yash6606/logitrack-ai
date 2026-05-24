"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle, Zap, ShieldAlert, ArrowRight, Sparkles, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SandboxCheckoutModal from "@/components/payment/SandboxCheckoutModal";
import { useAuth } from "@/hooks/useAuth";

interface BillingStatus {
  subscription_plan: "free" | "pro";
  order_count_this_month: number;
  max_orders: number;
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  const fetchBillingStatus = async () => {
    if (!user || user.role !== "business_owner") {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/billing/status");
      setStatus(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load billing metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === "business_owner") {
        fetchBillingStatus();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleUpgradeSuccess = (paymentId: string) => {
    setStatus((prev) => prev ? { ...prev, subscription_plan: "pro", max_orders: -1 } : null);
    toast.success("Welcome to Pro! Plan upgraded successfully.");
  };

  const submitUpgradeOrder = async () => {
    const res = await api.post("/billing/upgrade");
    return res.data;
  };

  const handleDowngrade = async () => {
    if (!confirm("Are you sure you want to downgrade to the Free plan? Your store will be limited to 50 orders/month, and any excess orders will be blocked.")) return;
    
    setDowngrading(true);
    try {
      await api.post("/billing/downgrade");
      setStatus((prev) => prev ? { ...prev, subscription_plan: "free", max_orders: 50 } : null);
      toast.success("Subscription downgraded to Free plan.");
    } catch {
      toast.error("Downgrade failed");
    } finally {
      setDowngrading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 bg-neutral-800" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 bg-neutral-800" />
            <Skeleton className="h-4 w-48 bg-neutral-800" />
          </div>
        </div>
        <Skeleton className="h-48 w-full bg-neutral-800" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80 bg-neutral-800" />
          <Skeleton className="h-80 bg-neutral-800" />
        </div>
      </div>
    );
  }

  const isPro = status?.subscription_plan === "pro";
  const orderCount = status?.order_count_this_month || 0;
  const orderPercentage = status?.max_orders && status.max_orders > 0 
    ? Math.min((orderCount / status.max_orders) * 100, 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30">
            <CreditCard className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Billing & Plans</h1>
            <p className="text-sm text-neutral-400">Manage your subscription, limits, and billing status</p>
          </div>
        </div>
        <div>
          <Badge
            variant="outline"
            className={
              isPro
                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] px-3 py-1 text-sm font-semibold"
                : "bg-neutral-800/80 text-neutral-400 border-neutral-700 px-3 py-1 text-sm font-semibold"
            }
          >
            {isPro ? "★ Pro Plan Active" : "Free Plan Account"}
          </Badge>
        </div>
      </div>

      {/* Usage Meter Card */}
      <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
        <CardContent className="pt-6 space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Monthly Usage Limit</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{orderCount}</span>
                <span className="text-neutral-500 text-lg">
                  / {status?.max_orders === -1 ? "∞" : status?.max_orders} orders processed
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Resets on the 1st of next month. Orders are placed by customers.
              </p>
            </div>
            
            {!isPro && orderCount >= 40 && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-400 max-w-sm">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Limit warning! You have used {Math.round(orderPercentage)}% of your free orders. Upgrade to prevent customer checkout blockages.</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPro 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                    : orderPercentage >= 90 
                    ? "bg-red-500" 
                    : orderPercentage >= 75 
                    ? "bg-yellow-500" 
                    : "bg-blue-600"
                }`}
                style={{ width: `${isPro ? 100 : orderPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-500 font-mono">
              <span>0 orders</span>
              <span>{isPro ? "Unlimited Capacity" : `${50 - orderCount} orders remaining`}</span>
              <span>{status?.max_orders === -1 ? "Unlimited" : "50 max"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparisons */}
      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Free Plan Card */}
        <Card className={`bg-neutral-900 border-neutral-800 flex flex-col justify-between transition-all ${!isPro ? "ring-2 ring-neutral-700/50" : "opacity-75"}`}>
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold">Standard Free</CardTitle>
              {!isPro && <Badge className="bg-neutral-800 text-neutral-300 hover:bg-neutral-800">Current Plan</Badge>}
            </div>
            <p className="text-xs text-neutral-400">Perfect for exploring LogiTrack basics</p>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-white">₹0</span>
              <span className="text-neutral-500 text-sm"> / month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
            <ul className="space-y-3 text-sm text-neutral-300">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> Up to 50 customer orders / month</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> Basic real-time GPS tracking</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> Standard inventory operations</li>
              <li className="flex items-center gap-2 text-neutral-500"><XCircle className="h-4 w-4 text-neutral-700 shrink-0" /> Advanced AI Analytics (Limited)</li>
              <li className="flex items-center gap-2 text-neutral-500"><XCircle className="h-4 w-4 text-neutral-700 shrink-0" /> Premium priority support</li>
            </ul>

            {isPro && (
              <Button
                variant="outline"
                onClick={handleDowngrade}
                disabled={downgrading}
                className="w-full border-neutral-800 hover:bg-red-500/10 hover:text-red-400 transition"
              >
                {downgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Downgrade Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan Card */}
        <Card className={`bg-neutral-900 border-neutral-800 flex flex-col justify-between transition-all relative overflow-hidden ${isPro ? "ring-2 ring-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.1)]" : "hover:border-neutral-700"}`}>
          <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-cyan-500 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Recommended
          </div>
          
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                LogiTrack Pro <Sparkles className="h-4 w-4 text-cyan-400" />
              </CardTitle>
              {isPro && <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-black border-none font-bold">Active Tier</Badge>}
            </div>
            <p className="text-xs text-neutral-400">For active businesses requiring scaling capability</p>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">₹2,499</span>
              <span className="text-neutral-500 text-sm"> / month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
            <ul className="space-y-3 text-sm text-neutral-300">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> **Unlimited** customer orders</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> Priority real-time AI auto-assignment</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> Churn Predictions & re-engagement flags</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> Smart inventory forecasting filters</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> Dedicated Stripe payout simulators for agents</li>
            </ul>

            {!isPro && (
              <Button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
              >
                Upgrade to Pro <Zap className="h-4 w-4 ml-2 fill-current" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      <SandboxCheckoutModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={handleUpgradeSuccess}
        amount={2499}
        description="DevFusion Premium Subscription Plan (Pro Tier)"
        submitOrder={submitUpgradeOrder}
      />
    </div>
  );
}

// Internal custom XCircle component helper
function XCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
