import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import "leaflet/dist/leaflet.css";

function BoundaryDrawer({ onPointsChange, points }) {
  useMapEvents({
    click(e) {
      onPointsChange([...points, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

export default function CreateGroundWizard({ onComplete, onCancel, user }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canProceedFromStep1 = name.trim().length > 0;
  const canProceedFromStep2 = boundaryPoints.length >= 3;

  const handleUndoLastPoint = () => {
    setBoundaryPoints((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setBoundaryPoints([]);
  };

  // Klávesová zkratka Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        handleUndoLastPoint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [boundaryPoints]);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Příprava dat (Generování kódu a středu mapy)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Výpočet středu pro rychlý náhled
      let center = [49.8, 15.47];
      if (boundaryPoints.length > 0) {
        const latSum = boundaryPoints.reduce((sum, p) => sum + p[0], 0);
        const lngSum = boundaryPoints.reduce((sum, p) => sum + p[1], 0);
        center = [latSum / boundaryPoints.length, lngSum / boundaryPoints.length];
      }

      const groundData = {
        name: name.trim(),
        description: description.trim(),
        owner_id: user.id,
        boundary_data: { 
          points: boundaryPoints,
          center: center, 
          invite_code: code
        }
      };

      // 2. Tady už NEUKLÁDÁME do DB, jen předáme data rodiči (Home.jsx)
      // await onComplete vrátí Promise, takže počkáme, až Home.jsx dodělá práci
      await onComplete(groundData);

      toast({
        title: "Úspěch",
        description: "Honitba se vytváří...",
      });
      
    } catch (error) {
      console.error("Chyba ve wizardu:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodařilo se předat data.",
      });
      // Pokud nastala chyba, vypneme loading, aby to uživatel mohl zkusit znovu
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Vytvořit novou honitbu</h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {/* Kroky */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#2D5016]" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-[#2D5016] text-white" : "bg-gray-200"}`}>1</div>
              <span className="text-sm font-medium hidden sm:inline">Základní údaje</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#2D5016]" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-[#2D5016] text-white" : "bg-gray-200"}`}>2</div>
              <span className="text-sm font-medium hidden sm:inline">Hranice revíru</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6 max-w-md mx-auto pt-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Název honitby <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Např. Honitba Dubina" className="text-lg" autoFocus />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Popis (volitelný)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krátký popis revíru" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">📍 Klikejte na mapu pro vyznačení hranic</p>
                  <p className="text-xs text-amber-700">Minimálně 3 body. Aktuálně: <strong>{boundaryPoints.length}</strong></p>
                </div>
                {boundaryPoints.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleUndoLastPoint} className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Smazat bod
                  </Button>
                )}
              </div>
              <div className="relative h-[400px] rounded-xl overflow-hidden border-2 border-gray-200">
                <MapContainer center={[49.8, 15.47]} zoom={8} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <BoundaryDrawer onPointsChange={setBoundaryPoints} points={boundaryPoints} />
                  {boundaryPoints.length > 0 && (
                    <Polygon positions={boundaryPoints} pathOptions={{ color: "#2D5016", weight: 3, fillOpacity: 0.15 }} />
                  )}
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <Button variant="outline" onClick={() => (step === 1 ? onCancel() : setStep(1))} disabled={isSubmitting}>
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Zrušit" : "Zpět"}
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!canProceedFromStep1} className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]">
              Další <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canProceedFromStep2 || isSubmitting} className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSubmitting ? "Ukládám..." : "Dokončit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}