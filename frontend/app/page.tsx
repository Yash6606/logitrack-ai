"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Truck, Package, MapPin, Brain, BarChart3, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Hero */}
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">LogiTrack AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/signup"><Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
          <Brain className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-blue-400 font-medium">AI-Powered Logistics</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          Smart Supply Chain &<br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Delivery Management
          </span>
        </h1>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-8">
          Real-time tracking, AI demand forecasting, smart delivery assignment, and complete order management — all in one platform.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup"><Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-8">Start Free</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline" className="border-neutral-700 px-8">Demo Login</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: MapPin, title: "Real-Time Tracking", desc: "Live GPS tracking of deliveries with interactive maps and route visualization." },
            { icon: Brain, title: "AI Demand Forecast", desc: "Predict product demand, get restock alerts, and prevent stockouts with AI." },
            { icon: Package, title: "Order Management", desc: "Complete order lifecycle from placement to delivery with status tracking." },
            { icon: Truck, title: "Smart Auto-Assign", desc: "AI assigns the best delivery agent based on proximity and workload." },
            { icon: BarChart3, title: "Business Analytics", desc: "Revenue trends, top products, delivery success rates, and more." },
            { icon: Shield, title: "Customer Insights", desc: "Churn prediction and re-engagement suggestions powered by AI." },
          ].map((f, i) => (
            <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-800 py-8 text-center text-sm text-neutral-500">
        &copy; 2024 LogiTrack AI. Built for hackathon by DevFusion.
      </footer>
    </div>
  );
}
