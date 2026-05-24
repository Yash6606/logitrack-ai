"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully!");
    } catch (err: unknown) {
      toast.error("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string) => {
    setEmail(email);
    if (email.startsWith("master")) {
      setPassword("master");
    } else {
      setPassword("demo1234");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              LogiTrack AI
            </h1>
          </div>
          <p className="text-neutral-400 text-sm">Smart Supply Chain Management</p>
        </div>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-800 border-neutral-700" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-neutral-800 border-neutral-700" required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              <p className="text-xs text-neutral-500 text-center">Quick Demo Login</p>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm" className="text-xs border-neutral-700 hover:bg-neutral-800" onClick={() => quickLogin("owner@logitrack.ai")}>
                  Owner
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-neutral-700 hover:bg-neutral-800" onClick={() => quickLogin("agent1@logitrack.ai")}>
                  Agent
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-neutral-700 hover:bg-neutral-800" onClick={() => quickLogin("customer@logitrack.ai")}>
                  Customer
                </Button>
                <Button variant="outline" size="sm" className="text-xs border-neutral-700 text-purple-400 border-purple-900/50 bg-purple-950/20 hover:bg-purple-900/30" onClick={() => quickLogin("master@logitrack.ai")}>
                  Master
                </Button>
              </div>
            </div>

            <p className="text-center text-sm text-neutral-500 mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
