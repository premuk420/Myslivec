import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ArrowLeft, Loader2, Settings, Calendar, Plus, Info, MapPin, Navigation } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import ReservationForm from "../components/hunting/ReservationForm";
import AddPointForm from "../components/hunting/AddPointForm";
import { getMapPointIcon, getTypeLabel } from "../components/hunting/MapPointIcon";
import "leaflet/dist/leaflet.css";

// Klikání do mapy
function MapClickHandler({ onClick, mode }) {
  useMapEvents({
    click(e) {
      if (mode === "addPoint") onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function GroundMap() {
  const { id: paramId } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = paramId || urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // STAVY
  const [user, setUser] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState("none"); // info | list | pointDetail | reserve | addPoint
  const [mapMode, setMapMode] = useState("view"); // view | addPoint
  
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [clickedLatLng, setClickedLatLng] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // DATA
  const { data: ground, isLoading } = useQuery({
    queryKey: ["ground", groundId],
    queryFn: () => base44.entities.HuntingGround.get(groundId),
    enabled: !!groundId,
  });

  const { data: mapPoints = [] } = useQuery({
    queryKey: ["mapPoints", groundId],
    queryFn: async () => {
       const all = await base44.entities.MapPoint.list();
       return all.filter(p => p.ground_id === groundId);
    },
    enabled: !!groundId,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", groundId],
    queryFn: async () => {
        const all = await base44.entities.Reservation.filter({ ground_id: groundId, status: "active" });
        return all.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    },
    enabled: !!groundId,
  });

  const isOwner = user?.id === ground?.owner_id;
  // TODO: Zde by měla být kontrola i na roli admina ze členství, pro zjednodušení bereme majitele
  const isAdmin = isOwner; 

  // MUTACE
  const addPointMutation = useMutation({
    mutationFn: (data) => base44.entities.MapPoint.create({ ...data, ground_id: groundId, author_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setSheetOpen(false);
      setMapMode("view");
    }
  });

  const reserveMutation = useMutation({
    mutationFn: (data) => base44.entities.Reservation.create({ ...data, ground_id: groundId, user_id: user.id, status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setSheetOpen(false);
      setSheetMode("none");
    }
  });

  // HANDLERY
  const handleMapClick = (latlng) => {
    if (mapMode === "addPoint") {
        setClickedLatLng(latlng);
        setSheetMode("addPoint");
        setSheetOpen(true);
    }
  };

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    setSheetMode("pointDetail");
    setSheetOpen(true);
  };

  const openReserveForm = () => {
    setSheetMode("reserve");
  };

  // Vykreslování
  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-800" /></div>;
  if (!ground) return <div className="p-10">Honitba nenalezena</div>;

  const boundaryPoints = ground.boundary_data?.points || [];
  let center = ground.boundary_data?.center || (boundaryPoints.length > 0 ? boundaryPoints[0] : [49.8, 15.47]);

  // Rezervace pro vybraný bod
  const pointReservations = selectedPoint 
    ? reservations.filter(r => r.map_point_id === selectedPoint.id) 
    : [];

  // Je vybraný bod právě teď obsazený?
  const isPointReservedNow = (pointId) => {
    const now = new Date();
    return reservations.some(r => r.map_point_id === pointId && new Date(r.start_time) <= now && new Date(r.end_time) >= now);
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-gray-100">
      
      {/* 1. Horní lišta */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
        <Link to="/" className="pointer-events-auto">
            <Button size="icon" className="bg-white text-black hover:bg-gray-100 shadow-lg rounded-full">
                <ArrowLeft className="w-5 h-5" />
            </Button>
        </Link>
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg pointer-events-auto flex flex-col items-center">
            <h1 className="font-bold text-sm">{ground.name}</h1>
            <div className="flex gap-2 text-[10px] text-gray-500">
                <span>{mapPoints.length} bodů</span>
                <span>•</span>
                <span>{reservations.length} rezervací</span>
            </div>
        </div>
        {isAdmin ? (
             <Button size="icon" className="pointer-events-auto bg-white text-black hover:bg-gray-100 shadow-lg rounded-full" onClick={() => navigate(`/manage/${groundId}`)}>
                <Settings className="w-5 h-5" />
             </Button>
        ) : <div className="w-10" />} 
      </div>

      {/* 2. Mapa */}
      <div className="flex-1 w-full h-full z-0">
        <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapClickHandler onClick={handleMapClick} mode={mapMode} />
          
          {boundaryPoints.length > 2 && (
            <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016", weight: 2, fillOpacity: 0.1 }} />
          )}

          {mapPoints.map((point) => (
            <Marker 
                key={point.id} 
                position={[point.lat, point.lng]} 
                icon={getMapPointIcon(point.type, point.name, isPointReservedNow(point.id))}
                eventHandlers={{ click: () => handlePointClick(point) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* 3. Spodní Menu */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
         {mapMode === "view" ? (
             <div className="bg-white/95 backdrop-blur shadow-xl border rounded-full p-1.5 flex gap-1">
                <Button variant="ghost" className="rounded-full gap-2" onClick={() => { setSheetMode("info"); setSheetOpen(true); }}>
                    <Info className="w-5 h-5 text-gray-500" />
                </Button>
                <Button variant="ghost" className="rounded-full gap-2" onClick={() => { setSheetMode("list"); setSheetOpen(true); }}>
                    <Calendar className="w-5 h-5 text-gray-500" /> <span className="text-sm font-medium">Rezervace</span>
                </Button>
                {isAdmin && (
                    <Button className="rounded-full gap-2 bg-[#2D5016] hover:bg-[#203a10]" onClick={() => setMapMode("addPoint")}>
                        <Plus className="w-5 h-5" /> <span className="text-sm font-medium">Bod</span>
                    </Button>
                )}
             </div>
         ) : (
             <Button variant="destructive" className="rounded-full shadow-xl" onClick={() => setMapMode("view")}>
                 Zrušit vkládání
             </Button>
         )}
      </div>

      {/* 4. Sheet (Vysouvací panel) */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if(!o) { setSheetOpen(false); setMapMode("view"); } }}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh] overflow-y-auto">
            
            {/* DETAIL BODU & REZERVACE */}
            {sheetMode === "pointDetail" && selectedPoint && (
                <>
                    <SheetHeader className="text-left space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl font-bold">{selectedPoint.name}</SheetTitle>
                                <SheetDescription className="text-base">{getTypeLabel(selectedPoint.type)}</SheetDescription>
                            </div>
                            <div className="bg-gray-100 p-2 rounded-full">
                                <MapPin className="w-6 h-6 text-gray-600" />
                            </div>
                        </div>
                        {selectedPoint.description && (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                {selectedPoint.description}
                            </div>
                        )}
                    </SheetHeader>
                    
                    <div className="my-6 space-y-3">
                        <h4 className="font-medium text-sm text-gray-500 uppercase">Nadcházející rezervace</h4>
                        {pointReservations.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Tento bod je volný.</p>
                        ) : (
                            pointReservations.map(r => (
                                <div key={r.id} className="flex justify-between items-center text-sm p-2 border rounded">
                                    <span>{format(new Date(r.start_time), "d.M. HH:mm")}</span>
                                    <Badge variant="outline">Obsazeno</Badge>
                                </div>
                            ))
                        )}
                    </div>

                    <SheetFooter className="mt-4">
                        <Button className="w-full bg-[#2D5016] h-12 text-base" onClick={openReserveForm}>
                            Rezervovat tento bod
                        </Button>
                    </SheetFooter>
                </>
            )}

            {/* FORMULÁŘ REZERVACE */}
            {sheetMode === "reserve" && selectedPoint && (
                <>
                    <SheetHeader>
                        <SheetTitle>Nová rezervace</SheetTitle>
                        <SheetDescription>Pro bod: {selectedPoint.name}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4">
                        <ReservationForm 
                            pointId={selectedPoint.id}
                            onSubmit={(data) => reserveMutation.mutate({ ...data, map_point_id: selectedPoint.id })}
                            onCancel={() => setSheetMode("pointDetail")}
                        />
                    </div>
                </>
            )}

            {/* PŘIDÁNÍ BODU */}
            {sheetMode === "addPoint" && clickedLatLng && (
                <>
                    <SheetHeader>
                        <SheetTitle>Nový bod</SheetTitle>
                        <SheetDescription>GPS: {clickedLatLng[0].toFixed(5)}, {clickedLatLng[1].toFixed(5)}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4">
                        <AddPointForm 
                            latLng={clickedLatLng}
                            onSubmit={(data) => addPointMutation.mutate(data)}
                            onCancel={() => setSheetOpen(false)}
                        />
                    </div>
                </>
            )}

            {/* INFO */}
            {sheetMode === "info" && (
                <>
                    <SheetHeader>
                        <SheetTitle>Informace o revíru</SheetTitle>
                        <SheetDescription>{ground.name}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                        <p className="text-gray-700">{ground.description || "Bez popisu"}</p>
                        <div className="flex gap-2">
                            <a href={`https://mapy.cz/zakladni?q=${center[0]},${center[1]}`} target="_blank" rel="noreferrer" className="flex-1">
                                <Button variant="outline" className="w-full gap-2"><Navigation className="w-4 h-4"/> Navigovat</Button>
                            </a>
                        </div>
                    </div>
                </>
            )}

            {/* SEZNAM REZERVACÍ */}
            {sheetMode === "list" && (
                 <>
                    <SheetHeader>
                        <SheetTitle>Všechny rezervace</SheetTitle>
                        <SheetDescription>Přehled obsazenosti v revíru</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                        {reservations.length === 0 ? <p className="text-center text-gray-500">Prázdno</p> : 
                            reservations.map(res => (
                                <div key={res.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                        <div>
                                            {/* Zde by ideálně mělo být jméno bodu, pokud ho máme v seznamu bodů */}
                                            <p className="font-medium text-sm">
                                                {mapPoints.find(p => p.id === res.map_point_id)?.name || "Neznámý bod"}
                                            </p>
                                            <p className="text-xs text-gray-500">{format(new Date(res.start_time), "d.M. HH:mm")} - {format(new Date(res.end_time), "HH:mm")}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                 </>
            )}

        </SheetContent>
      </Sheet>
    </div>
  );
}