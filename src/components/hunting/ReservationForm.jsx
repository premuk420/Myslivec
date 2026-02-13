import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function ReservationForm({ 
  mapPoint, 
  customLatLng, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  conflictError 
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("22:00");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ date, startTime, endTime, note });
  };

  const locationName = mapPoint?.name || "Vlastní pozice (šoulačka)";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-[#2D5016]/5 rounded-xl">
        <MapPin className="w-5 h-5 text-[#2D5016]" />
        <div>
          <p className="text-sm font-semibold text-[#2D5016]">{locationName}</p>
          {mapPoint && (
            <p className="text-xs text-gray-500">
              {mapPoint.type === "high_seat" ? "Posed" : 
               mapPoint.type === "pulpit" ? "Kazatelna" : 
               mapPoint.type === "feeder" ? "Krmelec" : "Sraziště"}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Calendar className="w-3.5 h-3.5" /> Datum
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
          className="border-gray-200 focus:border-[#2D5016] focus:ring-[#2D5016]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5" /> Od
          </Label>
          <Input
            id="start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border-gray-200 focus:border-[#2D5016] focus:ring-[#2D5016]"
          />
        </div>
        <div>
          <Label htmlFor="end" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5" /> Do
          </Label>
          <Input
            id="end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border-gray-200 focus:border-[#2D5016] focus:ring-[#2D5016]"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="note" className="text-sm font-medium mb-1.5 block">Poznámka</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Např. lov černé zvěře, kontrola krmelců..."
          className="border-gray-200 focus:border-[#2D5016] focus:ring-[#2D5016] h-20 resize-none"
        />
      </div>

      {conflictError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{conflictError}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Zrušit
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#2D5016] hover:bg-[#4A7C23] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Ukládám..." : "Potvrdit rezervaci"}
        </Button>
      </div>
    </form>
  );
}