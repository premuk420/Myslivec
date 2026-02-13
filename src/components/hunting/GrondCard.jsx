import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Users, Crosshair, ChevronRight } from "lucide-react";

const typeLabels = {
  high_seat: "Posed",
  pulpit: "Kazatelna",
  feeder: "Krmelec",
  meeting_point: "Sraziště"
};

export default function GroundCard({ ground, memberCount, pointCount, activeReservations, role }) {
  return (
    <Link to={`${createPageUrl("GroundMap")}?id=${ground.id}`}>
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden cursor-pointer">
        <div className="h-2 bg-gradient-to-r from-[#2D5016] to-[#4A7C23]" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#2D5016] transition-colors">
                {ground.name}
              </h3>
              {ground.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ground.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2D5016] group-hover:translate-x-1 transition-all" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{memberCount} členů</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-4 h-4" />
              <span>{pointCount} bodů</span>
            </div>
            {activeReservations > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                {activeReservations} aktivních
              </Badge>
            )}
          </div>
          <div className="mt-3">
            <Badge variant="outline" className="text-xs capitalize border-[#2D5016]/20 text-[#2D5016]">
              {role === "admin" ? "Správce" : "Člen"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}