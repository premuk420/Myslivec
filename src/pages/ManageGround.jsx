import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Save, Trash2, Copy, Users } from "lucide-react";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet"; // Přidán Marker a Popup
import { getMapPointIcon } from "@/components/hunting/MapPointIcon"; // Přidán import ikon
import InviteMemberDialog from "@/components/hunting/InviteMemberDialog";
import { useAuth } from "@/lib/AuthContext";
import "leaflet/dist/leaflet.css";

export default function ManageGround() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [ground, setGround] = useState(null);
  const [members, setMembers] = useState([]);
  const [mapPoints, setMapPoints] = useState([]); // Stav pro body
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Honitba
      const gData = await base44.entities.HuntingGround.get(id);
      if (!gData) throw new Error("Honitba nenalezena");
      
      setGround(gData);
      setName(gData.name);
      setDesc(gData.description || "");

      // 2. Členové
      const mData = await base44.entities.GroundMember.filter({ ground_id: id });
      setMembers(mData);

      // 3. Body na mapě (PŘIDÁNO)
      const allPoints = await base44.entities.MapPoint.list();
      const pData = allPoints.filter(p => p.ground_id === id);
      setMapPoints(pData);

    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: error.message });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.HuntingGround.update(id, { name, description: desc });
      toast({ title: "Uloženo", description: "Změny byly uloženy." });
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: error.message });
    }
  };

  const copyInviteCode = () => {
     const code = ground.boundary_data?.invite_code || ground.invite_code || "CHYBA";
     navigator.clipboard.writeText(code);
     toast({ title: "Zkopírováno" });
  };

  const handleDelete = async () => {
    if (!confirm("Opravdu chcete smazat tuto honitbu? Tato akce je nevratná.")) return;
    try {
        await base44.entities.HuntingGround.delete(id);
        toast({ title: "Smazáno", description: "Honitba byla odstraněna." });
        navigate("/");
    } catch (error) {
        toast({ variant: "destructive", title: "Chyba", description: error.message });
    }
  };

  if (loading) return <div className="p-10 text-center">Načítám...</div>;
  if (!ground) return null;

  const boundaryPoints = ground.boundary_data?.points || [];
  const center = ground.boundary_data?.center || [49.8, 15.47];
  const inviteCode = ground.boundary_data?.invite_code || "---";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/map/${id}`)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold truncate">Správa: {name}</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Nastavení</TabsTrigger>
                <TabsTrigger value="members">Členové</TabsTrigger>
                <TabsTrigger value="danger" className="text-red-600">Smazat</TabsTrigger>
            </TabsList>

            {/* ZÁLOŽKA: NASTAVENÍ */}
            <TabsContent value="general" className="space-y-4 mt-4">
                <Card>
                    <CardHeader><CardTitle>Informace</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Název</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Popis</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
                        <Button onClick={handleSave} className="w-full bg-[#2D5016]">Uložit změny</Button>
                    </CardContent>
                </Card>
                
                {/* MAPA S IKONAMI */}
                <Card>
                    <CardHeader><CardTitle>Mapa revíru a body</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[400px] rounded-md overflow-hidden border border-gray-200 relative z-0">
                             <MapContainer center={center} zoom={13} className="h-full w-full" zoomControl={false} dragging={true}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                                
                                {/* Hranice */}
                                {boundaryPoints.length > 0 && (
                                    <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016", weight: 2, fillOpacity: 0.1 }} />
                                )}

                                {/* Body (Posedy, atd.) */}
                                {mapPoints.map((point) => (
                                    <Marker 
                                        key={point.id} 
                                        position={[point.lat, point.lng]}
                                        icon={getMapPointIcon(point.type, point.name, false)} // false = není rezervováno (zde neřešíme)
                                    >
                                        <Popup>
                                            <strong>{point.name}</strong><br/>
                                            {point.type}
                                        </Popup>
                                    </Marker>
                                ))}
                             </MapContainer>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Tip: Pro přidání nebo úpravu bodů jděte na hlavní mapu. Zde je pouze náhled.
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ZÁLOŽKA: ČLENOVÉ */}
            <TabsContent value="members" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Členové</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                                Kód: <code className="bg-gray-100 px-1 rounded font-bold">{inviteCode}</code>
                                <Copy className="w-3 h-3 cursor-pointer" onClick={copyInviteCode} />
                            </CardDescription>
                        </div>
                        <InviteMemberDialog groundId={ground.id} onInvited={loadData} />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {members.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 p-2 rounded-full"><Users className="w-4 h-4 text-gray-600"/></div>
                                    <span className="font-medium text-sm">{m.email}</span>
                                </div>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{m.role === 'admin' ? 'Správce' : 'Člen'}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ZÁLOŽKA: SMAZAT */}
            <TabsContent value="danger" className="mt-4">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-600">Smazat honitbu</CardTitle>
                        <CardDescription>
                            Tato akce trvale odstraní honitbu <strong>{ground.name}</strong>, všechny její body, členy i historii rezervací.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="w-full" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 mr-2" /> Trvale smazat
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}