"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock: "", sku: "", category: "", image_url: "" });
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products/");
      setProducts(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: "", description: "", price: "", stock: "", sku: "", category: "", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description, price: String(p.price), stock: String(p.stock), sku: p.sku, category: p.category, image_url: p.image_url });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, data);
        toast.success("Product updated!");
      } else {
        await api.post("/products/", data);
        toast.success("Product created!");
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (e) { toast.error("Failed to save product"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-cyan-600">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
          <DialogContent className="bg-neutral-900 border-neutral-800 max-w-lg">
            <DialogHeader>
              <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-neutral-800 border-neutral-700" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="bg-neutral-800 border-neutral-700" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editProduct ? "Update" : "Create"} Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800">
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="border-neutral-800">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-neutral-400 text-xs">{p.sku}</TableCell>
                  <TableCell><Badge variant="outline" className="border-neutral-700 text-xs">{p.category}</Badge></TableCell>
                  <TableCell className="text-right">₹{p.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.stock <= 10 ? "destructive" : "outline"} className={p.stock > 10 ? "border-neutral-700" : ""}>
                      {p.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && !loading && (
                <TableRow><TableCell colSpan={6} className="text-center text-neutral-500 py-8">No products found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
