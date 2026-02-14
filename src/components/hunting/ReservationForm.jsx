import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, X, MapPin } from "lucide-react";
import { format, addHours } from "date-fns";

export default function ReservationForm({ pointId, customLatLng, onSubmit, onCancel }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const now = new Date();
  const startDefault = format(now, "HH:mm");
  const endDefault = format(addHours(now, 4), "HH:mm");

  const [startTime, setStartTime] = useState(startDefault);
  const [endTime, setEndTime] = useState(endDefault);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const startFull = new Date(`${date}T${startTime}:00`).toISOString();
    const endFull = new Date(`${date}T${endTime}:00`).toISOString();

    onSubmit({
      date, 
      start_time: startFull,
      end_time: endFull,
      note
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pokud je to vlastní místo, ukážeme souřadnice */}
      {customLatLng && (
        <div className="bg-amber-50 p-3 rounded-lg flex items-center gap-2 text-sm text-amber-800 border border-amber-200">
            <MapPin className="w-4 h-4" />
            <span>Vybrané místo: {customLatLng[0].toFixed(5)}, {customLatLng[1].toFixed(5)}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">Datum rezervace</Label>
        <Input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start">Od</Label>
          <Input type="time" id="start" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">Do</Label>
          <Input type="time" id="end" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Poznámka (Důležité u vlastního místa)</Label>
        <Textarea 
          id="note" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          placeholder={customLatLng ? "Např. U velkého dubu na louce..." : "Poznámka k rezervaci..."} 
          required={!!customLatLng} // U vlastního místa vyžadujeme poznámku
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Zrušit
        </Button>
        <Button type="submit" className="flex-1 bg-[#2D5016] hover:bg-[#4A7C23]" disabled={loading}>
          <CalendarCheck className="w-4 h-4 mr-2" /> {loading ? "Rezervuji..." : "Potvrdit"}
        </Button>
      </div>
    </form>
  );
}