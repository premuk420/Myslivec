import React, { useState } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, MapPin, Pencil, X } from "lucide-react";
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

  const canProceedFromStep1 = name.trim().length > 0;
  const canProceedFromStep2 = boundaryPoints.length >= 3;

  const handleFinish = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate center from boundary
    const latSum = boundaryPoints.reduce((sum, p) => sum + p[0], 0);
    const lngSum = boundaryPoints.reduce((sum, p) => sum + p[1], 0);
    const centerLat = latSum / boundaryPoints.length;
    const centerLng = lngSum / boundaryPoints.length;

    onComplete({
      name,
      description,
      owner_email: user.email,
      invite_code: code,
      center_lat: centerLat,
      center_lng: centerLng,
      boundary_polygon: boundaryPoints,
    });
  };

  const handleUndoLastPoint = () => {
    setBoundaryPoints(boundaryPoints.slice(0, -1));
  };

  const handleClearAll = () => {
    setBoundaryPoints([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  📍 Klikejte na mapu pro vyznačení hranic revíru
                </p>
                <p className="text-xs text-amber-700">
                  Potřebujete minimálně 3 body. Body: <strong>{boundaryPoints.length}</strong>
                </p>
              </div>

              <div className="relative h-[400px] rounded-xl overflow-hidden border-2 border-gray-200">
                <MapContainer
                  center={[49.8, 15.47]}
                  zoom={8}
                  className="h-full w-full"
                  zoomControl={true}
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

                {boundaryPoints.length > 0 && (
                  <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUndoLastPoint}
                      className="bg-white shadow-lg"
                    >
                      Zpět
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearAll}
                      className="bg-white shadow-lg text-red-600 hover:text-red-700"
                    >
                      Vymazat vše
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Zrušit" : "Zpět"}
          </Button>

          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
              className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]"
            >
              Další
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleFinish}
              disabled={!canProceedFromStep2}
              className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]"
            >
              <Check className="w-4 h-4" />
              Dokončit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}