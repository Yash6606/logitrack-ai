"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, BarChart3,
  MapPin, Brain, LogOut, Menu, Bell, User, CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";

const ownerLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/map", label: "Live Map", icon: MapPin },
  { href: "/dashboard/ai", label: "AI Insights", icon: Brain },
  { href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { connected, joinRoom, onNotification } = useSocket();
  const [notifications, setNotifications] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      joinRoom("dashboard");
      joinRoom(`user:${user.uid}`);
    }
  }, [user]);

  useEffect(() => {
    const unsub = onNotification((data) => {
      setNotifications((prev) => [data.message, ...prev.slice(0, 9)]);
    });
    return unsub;
  }, []);

  const NavLinks = () => (
    <nav className="space-y-1">
      {ownerLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-neutral-800 flex-col p-4 bg-neutral-900/50">
        <div className="mb-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            LogiTrack AI
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Supply Chain Management</p>
        </div>
        <NavLinks />
        <div className="mt-auto pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2 text-neutral-400 hover:text-red-400" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" className="lg:hidden" />}
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-neutral-900 border-neutral-800 p-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                  LogiTrack AI
                </h1>
                <NavLinks />
              </SheetContent>
            </Sheet>
            <Badge variant={connected ? "default" : "destructive"} className="text-xs">
              {connected ? "● Live" : "○ Offline"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold lg:hidden">
              {user?.name?.[0] || "U"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
