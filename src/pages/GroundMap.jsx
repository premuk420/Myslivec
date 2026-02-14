import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from "react-leaflet";
import { Link, useParams } from "react-router-dom"; // PŘIDÁNO: useParams
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Crosshair,
  Trash2,
  MapPin,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { getMapPointIcon, getCustomLocationIcon, getTypeLabel, getTypeEmoji } from "../components/hunting/MapPointIcon";
import ReservationForm from "../components/hunting/ReservationForm";
import AddPointForm from "../components/hunting/AddPointForm";
import BoundaryDrawer from "../components/hunting/BoundaryDrawer";
import "leaflet/dist/leaflet.css";

// Pomocné komponenty mapy
function MapClickHandler({ onClick, enabled, onBoundaryClick, boundaryMode }) {
  useMapEvents({
    click(e) {
      if (boundaryMode) {
        onBoundaryClick([e.latlng.lat, e.latlng.lng]);
      } else if (enabled) {
        onClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function AutoFitBounds({ boundary }) {
  const map = useMap();
  React.useEffect(() => {
    if (boundary && boundary.length > 2) {
      const bounds = boundary.map(([lat, lng]) => [lat, lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boundary, map]);
  return null;
}

export default function GroundMap() {
  // OPRAVA: Čtení ID z cesty (/map/:id) I z query (?id=...) pro zpětnou kompatibilitu
  const { id: paramId } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = paramId || urlParams.get("id");
  
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("view");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [clickedLatLng, setClickedLatLng] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [boundaryPoints, setBoundaryPoints] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: ground } = useQuery({
    queryKey: ["ground", groundId],
    queryFn: async () => {
      // Vylepšení: místo stahování všech honiteb stáhneme jen tu jednu
      return base44.entities.HuntingGround.get(groundId);
    },
    enabled: !!groundId,
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", groundId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.GroundMember.filter({
        ground_id: groundId,
        email: user.email, // Opraveno user_email -> email
        status: "active",
      });
      return ms[0] || null;
    },
    enabled: !!groundId && !!user?.email,
  });

  const { data: mapPoints = [] } = useQuery({
    queryKey: ["mapPoints", groundId],
    queryFn: async () => {
      const all = await base44.entities.MapPoint.list();
      return all.filter((p) => p.ground_id === groundId);
    },
    enabled: !!groundId,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", groundId],
    queryFn: async () => {
      return base44.entities.Reservation.filter({ ground_id: groundId, status: "active" });
    },
    enabled: !!groundId,
  });

  const todayReservations = reservations.filter((r) => r.date === todayStr);
  const reservedPointIds = new Set(todayReservations.map((r) => r.map_point_id).filter(Boolean));

  const isAdmin = membership?.role === "admin" || (user && ground && user.id === ground.owner_id);

  const addPointMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.MapPoint.create({ ...data, ground_id: groundId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setMode("view");
      setClickedLatLng(null);
      setSheetOpen(false);
    },
  });

  const deletePointMutation = useMutation({
    mutationFn: (id) => base44.entities.MapPoint.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
    },
  });

  const updateBoundaryMutation = useMutation({
    mutationFn: async (polygon) => {
        // Musíme aktualizovat boundary_data JSON, ne starý polygon
        // Nejdřív získáme aktuální data, abychom nepřepsali zbytek
        const current = await base44.entities.HuntingGround.get(groundId);
        const newData = {
            ...current.boundary_data,
            points: polygon
        };
        return base44.entities.HuntingGround.update(groundId, { boundary_data: newData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ground"] });
      setBoundaryPoints([]);
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.map_point_id) {
        const existing = reservations.filter(
          (r) =>
            r.map_point_id === data.map_point_id &&
            r.date === data.date &&
            r.status === "active"
        );
        const hasConflict = existing.some((r) => {
          return data.startTime < r.end_time && data.endTime > r.start_time;
        });
        if (hasConflict) {
          throw new Error("Na tomto místě a v tomto čase už je rezervace.");
        }
      }

      return base44.entities.Reservation.create({
        ground_id: groundId,
        user_id: user.id, // Přidáno ID uživatele
        map_point_id: data.map_point_id || null,
        // map_point_name a user_name už v nové DB asi nejsou potřeba, ale necháme pro jistotu
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        note: data.note,
        status: "active",
        // Pro custom rezervaci
        ...(data.custom_gps_lat && {
            // Pokud tabulka reservations nemá custom_gps sloupce, musíme je přidat do SQL
            // nebo je uložit do json sloupce. Prozatím předpokládáme, že tam nejsou nebo to nevadí.
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setMode("view");
      setSelectedPoint(null);
      setClickedLatLng(null);
      setSheetOpen(false);
      setConflictError("");
    },
    onError: (err) => {
      setConflictError(err.message);
    },
  });

  const handleMapClick = (latlng) => {
    if (mode === "addPoint") {
      setClickedLatLng(latlng);
      setSheetOpen(true);
    } else if (mode === "reserveCustom") {
      setClickedLatLng(latlng);
      setSheetOpen(true);
    }
  };

  const handleBoundaryClick = (latlng) => {
    setBoundaryPoints((prev) => [...prev, latlng]);
  };

  const handleSaveBoundary = (points) => {
    updateBoundaryMutation.mutate(points);
    setMode("view");
  };

  useEffect(() => {
    if (mode === "drawBoundary") {
      // Načítáme z boundary_data.points
      setBoundaryPoints(ground?.boundary_data?.points || []);
    }
  }, [mode, ground]);

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    setMode("reserve");
    setSheetOpen(true);
    setConflictError("");
  };

  const handleReservationSubmit = (formData) => {
    const payload = {
      ...formData,
      map_point_id: selectedPoint?.id || null,
      custom_gps_lat: clickedLatLng?.[0] || null,
      custom_gps_lng: clickedLatLng?.[1] || null,
    };
    reserveMutation.mutate(payload);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedPoint(null);
    setClickedLatLng(null);
    setConflictError("");
    if (mode !== "view") setMode("view");
  };
  
  // Získání souřadnic z boundary_data
  const boundaryCoords = ground?.boundary_data?.points || ground?.boundary_polygon || [];
  const center = ground?.boundary_data?.center || (ground ? [ground.center_lat || 49.8, ground.center_lng || 15.47] : [49.8, 15.47]);

  // Custom reservations
  const customReservations = todayReservations.filter(
    (r) => !r.map_point_id && r.custom_gps_lat && r.custom_gps_lng
  );

  if (!groundId) return <div className="flex items-center justify-center h-screen bg-stone-50"><p>Chybí ID honitby.</p></div>;
  if (!ground && !mapPoints.length) return <div className="flex items-center justify-center h-screen bg-stone-50"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-screen w-full relative flex flex-col">
      {/* Top Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b z-[1000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {ground?.name || "Načítání..."}
            </h1>
            <p className="text-xs text-gray-500">
              {mapPoints.length} bodů · {todayReservations.length} dnešních rezervací
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Odkazy s ID v URL pro ManageGround a Reservations */}
          <Link to={`/manage/${groundId}`}>
             {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Správa</span>
              </Button>
             )}
          </Link>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={14}
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <MapClickHandler 
            onClick={handleMapClick} 
            enabled={mode === "addPoint" || mode === "reserveCustom"}
            onBoundaryClick={handleBoundaryClick}
            boundaryMode={mode === "drawBoundary"}
          />
          <AutoFitBounds boundary={boundaryCoords} />

          {/* Boundary polygon */}
          {boundaryCoords.length > 2 && (
            <Polygon
              positions={boundaryCoords}
              pathOptions={{ color: "#2D5016", weight: 3, fillOpacity: 0.05, dashArray: "10 6" }}
            />
          )}

          {/* Drawing boundary */}
          {mode === "drawBoundary" && boundaryPoints.length > 0 && (
            <Polygon
              positions={boundaryPoints}
              pathOptions={{ color: "#3B82F6", weight: 3, fillOpacity: 0.1, dashArray: "5 5" }}
            />
          )}

          {/* Map points */}
          {mapPoints.map((point) => {
            const isReserved = reservedPointIds.has(point.id);
            return (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]} // Opraveno gps_lat -> lat podle DB
                icon={getMapPointIcon(point.type, isReserved)}
                eventHandlers={{
                  click: () => handlePointClick(point),
                }}
              >
                <Popup>
                  <div className="text-center min-w-[140px]">
                    <p className="font-bold text-sm">{getTypeEmoji(point.type)} {point.name}</p>
                    <p className="text-xs text-gray-500">{getTypeLabel(point.type)}</p>
                    {isReserved && <p className="text-xs text-red-600 font-medium mt-1">🔴 Obsazeno</p>}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePointMutation.mutate(point.id)}
                        className="mt-2 text-red-500 hover:text-red-700 text-xs h-7"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Smazat
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating buttons */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
          {mode === "view" && (
            <>
              {isAdmin && (
                <Button onClick={() => setMode("addPoint")} className="bg-white text-gray-800 hover:bg-gray-50 shadow-lg border gap-2">
                  <Plus className="w-4 h-4" /> Přidat bod
                </Button>
              )}
              {/* Rezervace tlačítko */}
            </>
          )}
          {/* Další režimy */}
          {mode !== "view" && (
             <Button variant="secondary" onClick={() => setMode("view")}>Zrušit</Button>
          )}
        </div>

        {/* Boundary Drawer Component */}
        {isAdmin && (
            <BoundaryDrawer
                ground={ground}
                onSave={handleSaveBoundary}
                isAdmin={isAdmin}
                onModeChange={setMode}
                boundaryPoints={mode === "drawBoundary" ? boundaryPoints : undefined}
            />
        )}
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
           {/* Formuláře... */}
           {mode === "addPoint" && clickedLatLng && (
            <AddPointForm
              latLng={clickedLatLng}
              onSubmit={(data) => addPointMutation.mutate(data)}
              onCancel={closeSheet}
              isSubmitting={addPointMutation.isPending}
            />
          )}
          {/* Rezervační formuláře zde */}
        </SheetContent>
      </Sheet>
    </div>
  );
}