import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Ujistěte se, že máte Textarea, nebo použijte Input
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Save, Trash2, Copy, Users } from "lucide-react";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
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
  const [loading, setLoading] = useState(true);
  
  // Formulář
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Načtení honitby
      const gData = await base44.entities.HuntingGround.get(id);
      if (!gData) throw new Error("Honitba nenalezena");
      
      setGround(gData);
      setName(gData.name);
      setDesc(gData.description || "");

      // Načtení členů
      const mData = await base44.entities.GroundMember.filter({ ground_id: id });
      setMembers(mData);

    } catch (error) {
      toast({ variant: "destructive", title: "Chyba načítání", description: error.message });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.HuntingGround.update(id, {
        name,
        description: desc
      });
      toast({ title: "Uloženo", description: "Změny byly uloženy." });
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: error.message });
    }
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

  const copyInviteCode = () => {
     // Kód je nově schovaný v boundary_data
     const code = ground.boundary_data?.invite_code || ground.invite_code || "CHYBA";
     navigator.clipboard.writeText(code);
     toast({ title: "Zkopírováno", description: "Kód zkopírován do schránky." });
  };

  if (loading) return <div className="p-10 text-center">Načítám...</div>;
  if (!ground) return null;

  // Získání bodů pro mapu
  const boundaryPoints = ground.boundary_data?.points || [];
  const center = ground.boundary_data?.center || [49.8, 15.47];
  const inviteCode = ground.boundary_data?.invite_code || "---";

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Zpět
        </Button>
        <h1 className="text-2xl font-bold">Správa honitby: {ground.name}</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Obecné</TabsTrigger>
          <TabsTrigger value="members">Členové ({members.length})</TabsTrigger>
          <TabsTrigger value="danger" className="text-red-600">Nebezpečná zóna</TabsTrigger>
        </TabsList>

        {/* OBECNÉ NASTAVENÍ */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Základní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Název honitby</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Popis</Label>
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <Button onClick={handleSave} className="bg-[#2D5016]">
                <Save className="w-4 h-4 mr-2" /> Uložit změny
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hranice revíru</CardTitle>
              <CardDescription>Hranice lze změnit pouze vytvořením nové honitby (zatím).</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] w-full rounded-md overflow-hidden border">
                 <MapContainer center={center} zoom={11} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {boundaryPoints.length > 0 && (
                        <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016" }} />
                    )}
                 </MapContainer>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ČLENOVÉ */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Seznam členů</CardTitle>
                <CardDescription>
                   Kód pro pozvání: <strong className="text-black bg-yellow-100 px-2 py-1 rounded">{inviteCode}</strong>
                   <Button variant="ghost" size="sm" onClick={copyInviteCode}><Copy className="w-4 h-4" /></Button>
                </CardDescription>
              </div>
              <InviteMemberDialog groundId={ground.id} onInvited={loadData} />
            </CardHeader>
            <CardContent>
               <div className="space-y-2">
                 {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-full border">
                                <Users className="w-4 h-4 text-gray-500"/>
                            </div>
                            <div>
                                <p className="font-medium">{m.email}</p>
                                <p className="text-xs text-gray-500 capitalize">{m.role}</p>
                            </div>
                        </div>
                        {/* Tady by mohla být tlačítka pro vyhazov členů */}
                    </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMAZÁNÍ */}
        <TabsContent value="danger">
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">Smazat honitbu</CardTitle>
                    <CardDescription>Tato akce trvale odstraní honitbu i všechna data v ní.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-2" /> Smazat honitbu
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}