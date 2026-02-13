import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

const statusConfig = {
  active: { label: "Aktivní", color: "bg-green-100 text-green-700" },
  completed: { label: "Dokončena", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Zrušena", color: "bg-red-100 text-red-600" },
};

export default function ReservationCard({ reservation, onCancel, isOwner }) {
  const config = statusConfig[reservation.status] || statusConfig.active;

  return (
    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge className={`${config.color} border-0 text-xs`}>{config.label}</Badge>
              {reservation.note && (
                <span className="text-xs text-gray-500 truncate">{reservation.note}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <MapPin className="w-3.5 h-3.5 text-[#2D5016]" />
              <span className="font-medium">
                {reservation.map_point_name || "Šoulačka"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {reservation.date ? format(parseISO(reservation.date), "d. MMMM yyyy", { locale: cs }) : "—"}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {reservation.start_time} — {reservation.end_time}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {reservation.user_name || reservation.user_email}
              </div>
            </div>
          </div>

          {isOwner && reservation.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(reservation)}
              className="text-gray-400 hover:text-red-600 shrink-0"
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