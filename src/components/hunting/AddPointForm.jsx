import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Save, X } from "lucide-react";

export default function AddPointForm({ latLng, onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("posed"); // Defaultní hodnota
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    // Předáme data rodiči (GroundMap), který zavolá mutaci
    onSubmit({
      name,
      type,
      description,
      lat: latLng[0],
      lng: latLng[1]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3 text-sm text-gray-600">
        <MapPin className="w-4 h-4 text-[#2D5016]" />
        <span>GPS: {latLng[0].toFixed(5)}, {latLng[1].toFixed(5)}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Typ bodu</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="posed">🌲 Posed</SelectItem>
            <SelectItem value="kazatelna">🏠 Kazatelna</SelectItem>
            <SelectItem value="krmelec">🦌 Krmelec</SelectItem>
            <SelectItem value="srub">u Srub / Chata</SelectItem>
            <SelectItem value="nadhaneci_stanoviste">🎯 Nadháněcí stanoviště</SelectItem>
            <SelectItem value="jine">📍 Jiné</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Název <span className="text-red-500">*</span></Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Např. U Tří dubů" 
          required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Popis / Poznámka</Label>
        <Textarea 
          id="desc" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Stav, kapacita, atd..." 
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Zrušit
        </Button>
        <Button type="submit" className="flex-1 bg-[#2D5016] hover:bg-[#4A7C23]" disabled={loading}>
          <Save className="w-4 h-4 mr-2" /> {loading ? "Ukládám..." : "Uložit bod"}
        </Button>
      </div>
    </form>
  );
}