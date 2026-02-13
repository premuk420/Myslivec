import React from "react";
import L from "leaflet";

const typeConfig = {
  high_seat: { color: "#2D5016", emoji: "🪵", label: "Posed" },
  pulpit: { color: "#6B4226", emoji: "🏗️", label: "Kazatelna" },
  feeder: { color: "#C4A35A", emoji: "🌾", label: "Krmelec" },
  meeting_point: { color: "#1E40AF", emoji: "📍", label: "Sraziště" },
};

export function getMapPointIcon(type, isReserved = false) {
  const config = typeConfig[type] || typeConfig.high_seat;
  const bgColor = isReserved ? "#DC2626" : config.color;
  const borderColor = isReserved ? "#991B1B" : "#FFF";

  return L.divIcon({
    className: "custom-map-point",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${bgColor};
        border: 3px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      ">${config.emoji}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function getCustomLocationIcon() {
  return L.divIcon({
    className: "custom-location-icon",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #7C3AED;
        border: 3px solid #FFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">🎯</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function getTypeLabel(type) {
  return typeConfig[type]?.label || type;
}

export function getTypeEmoji(type) {
  return typeConfig[type]?.emoji || "📍";
}

export { typeConfig };