"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

const agentIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const destIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** Smoothly pans the map when the agent position changes */
function MapUpdater({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  const isFirstUpdate = useRef(true);

  useEffect(() => {
    if (!position) return;
    if (isFirstUpdate.current) {
      map.setView([position.lat, position.lng], map.getZoom());
      isFirstUpdate.current = false;
    } else {
      map.panTo([position.lat, position.lng], {
        animate: true,
        duration: 1,
        easeLinearity: 0.5,
      });
    }
  }, [position, map]);

  return null;
}

/** Fits the map bounds to show the full route on first load */
function RouteFitter({ routePath }: { routePath?: [number, number][] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (routePath && routePath.length >= 2 && !hasFitted.current) {
      const bounds = L.latLngBounds(routePath.map((p) => [p[0], p[1]] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
      hasFitted.current = true;
    }
  }, [routePath, map]);

  return null;
}

interface Props {
  agentPosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; address?: string } | null;
  deliveryId?: string;
  /** The full planned road route (OSRM waypoints) — shown as blue dashed line */
  routePath?: [number, number][];
  /** Trail of already-traveled positions — shown as solid cyan line */
  trail?: [number, number][];
}

export default function LiveTrackingMapInner({ agentPosition, destination, deliveryId, routePath, trail }: Props) {
  const center: [number, number] = [
    agentPosition?.lat || destination?.lat || 23.0225,
    agentPosition?.lng || destination?.lng || 72.5714,
  ];

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-neutral-800">
      <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater position={agentPosition} />
        <RouteFitter routePath={routePath} />
        {agentPosition && (
          <Marker position={[agentPosition.lat, agentPosition.lng]} icon={agentIcon}>
            <Popup>🚚 Delivery Agent<br />ID: {deliveryId}</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>📍 {destination.address || "Destination"}</Popup>
          </Marker>
        )}
        {/* Full planned road route — blue dashed line */}
        {routePath && routePath.length >= 2 && (
          <Polyline positions={routePath} color="#3b82f6" weight={4} dashArray="8 6" opacity={0.5} />
        )}
        {/* Already-traveled trail — solid cyan line */}
        {trail && trail.length >= 2 && (
          <Polyline positions={trail} color="#06b6d4" weight={4} opacity={0.85} />
        )}
      </MapContainer>
    </div>
  );
}
