"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, Truck, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useSocket } from "@/hooks/useSocket";

interface Stats {
  total_orders: number;
  total_revenue: number;
  pending_deliveries: number;
  delivered_orders: number;
  low_stock_count: number;
  delivery_success_rate: number;
  return_rate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<{ date: string; orders: number; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [activity, setActivity] = useState<{ message: string; created_at: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { onDashboardUpdate } = useSocket();

  const fetchData = async () => {
    try {
      const [s, d, t, a] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/analytics/daily?days=7"),
        api.get("/analytics/top-products?limit=5"),
        api.get("/analytics/activity?limit=10"),
      ]);
      setStats(s.data);
      setDaily(d.data);
      setTopProducts(t.data);
      setActivity(a.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const unsub = onDashboardUpdate(() => { fetchData(); });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-neutral-800" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Orders", value: stats?.total_orders || 0, icon: Package, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/10" },
    { label: "Revenue", value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: "text-green-400", bg: "from-green-500/20 to-green-600/10" },
    { label: "Pending", value: stats?.pending_deliveries || 0, icon: Truck, color: "text-orange-400", bg: "from-orange-500/20 to-orange-600/10" },
    { label: "Low Stock", value: stats?.low_stock_count || 0, icon: AlertTriangle, color: "text-red-400", bg: "from-red-500/20 to-red-600/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" /> {stats?.delivery_success_rate}% Success
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm font-medium">Revenue Trend (7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: "#999", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#999", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm font-medium">Daily Orders</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: "#999", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#999", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                <Bar dataKey="orders" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm font-medium">Top Products</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 w-5">#{i + 1}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{p.revenue.toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">{p.quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-neutral-800 last:border-0">
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${a.type === "order" ? "bg-blue-400" : "bg-green-400"}`} />
                  <div>
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-neutral-500">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
