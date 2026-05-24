"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { DemandForecast, ChurnResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, UserX, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AIInsightsPage() {
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [churn, setChurn] = useState<ChurnResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [countdown, setCountdown] = useState(20);

  const fetchInsightsData = async () => {
    const [f, c] = await Promise.all([
      api.get("/ai/demand-forecast"),
      api.get("/ai/churn-prediction"),
    ]);
    setForecasts(f.data);
    setChurn(c.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsightsData().catch((err) => {
      console.error("Error fetching AI insights:", err);
      setLoading(false);
    });
  }, []);

  const handleRetrain = async () => {
    setIsRetraining(true);
    setCountdown(20);

    // Dynamic 1-second interval timer to update user progress
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await api.post("/ai/retrain");
      toast.success("Model retraining pipeline launched in the background!");
      
      // Keep loader active for full 20s training cycle to allow joblib serialization
      setTimeout(async () => {
        try {
          await fetchInsightsData();
          toast.success("AI Insights reloaded with latest trained models.");
        } catch (reloadErr) {
          console.error("Failed to auto-reload insights after retrain:", reloadErr);
          toast.error("Models are still training. Please refresh the page manually in a few seconds.");
        } finally {
          setIsRetraining(false);
          clearInterval(timer);
        }
      }, 20000);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to trigger retraining.");
      setIsRetraining(false);
      clearInterval(timer);
    }
  };

  const urgencyColor = (u: string) => {
    if (u === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (u === "high") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (u === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const riskColor = (r: string) => {
    if (r === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (r === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const trendIcon = (t: string) => {
    if (t === "increasing") return <TrendingUp className="h-3 w-3 text-green-400" />;
    if (t === "decreasing") return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-neutral-400" />;
  };

  // Compute progress percentage
  const progressPercent = Math.min(100, Math.round(((20 - countdown) / 20) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Insights</h1>
            <p className="text-sm text-neutral-400">Powered by Next-Gen XGBoost & Random Forest Predictors</p>
          </div>
        </div>
        <Button 
          disabled={isRetraining}
          onClick={handleRetrain}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium flex items-center gap-2 border border-purple-500/20 shadow-md shadow-purple-500/10"
        >
          <RefreshCw className={`h-4 w-4 ${isRetraining ? 'animate-spin' : ''}`} />
          {isRetraining ? "Retraining Models..." : "Retrain Models Now"}
        </Button>
      </div>

      {/* Premium Full-Screen Loading Dialog Overlay */}
      {isRetraining && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          <div className="max-w-md w-full bg-neutral-900 border border-purple-900/40 rounded-2xl p-6 shadow-2xl shadow-purple-500/15 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative mx-auto w-20 h-20 bg-purple-950/20 border border-purple-500/30 rounded-full flex items-center justify-center">
              <Brain className="h-10 w-10 text-purple-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">AI Optimization Engine Active</h3>
              <p className="text-xs text-neutral-400 leading-relaxed px-4">
                Executing high-performance pipelines: querying Firestore aggregates, performing dynamic RFM feature engineering, and fitting Scikit-Learn & XGBoost models.
              </p>
            </div>
            
            {/* Elegant Progress Count & Bar */}
            <div className="space-y-3 px-4">
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>{progressPercent}% Complete</span>
                <span className="text-purple-400 animate-pulse">{countdown}s Remaining</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden border border-neutral-750">
                <div 
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-purple-400 font-mono tracking-widest uppercase animate-pulse pt-1">
                Optimizing Weights & Backlogs...
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="forecast">
        <TabsList className="bg-neutral-800">
          <TabsTrigger value="forecast" className="data-[state=active]:bg-neutral-700">
            <TrendingUp className="h-3 w-3 mr-1" /> Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="churn" className="data-[state=active]:bg-neutral-700">
            <UserX className="h-3 w-3 mr-1" /> Churn Risk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          {/* Chart */}
          {forecasts.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader><CardTitle className="text-sm">7-Day Demand vs Current Stock</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={forecasts.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="product_name" tick={{ fill: "#999", fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="current_stock" fill="#06b6d4" name="Current Stock" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="predicted_7day_demand" fill="#ef4444" name="Predicted Demand" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Avg/Day</TableHead>
                    <TableHead className="text-right">7-Day Demand</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead className="text-right">Restock Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((f) => (
                    <TableRow key={f.product_id} className="border-neutral-800">
                      <TableCell className="font-medium">{f.product_name}</TableCell>
                      <TableCell className="text-right">{f.current_stock}</TableCell>
                      <TableCell className="text-right">{f.daily_average}</TableCell>
                      <TableCell className="text-right font-bold">{f.predicted_7day_demand}</TableCell>
                      <TableCell><div className="flex items-center gap-1">{trendIcon(f.trend)} {f.trend}</div></TableCell>
                      <TableCell><Badge variant="outline" className={urgencyColor(f.urgency)}>{f.urgency}</Badge></TableCell>
                      <TableCell className="text-right">{f.restock_recommended ? f.suggested_restock_qty : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800">
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Days Inactive</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Suggestion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {churn.map((c) => (
                    <TableRow key={c.customer_id} className="border-neutral-800">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs text-neutral-400">{c.email}</TableCell>
                      <TableCell className="text-right">{c.days_since_last_order}</TableCell>
                      <TableCell className="text-right">{c.total_orders}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={riskColor(c.risk_level)}>
                          {c.risk_level} {c.re_engagement_suggested && "⚠"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-400 max-w-[200px] truncate">{c.suggestion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
