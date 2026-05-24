"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const agentIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const orderIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface AgentMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  deliveryId?: string;
}

interface OrderMarker {
  id: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
}

interface Props {
  agents: AgentMarker[];
  orders: OrderMarker[];
}

/** Invalidates map size when agents change to ensure tiles render correctly */
function MarkersUpdater({ agents }: { agents: AgentMarker[] }) {
  const map = useMap();
  const prevCountRef = useRef(agents.length);

  useEffect(() => {
    // When agents first appear, fit bounds to show all markers
    if (agents.length > 0 && prevCountRef.current === 0) {
      const bounds = L.latLngBounds(agents.map((a) => [a.lat, a.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
    prevCountRef.current = agents.length;
  }, [agents, map]);

  useEffect(() => {
    // Ensure tiles render properly after React re-renders
    map.invalidateSize();
  });

  return null;
}

export default function DashboardMapInner({ agents, orders }: Props) {
  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-neutral-800">
      <MapContainer center={[23.0225, 72.5714]} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkersUpdater agents={agents} />
        {agents.map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={agentIcon}>
            <Popup>🚚 {a.name}<br />Delivery: {a.deliveryId || "Idle"}</Popup>
          </Marker>
        ))}
        {orders.map((o) => (
          <Marker key={o.id} position={[o.lat, o.lng]} icon={orderIcon}>
            <Popup>📦 Order {o.id}<br />{o.address}<br />Status: {o.status}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
