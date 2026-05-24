"use client";
import dynamic from "next/dynamic";

export const LiveTrackingMap = dynamic(() => import("./LiveTrackingMapInner"), { ssr: false });
export const DashboardMap = dynamic(() => import("./DashboardMapInner"), { ssr: false });
