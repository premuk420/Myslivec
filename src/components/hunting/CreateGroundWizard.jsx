import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { ChevronLeft, ChevronRight, MapPin, Save, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Pomocná komponenta pro klikání do mapy
function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

export default function CreateGroundWizard({ onComplete, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Info, 2: Mapa
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [boundary, setBoundary] = useState([]);

  const handleMapClick = (latlng) => {
    setBoundary([...boundary, [latlng.lat, latlng.lng]]);
  };

  const clearBoundary = () => setBoundary([]);

  const handleSave = async () => {
    if (boundary.length < 3) {
      toast({ variant: "destructive", title: "Chyba", description: "Vyznačte na mapě alespoň 3 body hranice." });
      return;
    }

    setLoading(true);
    try {
      // PŘÍPRAVA DAT PRO SUPABASE
      const newGround = {
        name: formData.name,
        description: formData.description,
        boundary_data: { points: boundary }, // Ukládáme jako JSON
        owner_id: user.id // <--- Tady propojujeme honitbu s tebou
      };

      const result = await base44.entities.HuntingGround.create(newGround);
      
      toast({ title: "Úspěch", description: "Honitba byla vytvořena." });
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Chyba při ukládání", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>Nová honitba - Krok {step} ze 2</CardTitle>
        <CardDescription>
          {step === 1 ? "Zadejte základní údaje o honitbě" : "Klikáním do mapy vyznačte hranice honitby"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="min-h-[400px]">
        {step === 1 ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Název honitby</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Např. MS Lesy Polička"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Popis (volitelné)</Label>
              <Input 
                id="desc" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Stručný popis revíru"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-[400px] w-full border rounded-md overflow-hidden relative">
              <MapContainer center={[49.715, 16.26]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEvents onMapClick={handleMapClick} />
                {boundary.length > 0 && <Polygon positions={boundary} color="green" />}
              </MapContainer>
              <div className="absolute top-2 right-2 z-[1000]">
                 <Button size="sm" variant="secondary" onClick={clearBoundary}>Smazat body</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">Klikněte na mapu pro přidání bodu hranice. Potřebujete alespoň 3 body.</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t p-6">
        <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(1)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Zpět
        </Button>
        
        {step === 1 ? (
          <Button disabled={!formData.name} onClick={() => setStep(2)}>
            Pokračovat na mapu <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={loading || boundary.length < 3} onClick={handleSave}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Vytvořit honitbu
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}