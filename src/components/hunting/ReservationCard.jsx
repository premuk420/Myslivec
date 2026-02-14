import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, X, Navigation } from "lucide-react"; // User ikonka
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function ReservationCard({ reservation, pointName, userName, onCancel, canCancel }) {
  const isCustom = !reservation.map_point_id && reservation.custom_gps_lat;
  const locationName = pointName || (isCustom ? "Vlastní místo na mapě" : "Neznámé místo");

  const startDate = new Date(reservation.start_time);
  const endDate = new Date(reservation.end_time);
  
  const dateLabel = format(startDate, "d. MMMM", { locale: cs }); // Zkrácené datum
  const timeLabel = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;

  return (
    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow mb-2 border-l-4 border-l-[#2D5016]">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Horní řádek: Štítky */}
            <div className="flex items-center gap-2">
              {isCustom ? (
                <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">GPS</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-green-700 bg-green-50 border-green-200">BOD</Badge>
              )}
              {/* Zobrazíme jméno autora hned nahoře nebo dole? Zde je varianta nahoře: */}
              <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto mr-2">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{userName || "..."}</span>
              </div>
            </div>

            {/* Název místa */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              {isCustom ? <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <MapPin className="w-3.5 h-3.5 text-green-700 shrink-0" />}
              <span className="truncate">{locationName}</span>
            </div>

            {/* Čas a Datum */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dateLabel}
              </div>
              <div className="flex items-center gap-1 font-medium text-gray-700">
                <Clock className="w-3 h-3" />
                {timeLabel}
              </div>
            </div>
            
            {/* Poznámka */}
            {reservation.note && (
                <div className="text-xs text-gray-500 italic mt-1 pl-2 border-l-2 border-gray-200 truncate">
                    "{reservation.note}"
                </div>
            )}
          </div>

          {/* Tlačítko zrušit */}
          {canCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(reservation.id)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2 h-8 w-8"
              title="Zrušit rezervaci"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}