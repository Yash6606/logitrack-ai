"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    api.get("/products/").then((r) => setProducts(r.data)).catch(console.error);
  }, []);

  const categories = ["all", ...new Set(products.map((p) => p.category))];
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || p.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Shop</h1>
        <p className="text-neutral-400 text-sm">Browse and order products</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-neutral-900 border-neutral-800" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} size="sm"
              className={category === c ? "bg-blue-600" : "border-neutral-700"}
              onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="bg-neutral-900 border-neutral-800 overflow-hidden group hover:border-neutral-700 transition-colors">
            <div className="h-40 bg-neutral-800 flex items-center justify-center">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-12 w-12 text-neutral-600" />
              )}
            </div>
            <CardContent className="p-4">
              <Badge variant="outline" className="border-neutral-700 text-xs mb-2">{p.category}</Badge>
              <h3 className="font-medium text-sm mb-1 line-clamp-1">{p.name}</h3>
              <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{p.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-400">₹{p.price.toLocaleString()}</span>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-xs"
                  disabled={p.stock === 0}
                  onClick={() => { addItem(p); toast.success(`${p.name} added to cart`); }}>
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {p.stock === 0 ? "Out" : "Add"}
                </Button>
              </div>
              {p.stock <= 5 && p.stock > 0 && <p className="text-xs text-orange-400 mt-1">Only {p.stock} left!</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-neutral-500 py-8">No products found</p>}
    </div>
  );
}
