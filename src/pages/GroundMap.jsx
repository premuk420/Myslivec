import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, Popup } from "react-leaflet";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ArrowLeft, Loader2, Settings, Calendar, Plus, Info, MapPin, Crosshair } from "lucide-react";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Importy našich komponent
import ReservationForm from "../components/hunting/ReservationForm";
import AddPointForm from "../components/hunting/AddPointForm";
import ReservationCard from "../components/hunting/ReservationCard"; // <--- TADY JSME TO PŘIDALI
import { getMapPointIcon, getTypeLabel } from "../components/hunting/MapPointIcon";

// Ikonka pro custom rezervaci
const customReservationIcon = L.divIcon({
  html: `<div class="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-md"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClickHandler({ onClick, mode }) {
  useMapEvents({
    click(e) {
      if (mode === "addPoint" || mode === "reserveCustom") {
        onClick([e.latlng.lat, e.latlng.lng]);
      }
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

  const [user, setUser] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState("none"); 
  const [mapMode, setMapMode] = useState("view");
  
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

  const customReservations = reservations.filter(r => !r.map_point_id && r.custom_gps_lat);
  const isOwner = user?.id === ground?.owner_id;
  const isAdmin = isOwner; 

  // --- MUTACE ---
  const addPointMutation = useMutation({
    mutationFn: (data) => base44.entities.MapPoint.create({ ...data, ground_id: groundId, author_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setSheetOpen(false);
      setMapMode("view");
    }
  });

const reserveMutation = useMutation({
    mutationFn: async (data) => {
        // Validace před odesláním
        if (!data.date || !data.start_time || !data.end_time) {
            throw new Error("Chybí povinné údaje (datum nebo čas).");
        }

        console.log("Odesílám rezervaci:", data); // Pro kontrolu v konzoli (F12)

        return base44.entities.Reservation.create({ 
            ...data, 
            ground_id: groundId, 
            user_id: user.id, 
            status: "active",
            // Ošetření souřadnic
            custom_gps_lat: clickedLatLng ? clickedLatLng[0] : null,
            custom_gps_lng: clickedLatLng ? clickedLatLng[1] : null,
            // Pokud je vybraný bod, pošleme jeho ID, jinak null
            map_point_id: selectedPoint ? selectedPoint.id : null
        });
    },
    onSuccess: () => {
      // Úspěch
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setSheetOpen(false);
      setSheetMode("none");
      setMapMode("view");
      setClickedLatLng(null);
      setSelectedPoint(null);
      // Tady by to chtělo toast, pokud ho používáte
      // toast({ title: "Rezervace vytvořena!" }); 
    },
    onError: (error) => {
      // CHYBA - Tady to zachytíme a vypíšeme
      console.error("Chyba rezervace:", error);
      alert(`Chyba při rezervaci: ${error.message}`); // Rychlý alert, abyste hned viděl chybu
    }
  });

  // PŘIDÁNO: Mazání rezervace
  const deleteReservationMutation = useMutation({
    mutationFn: (resId) => base44.entities.Reservation.delete(resId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    }
  });

  // --- HANDLERY ---
  const handleMapClick = (latlng) => {
    if (mapMode === "addPoint") {
        setClickedLatLng(latlng);
        setSheetMode("addPoint");
        setSheetOpen(true);
    } else if (mapMode === "reserveCustom") {
        setClickedLatLng(latlng);
        setSheetMode("reserveCustom");
        setSheetOpen(true);
    }
  };

  const handlePointClick = (point) => {
    if (mapMode === "view") {
        setSelectedPoint(point);
        setSheetMode("pointDetail");
        setSheetOpen(true);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-800" /></div>;
  if (!ground) return <div className="p-10">Honitba nenalezena</div>;

  const boundaryPoints = ground.boundary_data?.points || [];
  let center = ground.boundary_data?.center || (boundaryPoints.length > 0 ? boundaryPoints[0] : [49.8, 15.47]);
  const pointReservations = selectedPoint ? reservations.filter(r => r.map_point_id === selectedPoint.id) : [];

  const isPointReservedNow = (pointId) => {
    const now = new Date();
    return reservations.some(r => r.map_point_id === pointId && new Date(r.start_time) <= now && new Date(r.end_time) >= now);
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-gray-100 overflow-hidden">
      
      {/* 1. Horní lišta */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 flex items-start justify-between pointer-events-none gap-2">
         <Link to="/" className="pointer-events-auto shrink-0">
            <Button size="icon" className="bg-white text-black hover:bg-gray-100 shadow-md rounded-full w-10 h-10">
                <ArrowLeft className="w-5 h-5" />
            </Button>
         </Link>

         <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow-md pointer-events-auto flex flex-col items-center max-w-[60%] min-w-0">
            <h1 className="font-bold text-sm truncate w-full text-center">{ground.name}</h1>
            <div className="flex gap-2 text-[10px] text-gray-500 whitespace-nowrap">
                <span>{mapPoints.length} bodů</span>
                <span>•</span>
                <span>{reservations.length} rezervací</span>
            </div>
         </div>

         <div className="shrink-0 w-10">
             {isAdmin && (
                <Button size="icon" className="pointer-events-auto bg-white text-black hover:bg-gray-100 shadow-md rounded-full w-10 h-10" onClick={() => navigate(`/manage/${groundId}`)}>
                    <Settings className="w-5 h-5" />
                </Button>
             )}
         </div>
      </div>

      {/* 2. Mapa */}
      <div className="flex-1 w-full h-full z-0">
        <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapClickHandler onClick={handleMapClick} mode={mapMode} />
          {boundaryPoints.length > 2 && <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016", weight: 2, fillOpacity: 0.1 }} />}
          {mapPoints.map((point) => (
            <Marker 
                key={point.id} 
                position={[point.lat, point.lng]} 
                icon={getMapPointIcon(point.type, point.name, isPointReservedNow(point.id))}
                eventHandlers={{ click: () => handlePointClick(point) }}
            />
          ))}
          {customReservations.map((res) => (
              <Marker key={res.id} position={[res.custom_gps_lat, res.custom_gps_lng]} icon={customReservationIcon}>
                 <Popup><div className="text-center font-bold text-xs">Rezervace (Vlastní)</div></Popup>
              </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3. Spodní Menu */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[95%]">
         {mapMode === "view" ? (
             <div className="bg-white/95 backdrop-blur shadow-xl border rounded-full p-1.5 flex gap-1 overflow-x-auto no-scrollbar">
                <Button variant="ghost" className="rounded-full px-3 gap-2 shrink-0" onClick={() => { setSheetMode("info"); setSheetOpen(true); }}>
                    <Info className="w-5 h-5 text-gray-500" />
                </Button>
                <Button variant="ghost" className="rounded-full px-3 gap-2 shrink-0" onClick={() => { setSheetMode("list"); setSheetOpen(true); }}>
                    <Calendar className="w-5 h-5 text-gray-500" /> <span className="text-sm font-medium hidden sm:inline">Seznam</span>
                </Button>
                <Button className="rounded-full px-4 gap-2 bg-amber-600 hover:bg-amber-700 shrink-0 text-white" onClick={() => { setMapMode("reserveCustom"); setSheetOpen(false); }}>
                    <Crosshair className="w-5 h-5" /> <span className="text-sm font-medium">Vybrat místo</span>
                </Button>
                {isAdmin && (
                    <Button variant="ghost" className="rounded-full px-3 gap-2 text-green-700 hover:text-green-800 hover:bg-green-50 shrink-0" onClick={() => setMapMode("addPoint")}>
                        <Plus className="w-5 h-5" /> <span className="text-sm font-medium hidden sm:inline">Bod</span>
                    </Button>
                )}
             </div>
         ) : (
             <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4">
                 <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs mb-1 backdrop-blur">
                    {mapMode === "addPoint" ? "Klikněte pro vložení bodu" : "Klikněte pro výběr místa rezervace"}
                 </div>
                 <Button variant="destructive" className="rounded-full shadow-xl px-6" onClick={() => setMapMode("view")}>Zrušit</Button>
             </div>
         )}
      </div>

      {/* 4. Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if(!o) { setSheetOpen(false); setMapMode("view"); } }}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh] overflow-y-auto bg-gray-50">
            
            {/* VLASTNÍ REZERVACE */}
            {sheetMode === "reserveCustom" && clickedLatLng && (
                <>
                    <SheetHeader><SheetTitle>Rezervace na mapě</SheetTitle><SheetDescription>GPS: {clickedLatLng[0].toFixed(5)}, {clickedLatLng[1].toFixed(5)}</SheetDescription></SheetHeader>
                    <div className="mt-4"><ReservationForm customLatLng={clickedLatLng} onSubmit={(data) => reserveMutation.mutate(data)} onCancel={() => setSheetOpen(false)} /></div>
                </>
            )}

            {/* DETAIL BODU */}
            {sheetMode === "pointDetail" && selectedPoint && (
                <>
                    <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div><SheetTitle className="text-xl font-bold">{selectedPoint.name}</SheetTitle><SheetDescription>{getTypeLabel(selectedPoint.type)}</SheetDescription></div>
                        <div className="bg-gray-100 p-2 rounded-full"><MapPin className="w-6 h-6 text-gray-600" /></div>
                    </SheetHeader>
                    {selectedPoint.description && <p className="text-sm text-gray-600 bg-white border p-3 rounded-lg mt-2">{selectedPoint.description}</p>}
                    <div className="mt-6 mb-6"><Button className="w-full bg-[#2D5016] h-12 text-base shadow-md" onClick={() => setSheetMode("reserve")}>Rezervovat tento bod</Button></div>
                    
                    <div className="space-y-3">
                        <h4 className="font-medium text-xs text-gray-400 uppercase tracking-wider">Obsazenost bodu</h4>
                        {pointReservations.length === 0 ? <p className="text-sm text-gray-400 italic">Zatím žádné rezervace.</p> : 
                            // Tady taky použijeme karty, pokud chcete, nebo necháme ten mini-seznam
                            pointReservations.map(res => (
                                <ReservationCard 
                                    key={res.id} 
                                    reservation={res} 
                                    pointName={selectedPoint.name}
                                    isOwner={false} // V detailu bodu možná nechceme rušit cizí?
                                    onCancel={() => {}} 
                                />
                            ))
                        }
                    </div>
                </>
            )}

            {/* REZERVACE BODU */}
            {sheetMode === "reserve" && selectedPoint && (
                <>
                    <SheetHeader><SheetTitle>Nová rezervace: {selectedPoint.name}</SheetTitle><SheetDescription>Vyberte čas</SheetDescription></SheetHeader>
                    <div className="mt-4"><ReservationForm pointId={selectedPoint.id} onSubmit={(data) => reserveMutation.mutate({ ...data, map_point_id: selectedPoint.id })} onCancel={() => setSheetMode("pointDetail")} /></div>
                </>
            )}

            {/* PŘIDÁNÍ BODU */}
            {sheetMode === "addPoint" && clickedLatLng && (
                <>
                    <SheetHeader><SheetTitle>Nový bod</SheetTitle><SheetDescription>GPS: {clickedLatLng[0].toFixed(5)}, {clickedLatLng[1].toFixed(5)}</SheetDescription></SheetHeader>
                    <div className="mt-4"><AddPointForm latLng={clickedLatLng} onSubmit={(data) => addPointMutation.mutate(data)} onCancel={() => setSheetOpen(false)} /></div>
                </>
            )}

            {/* SEZNAM REZERVACÍ (POUŽITÍ RESERVATION CARD) */}
            {sheetMode === "list" && (
                 <>
                    <SheetHeader><SheetTitle>Přehled rezervací</SheetTitle><SheetDescription>Všechny aktivní rezervace v revíru</SheetDescription></SheetHeader>
                    <div className="mt-4 space-y-2">
                        {reservations.length === 0 ? <p className="text-center text-gray-500 py-4">Žádné aktivní rezervace</p> : 
                            reservations.map(res => {
                                // Najdeme název bodu pro kartu
                                const pointName = mapPoints.find(p => p.id === res.map_point_id)?.name;
                                // Můžu zrušit? Ano, pokud jsem autor rezervace NEBO majitel honitby
                                const canCancel = isAdmin || res.user_id === user?.id;

                                return (
                                    <ReservationCard 
                                        key={res.id}
                                        reservation={res}
                                        pointName={pointName}
                                        canCancel={canCancel}
                                        onCancel={(id) => {
                                            if(confirm("Opravdu zrušit rezervaci?")) deleteReservationMutation.mutate(id);
                                        }}
                                    />
                                );
                            })
                        }
                    </div>
                 </>
            )}
            
            {/* INFO */}
            {sheetMode === "info" && (
                <>
                    <SheetHeader><SheetTitle>{ground.name}</SheetTitle><SheetDescription>Informace o revíru</SheetDescription></SheetHeader>
                    <div className="mt-4 text-sm text-gray-600"><p>{ground.description || "Bez popisu"}</p></div>
                </>
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
}