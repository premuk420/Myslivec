import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  List,
  Loader2,
  Trash2,
  Users,
  MapPin,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { getMapPointIcon, getCustomLocationIcon, getTypeLabel, getTypeEmoji } from "../components/hunting/MapPointIcon";
import ReservationForm from "../components/hunting/ReservationForm";
import AddPointForm from "../components/hunting/AddPointForm";
import BoundaryDrawer from "../components/hunting/BoundaryDrawer";
import "leaflet/dist/leaflet.css";

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
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = urlParams.get("id");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("view"); // view, addPoint, reserve, reserveCustom, drawBoundary
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
      const all = await base44.entities.HuntingGround.list();
      return all.find((g) => g.id === groundId);
    },
    enabled: !!groundId,
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", groundId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.GroundMember.filter({
        ground_id: groundId,
        user_email: user.email,
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
      const all = await base44.entities.Reservation.filter({ ground_id: groundId, status: "active" });
      return all;
    },
    enabled: !!groundId,
  });

  const todayReservations = reservations.filter((r) => r.date === todayStr);
  const reservedPointIds = new Set(todayReservations.map((r) => r.map_point_id).filter(Boolean));

  const isAdmin = membership?.role === "admin";

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
    mutationFn: (polygon) =>
      base44.entities.HuntingGround.update(groundId, { boundary_polygon: polygon }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ground"] });
      setBoundaryPoints([]);
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async (data) => {
      // Check for conflicts
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
          throw new Error("Na tomto místě a v tomto čase už je rezervace. Zvolte jiný čas nebo místo.");
        }
      }

      return base44.entities.Reservation.create({
        ground_id: groundId,
        user_email: user.email,
        user_name: user.full_name || user.email,
        map_point_id: data.map_point_id || null,
        map_point_name: data.map_point_name || null,
        custom_gps_lat: data.custom_gps_lat || null,
        custom_gps_lng: data.custom_gps_lng || null,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        note: data.note,
        status: "active",
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
      setBoundaryPoints(ground?.boundary_polygon || []);
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
      map_point_name: selectedPoint?.name || null,
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

  const center = ground
    ? [ground.center_lat || 49.8, ground.center_lng || 15.47]
    : [49.8, 15.47];

  // Custom reservations with GPS
  const customReservations = todayReservations.filter(
    (r) => !r.map_point_id && r.custom_gps_lat && r.custom_gps_lng
  );

  if (!groundId) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <p className="text-gray-500">Honitba nenalezena.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative flex flex-col">
      {/* Top Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b z-[1000] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
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
          <Link to={`${createPageUrl("GroundInfo")}?id=${groundId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Přehled</span>
            </Button>
          </Link>
          <Link to={`${createPageUrl("Reservations")}?groundId=${groundId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rezervace</span>
            </Button>
          </Link>
          {isAdmin && (
            <Link to={`${createPageUrl("ManageGround")}?groundId=${groundId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Správa</span>
              </Button>
            </Link>
          )}
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
          <AutoFitBounds boundary={ground?.boundary_polygon} />

          {/* Boundary polygon */}
          {ground?.boundary_polygon && ground.boundary_polygon.length > 2 && (
            <Polygon
              positions={ground.boundary_polygon}
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
                position={[point.gps_lat, point.gps_lng]}
                icon={getMapPointIcon(point.type, isReserved)}
                eventHandlers={{
                  click: () => handlePointClick(point),
                }}
              >
                <Popup>
                  <div className="text-center min-w-[140px]">
                    <p className="font-bold text-sm">{getTypeEmoji(point.type)} {point.name}</p>
                    <p className="text-xs text-gray-500">{getTypeLabel(point.type)}</p>
                    {isReserved && (
                      <p className="text-xs text-red-600 font-medium mt-1">🔴 Obsazeno</p>
                    )}
                    {point.description && (
                      <p className="text-xs text-gray-400 mt-1">{point.description}</p>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePointMutation.mutate(point.id)}
                        className="mt-2 text-red-500 hover:text-red-700 text-xs h-7"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Smazat
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Custom reservation markers */}
          {customReservations.map((r) => (
            <Marker
              key={r.id}
              position={[r.custom_gps_lat, r.custom_gps_lng]}
              icon={getCustomLocationIcon()}
            >
              <Popup>
                <div className="text-center min-w-[130px]">
                  <p className="font-bold text-sm">🎯 Šoulačka</p>
                  <p className="text-xs text-gray-500">
                    {r.user_name} · {r.start_time}–{r.end_time}
                  </p>
                  {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Clicked position marker */}
          {clickedLatLng && (mode === "addPoint" || mode === "reserveCustom") && (
            <Marker
              position={clickedLatLng}
              icon={getCustomLocationIcon()}
            />
          )}
        </MapContainer>

        {/* Floating action buttons */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
          {mode === "view" && (
            <>
              {isAdmin && (
                <Button
                  onClick={() => setMode("addPoint")}
                  className="bg-white text-gray-800 hover:bg-gray-50 shadow-lg border gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Přidat bod
                </Button>
              )}
              <Button
                onClick={() => setMode("reserveCustom")}
                className="bg-[#2D5016] hover:bg-[#4A7C23] text-white shadow-lg gap-2"
              >
                <Crosshair className="w-4 h-4" />
                Rezervace
              </Button>
            </>
          )}
          {mode === "addPoint" && (
            <div className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium">Klikněte na mapu pro umístění bodu</span>
              <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
                Zrušit
              </Button>
            </div>
          )}
          {mode === "reserveCustom" && !clickedLatLng && (
            <div className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-purple-600 animate-pulse" />
              <span className="text-sm font-medium">Klikněte na mapu pro pozici šoulačky</span>
              <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
                Zrušit
              </Button>
            </div>
          )}
        </div>

        {/* Boundary drawer */}
        {isAdmin && (
          <BoundaryDrawer
            ground={ground}
            onSave={handleSaveBoundary}
            isAdmin={isAdmin}
            onModeChange={setMode}
            boundaryPoints={mode === "drawBoundary" ? boundaryPoints : undefined}
          />
        )}

        {/* Today's activity legend */}
        {todayReservations.length > 0 && (
          <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 max-w-[220px]">
            <p className="text-xs font-bold text-gray-700 mb-2">Dnes v revíru:</p>
            <div className="space-y-1.5">
              {todayReservations.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-gray-600 truncate">
                    {r.user_name || "?"} · {r.start_time}–{r.end_time}
                  </span>
                </div>
              ))}
              {todayReservations.length > 5 && (
                <p className="text-xs text-gray-400">+ dalších {todayReservations.length - 5}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sheet for forms */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {mode === "addPoint" && "Přidat nový bod"}
              {mode === "reserve" && "Rezervovat místo"}
              {mode === "reserveCustom" && "Rezervovat šoulačku"}
            </SheetTitle>
          </SheetHeader>

          {mode === "addPoint" && clickedLatLng && (
            <AddPointForm
              latLng={clickedLatLng}
              onSubmit={(data) => addPointMutation.mutate(data)}
              onCancel={closeSheet}
              isSubmitting={addPointMutation.isPending}
            />
          )}

          {mode === "reserve" && selectedPoint && (
            <ReservationForm
              mapPoint={selectedPoint}
              onSubmit={handleReservationSubmit}
              onCancel={closeSheet}
              isSubmitting={reserveMutation.isPending}
              conflictError={conflictError}
            />
          )}

          {mode === "reserveCustom" && clickedLatLng && (
            <ReservationForm
              customLatLng={clickedLatLng}
              onSubmit={handleReservationSubmit}
              onCancel={closeSheet}
              isSubmitting={reserveMutation.isPending}
              conflictError={conflictError}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}