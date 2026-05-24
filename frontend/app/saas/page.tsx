"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, Users, Award, ShieldCheck, Search, RefreshCw, 
  UserCheck, ArrowUpRight, CreditCard, ShoppingBag, Landmark
} from "lucide-react";
import { toast } from "sonner";

interface Owner {
  uid: string;
  email: string;
  name: string;
  subscription_plan: string;
  phone: string;
  created_at?: string;
}

interface Payment {
  transaction_id: string;
  business_id: string;
  email: string;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  created_at: string;
}

interface SaasMetrics {
  total_owners: number;
  total_agents: number;
  total_customers: number;
  pro_owners: number;
  free_owners: number;
  total_revenue: number;
}

export default function SaasAdminPage() {
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [ownerSearch, setOwnerSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const fetchSaasData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/billing/saas-metrics");
      setMetrics(res.data.metrics);
      setOwners(res.data.owners);
      setPayments(res.data.payments);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to fetch SaaS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaasData();
  }, []);

  // Filtered owners
  const filteredOwners = owners.filter(o => 
    o.name?.toLowerCase().includes(ownerSearch.toLowerCase()) ||
    o.email?.toLowerCase().includes(ownerSearch.toLowerCase()) ||
    o.phone?.includes(ownerSearch)
  );

  // Filtered payments
  const filteredPayments = payments.filter(p => 
    p.email?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.transaction_id?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.business_id?.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  // Calculate ratios
  const totalOwnersCount = metrics?.total_owners || 0;
  const proRatio = totalOwnersCount > 0 ? Math.round((metrics?.pro_owners || 0) / totalOwnersCount * 100) : 0;
  const totalPlatformUsers = (metrics?.total_owners || 0) + (metrics?.total_agents || 0) + (metrics?.total_customers || 0);

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-neutral-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-neutral-850 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-neutral-850 rounded" />
              <div className="h-8 w-16 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
        <div className="h-96 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header and Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-purple-400 bg-clip-text text-transparent">
            SaaS Control Panel
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time analytics, user distribution, and Indian Rupees (INR) simulated Stripe billing audit ledger.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchSaasData} 
          disabled={loading}
          className="border-purple-900/40 text-purple-300 bg-purple-950/10 hover:bg-purple-900/20 backdrop-blur-sm self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Force Sync Metrics
        </Button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* TOTAL REVENUE */}
        <Card className="bg-neutral-900/60 border-purple-950/40 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-600/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Simulated SaaS Revenue</CardTitle>
            <div className="p-2 bg-purple-950/30 text-purple-400 rounded-lg border border-purple-900/30">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              ₹{(metrics?.total_revenue || 0).toLocaleString("en-IN")}.00
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-purple-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Simulated Stripe test mode</span>
            </div>
          </CardContent>
        </Card>

        {/* PRO PLAN CONVERSION */}
        <Card className="bg-neutral-900/60 border-purple-950/40 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-600/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Pro Conversion Rate</CardTitle>
            <div className="p-2 bg-purple-950/30 text-yellow-500 rounded-lg border border-purple-900/30">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {proRatio}%
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${proRatio}%` }}
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
              {metrics?.pro_owners || 0} Pro / {totalOwnersCount} Total Owners
            </p>
          </CardContent>
        </Card>

        {/* REGISTERED BUSINESS OWNERS */}
        <Card className="bg-neutral-900/60 border-purple-950/40 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-600/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Business Store Owners</CardTitle>
            <div className="p-2 bg-purple-950/30 text-indigo-400 rounded-lg border border-purple-900/30">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {totalOwnersCount}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              <span className="text-purple-400 font-semibold">{metrics?.pro_owners || 0} Pro</span> • <span className="text-neutral-400">{metrics?.free_owners || 0} Free</span>
            </p>
          </CardContent>
        </Card>

        {/* TOTAL SYSTEM USERS */}
        <Card className="bg-neutral-900/60 border-purple-950/40 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-600/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Total Platform Users</CardTitle>
            <div className="p-2 bg-purple-950/30 text-purple-400 rounded-lg border border-purple-900/30">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {totalPlatformUsers}
            </div>
            <p className="text-[10px] text-neutral-500 mt-2 font-mono truncate">
              {metrics?.total_agents || 0} Agents • {metrics?.total_customers || 0} Customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main SaaS Platform Operations & Audits Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Business Owners Directory */}
        <Card className="bg-neutral-900/40 border-neutral-800 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Business Store Owners
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Registered platform store owners and their respective pricing tiers.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <Input
                  placeholder="Search owners..."
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  className="pl-8 bg-neutral-950 border-neutral-800 text-xs h-8 text-white placeholder:text-neutral-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-neutral-950/50 sticky top-0 z-10">
                  <TableRow className="border-neutral-850 hover:bg-transparent">
                    <TableHead className="text-neutral-400 text-xs py-3 pl-6">Owner</TableHead>
                    <TableHead className="text-neutral-400 text-xs py-3">Phone</TableHead>
                    <TableHead className="text-neutral-400 text-xs py-3 pr-6 text-right">Plan Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOwners.length === 0 ? (
                    <TableRow className="border-neutral-850 hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center text-xs text-neutral-500 py-12">
                        No business owners found matching search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOwners.map((owner) => (
                      <TableRow key={owner.uid} className="border-neutral-850 hover:bg-neutral-900/30">
                        <TableCell className="py-3 pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-white">{owner.name || "Unnamed Owner"}</span>
                            <span className="text-[10px] text-neutral-400">{owner.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-neutral-300 py-3 font-mono">
                          {owner.phone || "N/A"}
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          <Badge 
                            variant="outline" 
                            className={
                              owner.subscription_plan === "pro" 
                                ? "bg-amber-950/30 text-amber-400 border-amber-800/30 shadow-sm shadow-amber-900/10 font-bold animate-pulse"
                                : "bg-neutral-800/40 text-neutral-400 border-neutral-700/30"
                            }
                          >
                            {owner.subscription_plan === "pro" ? "⭐ Pro Plan" : "Free Plan"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Transaction Ledger */}
        <Card className="bg-neutral-900/40 border-neutral-800 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-400" />
                  SaaS Revenue Ledger
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  Stripe sandbox subscription payment transaction audits.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <Input
                  placeholder="Search ledger..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-8 bg-neutral-950 border-neutral-800 text-xs h-8 text-white placeholder:text-neutral-500 focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-neutral-950/50 sticky top-0 z-10">
                  <TableRow className="border-neutral-850 hover:bg-transparent">
                    <TableHead className="text-neutral-400 text-xs py-3 pl-6">Transaction / Email</TableHead>
                    <TableHead className="text-neutral-400 text-xs py-3">Date</TableHead>
                    <TableHead className="text-neutral-400 text-xs py-3">Amount</TableHead>
                    <TableHead className="text-neutral-400 text-xs py-3 pr-6 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow className="border-neutral-850 hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center text-xs text-neutral-500 py-12">
                        No transactions recorded in the subscription ledger yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((pay) => (
                      <TableRow key={pay.transaction_id} className="border-neutral-850 hover:bg-neutral-900/30">
                        <TableCell className="py-3 pl-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-purple-400 truncate max-w-[150px]">{pay.transaction_id}</span>
                            <span className="text-[10px] text-neutral-400">{pay.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-neutral-400 py-3">
                          {pay.created_at ? new Date(pay.created_at).toLocaleString() : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-white py-3 font-mono font-medium">
                          ₹{pay.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          <Badge 
                            variant="outline" 
                            className="bg-emerald-950/30 text-emerald-400 border-emerald-900/40 text-[10px]"
                          >
                            {pay.status || "succeeded"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
