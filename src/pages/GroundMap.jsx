import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function GroundMap() {
  // 1. Získání ID (funguje pro /map/123 i ?id=123)
  const { id: paramId } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = paramId || urlParams.get("id");

  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // 2. Načtení dat honitby
  const { data: ground, isLoading } = useQuery({
    queryKey: ["ground", groundId],
    queryFn: async () => {
      if (!groundId) return null;
      return base44.entities.HuntingGround.get(groundId);
    },
    enabled: !!groundId,
  });

  // 3. Načtení bodů
  const { data: mapPoints = [] } = useQuery({
    queryKey: ["mapPoints", groundId],
    queryFn: async () => {
      if (!groundId) return [];
      const all = await base44.entities.MapPoint.list();
      return all.filter((p) => p.ground_id === groundId);
    },
    enabled: !!groundId,
  });

  // 4. OCHRANA PROTI BÍLÉ OBRAZOVCE (Loading State)
  if (!groundId) return <div className="p-10 text-center">Chyba: Chybí ID honitby v adrese.</div>;
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" /></div>;
  if (!ground) return <div className="p-10 text-center">Honitba nebyla nalezena.</div>;

  // 5. Příprava dat pro mapu
  const boundaryPoints = ground.boundary_data?.points || ground.boundary_polygon || [];
  
  // Střed mapy
  let center = [49.8, 15.47];
  if (ground.boundary_data?.center) {
    center = ground.boundary_data.center;
  } else if (boundaryPoints.length > 0) {
    center = boundaryPoints[0]; // Fallback na první bod
  }

  return (
    <div className="h-screen w-full relative flex flex-col">
      {/* Horní lišta - Průhledná a jednoduchá (Váš původní styl) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between items-start pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Link to="/">
            <Button variant="secondary" size="icon" className="shadow-lg bg-white hover:bg-gray-100 rounded-full h-10 w-10">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
          </Link>
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-100">
            <h1 className="font-bold text-gray-900">{ground.name}</h1>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 w-full h-full z-0">
        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* Hranice revíru */}
          {boundaryPoints.length > 2 && (
            <Polygon
              positions={boundaryPoints}
              pathOptions={{
                color: "#2D5016",
                weight: 3,
                fillColor: "#2D5016",
                fillOpacity: 0.15,
              }}
            />
          )}

          {/* Body na mapě */}
          {mapPoints.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]}>
              <Popup>
                <strong>{point.name}</strong>
                <br />
                {point.type}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}