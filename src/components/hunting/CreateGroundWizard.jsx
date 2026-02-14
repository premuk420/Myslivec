import React, { useState } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from "lucide-react"; // Přidán Loader2
import { base44 } from "@/api/base44Client"; // Importujeme tvůj supabase klient
import { useToast } from "@/components/ui/use-toast"; // Pro hlášky
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Stav pro načítání
  const { toast } = useToast();

  const canProceedFromStep1 = name.trim().length > 0;
  const canProceedFromStep2 = boundaryPoints.length >= 3;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Generování kódu
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // 2. Výpočet středu
      const latSum = boundaryPoints.reduce((sum, p) => sum + p[0], 0);
      const lngSum = boundaryPoints.reduce((sum, p) => sum + p[1], 0);
      const centerLat = latSum / boundaryPoints.length;
      const centerLng = lngSum / boundaryPoints.length;

      // 3. PŘÍPRAVA DAT PRO SUPABASE (Odpovídá tvé SQL tabulce)
      const groundData = {
        name: name,
        description: description,
        owner_id: user.id, // Důležité: ID přihlášeného uživatele
        boundary_data: { 
          points: boundaryPoints,
          center: [centerLat, centerLng],
          invite_code: code
        }
      };

      // 4. ODESLÁNÍ DO DATABÁZE
      const result = await base44.entities.HuntingGround.create(groundData);

      toast({
        title: "Honitba vytvořena",
        description: `Honitba ${name} byla úspěšně uložena.`,
      });

      // 5. Zavolání původního onComplete pro zavření wizardu
      onComplete(result);
    } catch (error) {
      console.error("Chyba při ukládání:", error);
      toast({
        variant: "destructive",
        title: "Chyba při ukládání",
        description: error.message || "Nepodařilo se uložit data do databáze.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoLastPoint = () => {
    setBoundaryPoints(boundaryPoints.slice(0, -1));
  };

  const handleClearAll = () => {
    setBoundaryPoints([]);
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
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#2D5016]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-[#2D5016] text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">Základní údaje</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#2D5016]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-[#2D5016] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Hranice revíru</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Název honitby <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Např. Honitba Dubina"
                  className="text-lg"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Popis (volitelný)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Krátký popis revíru"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  💡 V dalším kroku vyznačíte hranice honitby na mapě
                </p>
              </div>
            </div>
          )}

{step === 2 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    📍 Klikejte na mapu pro vyznačení hranic revíru
                  </p>
                  <p className="text-xs text-amber-700">
                    Potřebujete minimálně 3 body. Aktuálně: <strong>{boundaryPoints.length}</strong>
                  </p>
                </div>
                {/* Tlačítko zpět hned u počítadla */}
                {boundaryPoints.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndoLastPoint}
                    className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Smazat poslední bod
                  </Button>
                )}
              </div>

              <div className="relative h-[400px] rounded-xl overflow-hidden border-2 border-gray-200">
                <MapContainer
                  center={[49.8, 15.47]}
                  zoom={8}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <BoundaryDrawer onPointsChange={setBoundaryPoints} points={boundaryPoints} />
                  {boundaryPoints.length > 0 && (
                    <Polygon
                      positions={boundaryPoints}
                      pathOptions={{
                        color: "#2D5016",
                        weight: 3,
                        fillOpacity: 0.15,
                        dashArray: boundaryPoints.length < 3 ? "10 5" : undefined,
                      }}
                    />
                  )}
                </MapContainer>

                {/* Plovoucí ovládací prvky na mapě */}
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                   <div className="bg-white/90 backdrop-blur p-1 rounded-lg shadow-md border flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Smazat poslední bod"
                        onClick={handleUndoLastPoint}
                        disabled={boundaryPoints.length === 0}
                        className="h-8 w-8 text-gray-600 hover:text-[#2D5016]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Vymazat vše"
                        onClick={handleClearAll}
                        disabled={boundaryPoints.length === 0}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                   </div>
                </div>
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
            className="gap-2"
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Zrušit" : "Zpět"}
          </Button>

          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
              className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]"
            >
              Další
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceedFromStep2 || isSubmitting}
              className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSubmitting ? "Ukládám..." : "Dokončit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}