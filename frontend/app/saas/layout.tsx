"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, LogOut, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error("Please login to access the SaaS admin dashboard.");
        router.push("/login");
      } else if (user.role !== "saas_admin") {
        toast.error("Access denied. Master Admin privileges required.");
        router.push("/shop");
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8 rounded-2xl border border-purple-900/30 bg-purple-950/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute -inset-10 bg-gradient-to-tr from-purple-600/10 to-indigo-600/10 rounded-full blur-2xl animate-pulse" />
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin relative z-10" />
          <div className="space-y-2 relative z-10">
            <h3 className="text-white font-semibold text-lg">Verifying Admin Credentials</h3>
            <p className="text-neutral-400 text-sm">
              Establishing a secure connection to the LogiTrack SaaS Control Hub...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* SaaS Admin Left Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-purple-950/30 flex-col p-4 bg-neutral-900/30 backdrop-blur-md relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-600/5 blur-3xl rounded-full pointer-events-none" />

        <div className="mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              LogiTrack SaaS
            </span>
          </div>
          <p className="text-[10px] text-purple-400 font-mono tracking-widest uppercase mt-1">SuperAdmin Panel</p>
        </div>

        <nav className="space-y-1.5 relative z-10">
          <div className="px-3 py-2 text-xs font-semibold text-purple-400/70 uppercase tracking-wider">
            Core Controls
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-purple-950/20 border border-purple-800/30">
            <Activity className="h-4 w-4 text-purple-400" />
            Platform Control
          </div>

        </nav>

        <div className="mt-auto pt-4 border-t border-purple-950/30 relative z-10">
          <div className="flex items-center gap-3 px-3 py-2 bg-purple-950/10 border border-purple-950/30 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold shadow-md shadow-purple-500/20">
              M
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-purple-400 font-mono truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-neutral-400 hover:text-red-400 hover:bg-red-950/10 border border-transparent hover:border-red-900/30 transition-all"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main SaaS Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header bar */}
        <header className="h-14 border-b border-purple-950/30 flex items-center justify-between px-6 bg-neutral-900/20 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              LogiTrack SaaS
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
            <span>All SaaS microservices operational</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-purple-950/40 text-purple-300 border border-purple-800/40 px-2.5 py-1 rounded-full font-mono font-medium">
              Role: SYSTEM_MASTER_ADMIN
            </span>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden text-xs border-neutral-800 text-neutral-400 hover:text-white"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Child Pages Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-neutral-950 relative">
          {/* Subtle background overlay glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
