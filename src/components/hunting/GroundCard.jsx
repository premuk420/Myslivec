import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import { Users, MapPin, Calendar, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext"; // Důležité pro kontrolu majitele
import "leaflet/dist/leaflet.css";

export default function GroundCard({ ground, memberCount, pointCount, activeReservations, role }) {
  const navigate = useNavigate();
  const { user } = useAuth(); // Získáme přihlášeného uživatele

  // 1. ZJISTÍME, JESTLI JSEM MAJITEL
  // Pokud se moje ID shoduje s owner_id honitby, jsem "Super Admin"
  const isOwner = user?.id === ground.owner_id;
  
  // Právo editovat má majitel NEBO admin
  const canEdit = isOwner || role === 'admin';

  // 2. BEZPEČNÉ NAČTENÍ BODŮ Z NOVÉ DATABÁZE
  // Zkoušíme načíst z boundary_data (nové) nebo fallback na staré boundary_polygon
  const boundaryPoints = ground.boundary_data?.points || ground.boundary_polygon || [];
  
  // Výpočet středu mapy (pokud není uložen, spočítáme průměr)
  let center = [49.8, 15.47]; // Default ČR
  if (ground.boundary_data?.center) {
    center = ground.boundary_data.center;
  } else if (boundaryPoints.length > 0) {
    const latSum = boundaryPoints.reduce((sum, p) => sum + p[0], 0);
    const lngSum = boundaryPoints.reduce((sum, p) => sum + p[1], 0);
    center = [latSum / boundaryPoints.length, lngSum / boundaryPoints.length];
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-t-4 border-t-[#2D5016]">
      {/* Mapa - Náhled */}
      <div className="h-40 w-full bg-gray-100 relative">
        {boundaryPoints.length > 0 ? (
          <MapContainer 
            center={center} 
            zoom={11} 
            zoomControl={false} 
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            className="h-full w-full pointer-events-none" // Mapa je jen na koukání
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polygon
              positions={boundaryPoints}
              pathOptions={{
                color: "#2D5016",
                fillColor: "#2D5016",
                fillOpacity: 0.2,
                weight: 2
              }}
            />
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <MapPin className="w-8 h-8 opacity-20" />
            <span className="ml-2 text-sm">Bez mapy</span>
          </div>
        )}
        
        {/* Role Badge */}
        <div className="absolute top-2 right-2 z-[500]">
           {isOwner ? (
             <Badge className="bg-amber-500 hover:bg-amber-600">Majitel</Badge>
           ) : (
             <Badge variant={role === 'admin' ? "default" : "secondary"}>
               {role === 'admin' ? 'Správce' : 'Člen'}
             </Badge>
           )}
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start">
          <span className="truncate text-xl">{ground.name}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-2 space-y-4">
        {ground.description && (
          <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">
            {ground.description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-gray-50 p-2 rounded-lg">
            <Users className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <span className="font-bold block">{memberCount}</span>
            <span className="text-xs text-gray-500">Členů</span>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <MapPin className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <span className="font-bold block">{pointCount}</span>
            <span className="text-xs text-gray-500">Bodů</span>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-amber-600" />
            <span className="font-bold block">{activeReservations}</span>
            <span className="text-xs text-gray-500">Rezervací</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex gap-2">
        {canEdit && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(`/manage/${ground.id}`)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Spravovat
          </Button>
        )}
        <Button 
          className="flex-1 bg-[#2D5016] hover:bg-[#4A7C23]"
          onClick={() => navigate(`/map/${ground.id}`)}
        >
          Mapa
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}