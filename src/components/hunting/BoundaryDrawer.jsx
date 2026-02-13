import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Trash2 } from "lucide-react";

export default function BoundaryDrawer({ ground, onSave, isAdmin, onModeChange, boundaryPoints }) {
  const handleStartDrawing = () => {
    onModeChange("drawBoundary");
  };

  const handleSave = () => {
    if (boundaryPoints.length >= 3) {
      onSave(boundaryPoints);
    }
  };

  const handleCancel = () => {
    onModeChange("view");
  };

  const handleClear = () => {
    onSave([]);
  };

  if (!isAdmin) return null;

  const isDrawingMode = boundaryPoints !== undefined;

  return (
    <div className="absolute top-20 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3">
      {!isDrawingMode ? (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartDrawing}
            className="w-full gap-2 text-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            {ground?.boundary_polygon?.length > 0 ? "Upravit hranice" : "Vyznačit hranice"}
          </Button>
          {ground?.boundary_polygon?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="w-full gap-2 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Smazat hranice
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            Klikejte na mapu pro vyznačení hranic
          </p>
          <p className="text-xs text-gray-500">
            Body: {boundaryPoints.length}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={boundaryPoints.length < 3}
              className="flex-1 gap-1 text-xs bg-[#2D5016] hover:bg-[#4A7C23]"
            >
              <Check className="w-3.5 h-3.5" />
              Uložit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 gap-1 text-xs"
            >
              <X className="w-3.5 h-3.5" />
              Zrušit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}