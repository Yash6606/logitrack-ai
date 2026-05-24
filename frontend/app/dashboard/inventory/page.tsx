"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, History, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<{ id: string; name: string; stock: number; sku: string; category: string }[]>([]);
  const [history, setHistory] = useState<{ product_id: string; action: string; quantity: number; timestamp: string }[]>([]);

  useEffect(() => {
    api.get("/inventory/alerts?threshold=15").then((r) => setLowStock(r.data)).catch(console.error);
    api.get("/inventory/history").then((r) => setHistory(r.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory</h1>

      <Tabs defaultValue="alerts">
        <TabsList className="bg-neutral-800 border-neutral-700">
          <TabsTrigger value="alerts" className="data-[state=active]:bg-neutral-700">
            <AlertTriangle className="h-3 w-3 mr-1" /> Alerts ({lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-neutral-700">
            <History className="h-3 w-3 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((p) => (
                    <TableRow key={p.id} className="border-neutral-800">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-neutral-400">{p.sku}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="text-right font-bold">{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">
                          {p.stock <= 5 ? "Critical" : "Low Stock"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lowStock.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-neutral-500 py-8">All stock levels healthy</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800">
                    <TableHead>Product ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, i) => (
                    <TableRow key={i} className="border-neutral-800">
                      <TableCell className="font-mono text-xs">{h.product_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-neutral-700 text-xs">{h.action}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{h.quantity > 0 ? "+" : ""}{h.quantity}</TableCell>
                      <TableCell className="text-xs text-neutral-400">{new Date(h.timestamp).toLocaleString()}</TableCell>
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
