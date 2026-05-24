"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [daily, setDaily] = useState<{ date: string; orders: number; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/dashboard"),
      api.get("/analytics/daily?days=14"),
      api.get("/analytics/top-products?limit=5"),
    ]).then(([s, d, t]) => {
      setStats(s.data);
      setDaily(d.data);
      setTopProducts(t.data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-64 bg-neutral-800" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Success Rate", value: `${stats.delivery_success_rate || 0}%`, color: "text-green-400" },
          { label: "Return Rate", value: `${stats.return_rate || 0}%`, color: "text-red-400" },
          { label: "Total Revenue", value: `₹${(stats.total_revenue || 0).toLocaleString()}`, color: "text-blue-400" },
          { label: "Delivered", value: stats.delivered_orders || 0, color: "text-cyan-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-6">
              <p className="text-xs text-neutral-400 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm">Revenue Trend (14 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: "#999", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#999", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader><CardTitle className="text-sm">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => (e.name as string || "").slice(0, 12)}>
                  {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
