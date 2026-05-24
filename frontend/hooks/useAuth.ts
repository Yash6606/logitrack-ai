"use client";
import { useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch { setUser(null); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
    // Redirect based on role
    if (u.role === "saas_admin") router.push("/saas");
    else if (u.role === "business_owner") router.push("/dashboard");
    else if (u.role === "delivery_agent") router.push("/delivery");
    else router.push("/shop");
  }, [router]);

  const signup = useCallback(async (email: string, password: string, name: string, role: string, phone: string) => {
    const res = await api.post("/auth/signup", { email, password, name, role, phone });
    const { token: t, user: u } = res.data;
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
    if (u.role === "business_owner") router.push("/dashboard");
    else if (u.role === "delivery_agent") router.push("/delivery");
    else router.push("/shop");
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, token, loading, login, signup, logout };
}
