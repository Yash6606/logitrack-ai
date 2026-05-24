"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User, LogOut, Package, MapPin } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
          <Link href="/shop" className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            LogiTrack AI
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/shop" className="text-neutral-300 hover:text-white transition-colors">Shop</Link>
            <Link href="/shop/orders" className="text-neutral-300 hover:text-white transition-colors">My Orders</Link>
            <Link href="/shop/track" className="text-neutral-300 hover:text-white transition-colors flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Track
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/shop/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-500">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400 hidden sm:inline">{user.name}</span>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="outline">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
