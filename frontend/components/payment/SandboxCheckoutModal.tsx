"use client";
import React, { useState, useEffect } from "react";
import { X, Lock, Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SandboxCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  amount: number;
  description?: string;
  submitOrder: () => Promise<{ payment_id?: string }>;
}

export default function SandboxCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  description = "Secure Sandbox Payment",
  submitOrder
}: SandboxCheckoutModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [focusedField, setFocusedField] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");

  const stages = [
    "Contacting DevFusion Stripe Simulator...",
    "Authorizing payment intent with sandbox card...",
    "Settling escrow & saving order logs...",
    "Finalizing invoice details..."
  ];

  useEffect(() => {
    if (loading && loadingStage < stages.length - 1) {
      const timer = setTimeout(() => {
        setLoadingStage((prev) => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, loadingStage]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvv(value.slice(0, 3));
  };

  const handleAutofill = () => {
    // Elegant character typing simulation for autofill
    setCardNumber("4242 4242 4242 4242");
    setCardName("JOHN DOE");
    setExpiry("12/29");
    setCvv("424");
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      setErrorMsg("Please enter a valid 16-digit card number.");
      return;
    }
    if (!cardName.trim()) {
      setErrorMsg("Please enter the cardholder's name.");
      return;
    }
    if (expiry.length !== 5) {
      setErrorMsg("Please enter card expiry date (MM/YY).");
      return;
    }
    if (cvv.length !== 3) {
      setErrorMsg("Please enter a valid 3-digit CVV.");
      return;
    }

    setLoading(true);
    setLoadingStage(0);
    setErrorMsg("");

    try {
      // Trigger order creation API
      const res = await submitOrder();
      
      // Artificial delay to let Stripe loading states feel realistic & amazing
      await new Promise((r) => setTimeout(r, 3200));
      
      setPaymentId(res.payment_id || "ch_test_" + Math.random().toString(36).substr(2, 9));
      setSuccess(true);
    } catch (err: unknown) {
      setLoading(false);
      const backendError = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Payment validation failed. Please check your credentials.";
      setErrorMsg(backendError);
    }
  };

  const handleFinish = () => {
    onSuccess(paymentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        {!loading && !success && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Loading overlay */}
        {loading && !success && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
              <Lock className="absolute h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold">Stripe Sandbox Processing</h3>
              <p className="text-xs text-neutral-400 h-6 transition-all duration-300 animate-pulse">
                {stages[loadingStage]}
              </p>
            </div>
            <div className="w-48 bg-neutral-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Success overlay */}
        {success && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
              <CheckCircle className="h-10 w-10 text-green-400 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-400">Payment Succeeded</h3>
              <p className="text-sm text-neutral-400">Your transaction was completed successfully.</p>
            </div>
            
            <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-800 p-4 text-left space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-500">Merchant</span>
                <span className="text-white font-sans">LogiTrack Store</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Amount Paid</span>
                <span className="text-cyan-400 font-sans font-bold">₹{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Stripe ID</span>
                <span className="text-xs text-neutral-300">{paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Environment</span>
                <span className="text-xs text-yellow-500 font-sans border border-yellow-500/20 px-1.5 py-0.5 rounded bg-yellow-500/10">Stripe Test Mode</span>
              </div>
            </div>

            <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700">
              Complete Order
            </Button>
          </div>
        )}

        {/* Payment input screen */}
        {!loading && !success && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded bg-blue-500/10 uppercase font-semibold">Sandbox Checkout</span>
                <span className="text-xs text-neutral-500">• Stripe Simulator</span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">Payment Method</h2>
              <p className="text-xs text-neutral-400">{description}</p>
            </div>

            {/* Virtual Card Rendering */}
            <div className="relative h-44 w-full rounded-xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-5 text-white shadow-lg overflow-hidden border border-neutral-700 flex flex-col justify-between">
              {/* Card background glowing overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
              
              <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-500 tracking-wider uppercase font-semibold">LogiTrack Sandbox Card</p>
                  <div className="h-7 w-10 bg-neutral-800/80 rounded border border-neutral-700/50 flex items-center justify-center overflow-hidden">
                    <div className="grid grid-cols-2 gap-1 w-6 h-4 opacity-40">
                      <div className="bg-yellow-500 rounded-sm"></div>
                      <div className="bg-yellow-600 rounded-sm"></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold tracking-wider text-neutral-400">
                    {cardNumber.startsWith("4") ? "VISA" : "STRIPE"}
                  </span>
                </div>
              </div>

              {/* Card Number */}
              <p className="text-lg font-mono tracking-[0.25em] my-3 text-neutral-200 z-10">
                {cardNumber || "•••• •••• •••• ••••"}
              </p>

              <div className="flex justify-between items-end z-10">
                <div>
                  <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Cardholder Name</p>
                  <p className="text-xs font-mono uppercase tracking-wide truncate max-w-[180px] text-neutral-300">
                    {cardName || "YOUR NAME"}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Expires</p>
                    <p className="text-xs font-mono text-neutral-300">{expiry || "MM/YY"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-neutral-500 uppercase tracking-widest">CVV</p>
                    <p className="text-xs font-mono text-neutral-300">
                      {focusedField === "cvv" ? cvv : (cvv ? "•••" : "•••")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-neutral-400">Card Number</label>
                  <button
                    type="button"
                    onClick={handleAutofill}
                    className="text-[10px] text-blue-400 flex items-center gap-0.5 hover:underline"
                  >
                    <Zap className="h-2.5 w-2.5" /> Auto-Fill Test Card
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  onFocus={() => setFocusedField("cardNumber")}
                  onBlur={() => setFocusedField("")}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField("cardName")}
                  onBlur={() => setFocusedField("")}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">Expiration Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    onFocus={() => setFocusedField("expiry")}
                    onBlur={() => setFocusedField("")}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">CVV</label>
                  <input
                    type="password"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    onFocus={() => setFocusedField("cvv")}
                    onBlur={() => setFocusedField("")}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-sm font-semibold py-1">
                <span className="text-neutral-400">Total Order Amount</span>
                <span className="text-white text-lg">₹{amount.toLocaleString()}</span>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold h-11"
              >
                <Lock className="h-4 w-4 mr-2" /> Pay ₹{amount.toLocaleString()} via Sandbox
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple internal helper component for visual dividers
function Separator() {
  return <div className="h-[1px] bg-neutral-800 my-4" />;
}
