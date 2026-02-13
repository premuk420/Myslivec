import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";

const typeOptions = [
  { value: "high_seat", label: "🪵 Posed" },
  { value: "pulpit", label: "🏗️ Kazatelna" },
  { value: "feeder", label: "🌾 Krmelec" },
  { value: "meeting_point", label: "📍 Sraziště" },
];

export default function AddPointForm({ latLng, onSubmit, onCancel, isSubmitting }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("high_seat");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, type, description, gps_lat: latLng[0], gps_lng: latLng[1] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
        <MapPin className="w-5 h-5 text-blue-600" />
        <p className="text-sm text-blue-700">
          Pozice: {latLng[0].toFixed(5)}, {latLng[1].toFixed(5)}
        </p>
      </div>

      <div>
        <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">Název bodu</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Např. Kazatelna u buku"
          required
          className="border-gray-200"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-1.5 block">Typ</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="desc" className="text-sm font-medium mb-1.5 block">Popis (volitelný)</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Popis místa..."
          className="border-gray-200 h-16 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
          Zrušit
        </Button>
        <Button type="submit" className="flex-1 bg-[#2D5016] hover:bg-[#4A7C23] text-white" disabled={isSubmitting}>
          {isSubmitting ? "Ukládám..." : "Přidat bod"}
        </Button>
      </div>
    </form>
  );
}