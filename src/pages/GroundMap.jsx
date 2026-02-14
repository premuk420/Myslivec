import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ArrowLeft, Loader2, MapPin, Settings, Calendar, Plus, Info, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import ReservationForm from "../components/hunting/ReservationForm"; // Ujistěte se, že tento soubor existuje
import AddPointForm from "../components/hunting/AddPointForm"; // Ujistěte se, že tento soubor existuje
import "leaflet/dist/leaflet.css";

// Pomocná komponenta pro klikání do mapy
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

  // STAVY
  const [user, setUser] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // info | reservations
  const [mode, setMode] = useState("view"); // view | addPoint | reserve
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [clickedLatLng, setClickedLatLng] = useState(null);

  // 1. Auth
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // 2. Data
  const { data: ground, isLoading: groundLoading } = useQuery({
    queryKey: ["ground", groundId],
    queryFn: () => base44.entities.HuntingGround.get(groundId),
    enabled: !!groundId,
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", groundId, user?.email],
    queryFn: async () => {
        if (!user?.email) return null;
        const ms = await base44.entities.GroundMember.filter({ ground_id: groundId, email: user.email });
        return ms[0] || null;
    },
    enabled: !!groundId && !!user,
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
        // Seřadíme od nejnovějších
        return all.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    },
    enabled: !!groundId,
  });

  // 3. Oprávnění
  const isOwner = user?.id === ground?.owner_id;
  const isAdmin = isOwner || membership?.role === 'admin';

  // 4. Mutace (Akce)
  const addPointMutation = useMutation({
    mutationFn: (data) => base44.entities.MapPoint.create({ ...data, ground_id: groundId, author_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      closeSheet();
    }
  });

  const deletePointMutation = useMutation({
    mutationFn: (id) => base44.entities.MapPoint.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapPoints"] })
  });

  const reserveMutation = useMutation({
    mutationFn: (data) => base44.entities.Reservation.create({
        ...data,
        ground_id: groundId,
        user_id: user.id,
        status: "active"
    }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
        closeSheet();
    }
  });

  // 5. Handlery
  const handleMapClick = (latlng) => {
    if (mode === "addPoint") {
        setClickedLatLng(latlng);
        setSheetOpen(true);
    }
  };

  const handlePointClick = (point) => {
    setSelectedPoint(point);
    setMode("reserve");
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setMode("view");
    setSelectedPoint(null);
    setClickedLatLng(null);
  };

  // 6. Loading check
  if (!groundId) return <div className="p-10 text-center">Chybí ID honitby.</div>;
  if (groundLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!ground) return <div className="p-10 text-center">Honitba nenalezena.</div>;

  // Příprava dat pro zobrazení
  const boundaryPoints = ground.boundary_data?.points || ground.boundary_polygon || [];
  let center = [49.8, 15.47];
  if (ground.boundary_data?.center) center = ground.boundary_data.center;
  else if (boundaryPoints.length > 0) center = boundaryPoints[0];

  return (
    <div className="h-screen w-full relative flex flex-col overflow-hidden">
      {/* --- HORNÍ LIŠTA --- */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between items-start pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Link to="/">
            <Button variant="secondary" size="icon" className="shadow-lg bg-white hover:bg-gray-100 rounded-full h-10 w-10">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
          </Link>
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-100 flex flex-col">
            <h1 className="font-bold text-gray-900 leading-none">{ground.name}</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                {isAdmin ? "Správce" : "Člen"}
            </span>
          </div>
        </div>
        
        {isAdmin && (
            <Button 
                variant="secondary" 
                size="icon" 
                className="pointer-events-auto shadow-lg bg-white hover:bg-gray-100 rounded-full h-10 w-10"
                onClick={() => navigate(`/manage/${groundId}`)}
            >
                <Settings className="w-5 h-5 text-gray-700" />
            </Button>
        )}
      </div>

      {/* --- MAPA --- */}
      <div className="flex-1 w-full h-full z-0">
        <MapContainer center={center} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          
          <MapClickHandler onClick={handleMapClick} mode={mode} />

          {/* Hranice */}
          {boundaryPoints.length > 2 && (
            <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016", weight: 3, fillOpacity: 0.1 }} />
          )}

          {/* Body */}
          {mapPoints.map((point) => (
            <Marker key={point.id} position={[point.lat, point.lng]} eventHandlers={{ click: () => handlePointClick(point) }}>
              {/* Popup po kliknutí jen pro info, akce jsou v Sheetu */}
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* --- SPODNÍ MENU --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-xl border rounded-full p-1 flex gap-1">
        <Button 
            variant={activeTab === "info" && sheetOpen && mode === "view" ? "default" : "ghost"} 
            className="rounded-full px-4 gap-2"
            onClick={() => { setSheetOpen(true); setActiveTab("info"); setMode("view"); }}
        >
            <Info className="w-4 h-4" /> <span className="hidden sm:inline">Přehled</span>
        </Button>
        
        <Button 
            variant={activeTab === "reservations" && sheetOpen ? "default" : "ghost"} 
            className="rounded-full px-4 gap-2"
            onClick={() => { setSheetOpen(true); setActiveTab("reservations"); setMode("view"); }}
        >
            <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">Rezervace</span>
        </Button>

        {isAdmin && (
            <Button 
                variant={mode === "addPoint" ? "destructive" : "ghost"} 
                className={`rounded-full px-4 gap-2 ${mode === "addPoint" ? "" : "text-green-700 hover:text-green-800 hover:bg-green-50"}`}
                onClick={() => {
                    if (mode === "addPoint") setMode("view");
                    else { setMode("addPoint"); setSheetOpen(false); } // Zavřít sheet, aby bylo vidět kam klikám
                }}
            >
                <Plus className="w-4 h-4" /> 
                <span className="hidden sm:inline">{mode === "addPoint" ? "Zrušit vkládání" : "Přidat bod"}</span>
            </Button>
        )}
      </div>

      {/* --- VYSOUVACÍ PANEL (SHEET) --- */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl pb-10">
            
            {/* 1. VARIANT: Formulář pro přidání bodu */}
            {mode === "addPoint" && clickedLatLng && (
                <div className="max-w-md mx-auto">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Nový bod na mapě</SheetTitle>
                        <SheetDescription>Vyplňte údaje o bodu na souřadnicích {clickedLatLng[0].toFixed(4)}, {clickedLatLng[1].toFixed(4)}</SheetDescription>
                    </SheetHeader>
                    <AddPointForm 
                        latLng={clickedLatLng} 
                        onSubmit={(data) => addPointMutation.mutate(data)} 
                        onCancel={closeSheet} 
                    />
                </div>
            )}

            {/* 2. VARIANT: Rezervace bodu */}
            {mode === "reserve" && selectedPoint && (
                <div className="max-w-md mx-auto">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Rezervace: {selectedPoint.name}</SheetTitle>
                        <SheetDescription>Vyberte datum a čas pro vaši rezervaci.</SheetDescription>
                    </SheetHeader>
                    {/* Zobrazení existujících rezervací pro tento bod pro kontrolu */}
                    <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                        <p className="font-semibold mb-1">Obsazeno v termínech:</p>
                        {reservations.filter(r => r.map_point_id === selectedPoint.id).length === 0 ? (
                            <p className="text-gray-500 italic">Žádné rezervace.</p>
                        ) : (
                            reservations.filter(r => r.map_point_id === selectedPoint.id).map(r => (
                                <div key={r.id} className="text-gray-600">
                                    {format(new Date(r.date), "d.M.")} {format(new Date(r.start_time), "HH:mm")} - {format(new Date(r.end_time), "HH:mm")}
                                </div>
                            ))
                        )}
                    </div>

                    <ReservationForm 
                        pointId={selectedPoint.id}
                        onSubmit={(data) => reserveMutation.mutate({ ...data, map_point_id: selectedPoint.id })}
                        onCancel={closeSheet}
                    />
                    
                    {isAdmin && (
                        <div className="mt-8 pt-4 border-t">
                            <Button variant="destructive" width="full" onClick={() => { deletePointMutation.mutate(selectedPoint.id); closeSheet(); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Smazat tento bod
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* 3. VARIANT: Tabs (Přehled / Rezervace) */}
            {mode === "view" && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl mx-auto">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="info">Informace</TabsTrigger>
                        <TabsTrigger value="reservations">Všechny rezervace</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="info" className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold">O honitbě</h3>
                            <p className="text-gray-600">{ground.description || "Bez popisu."}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded">
                                <span className="block text-2xl font-bold">{mapPoints.length}</span>
                                <span className="text-sm text-gray-500">Loveckých bodů</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <span className="block text-2xl font-bold">{reservations.length}</span>
                                <span className="text-sm text-gray-500">Aktivních rezervací</span>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="reservations">
                        <div className="space-y-2">
                            {reservations.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Zatím žádné rezervace.</p>
                            ) : (
                                reservations.map(res => {
                                    // Najdeme název bodu
                                    const pointName = mapPoints.find(p => p.id === res.map_point_id)?.name || "Neznámý bod";
                                    return (
                                        <div key={res.id} className="flex justify-between items-center p-3 border rounded bg-white">
                                            <div>
                                                <p className="font-medium">{pointName}</p>
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(res.date), "EEEE d. MMMM", { locale: cs })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline">
                                                    {format(new Date(res.start_time), "HH:mm")} - {format(new Date(res.end_time), "HH:mm")}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
}