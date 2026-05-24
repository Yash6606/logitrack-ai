"use client";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, CreditCard, Loader2, CheckCircle, Search, MapPin, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { searchAddress, NominatimResult } from "@/lib/osrm";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import SandboxCheckoutModal from "@/components/payment/SandboxCheckoutModal";

const QUICK_ADDRESSES = [
  { address: "Navrangpura, Ahmedabad", lat: 23.0362, lng: 72.5611 },
  { address: "Satellite, Ahmedabad", lat: 23.0155, lng: 72.5270 },
  { address: "Vastrapur, Ahmedabad", lat: 23.0308, lng: 72.5294 },
  { address: "CG Road, Ahmedabad", lat: 23.0263, lng: 72.5660 },
];

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCartStore();
  const { user } = useAuth();
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [address, setAddress] = useState<{ address: string; lat: number; lng: number }>(QUICK_ADDRESSES[0]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Address search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced address search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setIsSearching(false);
    }, 400);
  }, []);

  const selectSearchResult = (result: NominatimResult) => {
    setAddress({ address: result.display_name, lat: result.lat, lng: result.lng });
    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
    toast.success("Delivery location set!");
  };

  const selectQuickAddress = (a: typeof QUICK_ADDRESSES[0]) => {
    setAddress(a);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleCheckout = () => {
    if (!user) { toast.error("Please login first"); router.push("/login"); return; }
    if (items.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  const submitOrder = async () => {
    const res = await api.post("/orders/", {
      items: items.map((i) => ({ product_id: i.product.id, product_name: i.product.name, quantity: i.quantity, price: i.product.price })),
      delivery_address: address,
    });
    return res.data;
  };

  const handlePaymentSuccess = (pId: string) => {
    setPaymentId(pId);
    setSuccess(true);
    clearCart();
    toast.success("Order placed successfully!");
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <Card className="bg-neutral-900 border-neutral-800 text-left">
          <CardContent className="pt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">Transaction ID</span><span className="font-mono text-xs">{paymentId}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Status</span><span className="text-green-400">Paid</span></div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/shop/orders")}>View Orders</Button>
          <Button className="bg-blue-600" onClick={() => { setSuccess(false); router.push("/shop"); }}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Cart ({items.length})</h1>
      {items.length === 0 ? (
        <Card className="bg-neutral-900 border-neutral-800"><CardContent className="py-12 text-center text-neutral-500">Your cart is empty.</CardContent></Card>
      ) : (
        <>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="divide-y divide-neutral-800">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between py-4 first:pt-6">
                  <div className="flex-1"><p className="font-medium text-sm">{item.product.name}</p><p className="text-sm text-neutral-400">₹{item.product.price}</p></div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 border-neutral-700" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 border-neutral-700" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    <span className="text-sm w-16 text-right">₹{(item.product.price * item.quantity).toLocaleString()}</span>
                    <Button variant="ghost" size="icon" className="text-red-400" onClick={() => removeItem(item.product.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Delivery Address — Search + Quick Picks */}
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader><CardTitle className="text-sm">Delivery Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Custom address search */}
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    id="address-search"
                    placeholder="Search any address..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                    className="pl-9 pr-9 bg-neutral-800 border-neutral-700 text-sm placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {isSearching && (
                    <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-cyan-400" />
                  )}
                </div>

                {/* Search results dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(result)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-700/50 transition-colors flex items-start gap-2 border-b border-neutral-700/50 last:border-0"
                      >
                        <MapPin className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-neutral-200 line-clamp-2">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick pick chips */}
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">Quick Pick</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADDRESSES.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => selectQuickAddress(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        address.address === a.address
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border border-neutral-700"
                      }`}
                    >
                      {a.address}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected address display */}
              <div className="flex items-start gap-2 rounded-lg bg-neutral-950/50 border border-neutral-800 p-3">
                <MapPin className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Delivering To</p>
                  <p className="text-sm text-neutral-200 mt-0.5 break-words">{address.address}</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{address.lat.toFixed(4)}, {address.lng.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-neutral-400">Subtotal</span><span>₹{total().toLocaleString()}</span></div>
              <Separator className="bg-neutral-800" />
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-blue-400">₹{total().toLocaleString()}</span></div>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600" onClick={handleCheckout}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ₹{total().toLocaleString()} via Sandbox
              </Button>
              <p className="text-xs text-neutral-500 text-center font-semibold">Demo Sandbox — prefilled test cards supported</p>
            </CardContent>
          </Card>
        </>
      )}
      
      <SandboxCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        amount={total()}
        description="Verify order items and pay securely using Sandbox Stripe Checkout."
        submitOrder={submitOrder}
      />
    </div>
  );
}
