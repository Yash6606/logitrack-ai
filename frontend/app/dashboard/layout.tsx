"use client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "business_owner") {
        if (user.role === "delivery_agent") {
          router.replace("/delivery");
        } else {
          router.replace("/shop");
        }
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "business_owner") {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-neutral-400 text-sm">Verifying authorization...</p>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
