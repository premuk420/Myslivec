import L from "leaflet";
import { renderToString } from "react-dom/server";
import { TreePine, Home, Tent, Crosshair, MapPin } from "lucide-react";

// Pomocná funkce pro vytvoření ikony
const createIcon = (IconComponent, color, label) => {
  const iconHtml = renderToString(
    <div className="relative flex flex-col items-center justify-center -translate-y-6">
       <div className={`p-2 rounded-full border-2 border-white shadow-md ${color} text-white`}>
          <IconComponent size={20} />
       </div>
       <div className="mt-1 px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[10px] font-bold shadow border border-gray-200 whitespace-nowrap">
         {label}
       </div>
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: "custom-leaflet-icon", // Prázdná třída, styly jsou v HTML
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Kotva dole uprostřed
    popupAnchor: [0, -40],
  });
};

export const getMapPointIcon = (type, name, isReserved) => {
  const bg = isReserved ? "bg-red-500" : "bg-[#2D5016]";
  
  switch (type) {
    case "posed": return createIcon(TreePine, bg, name);
    case "kazatelna": return createIcon(Home, bg, name);
    case "krmelec": return createIcon(Tent, "bg-amber-600", name);
    case "srub": return createIcon(Home, "bg-blue-600", name);
    case "nadhaneci_stanoviste": return createIcon(Crosshair, "bg-slate-600", name);
    default: return createIcon(MapPin, "bg-gray-500", name);
  }
};

export const getTypeLabel = (type) => {
  const map = {
    posed: "Posed",
    kazatelna: "Kazatelna",
    krmelec: "Krmelec",
    srub: "Srub / Chata",
    nadhaneci_stanoviste: "Stanoviště",
    jine: "Jiné"
  };
  return map[type] || type;
};