import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Map, Calendar, Users, Crosshair, MapPin, Settings } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function GroundInfo() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const groundId = urlParams.get("id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: ground } = useQuery({
    queryKey: ["ground", groundId],
    queryFn: async () => {
      const all = await base44.entities.HuntingGround.list();
      return all.find((g) => g.id === groundId);
    },
    enabled: !!groundId,
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", groundId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.GroundMember.filter({
        ground_id: groundId,
        user_email: user.email,
        status: "active",
      });
      return ms[0] || null;
    },
    enabled: !!groundId && !!user?.email,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", groundId],
    queryFn: async () => {
      const all = await base44.entities.GroundMember.list();
      return all.filter((m) => m.ground_id === groundId && m.status === "active");
    },
    enabled: !!groundId,
  });

  const { data: mapPoints = [] } = useQuery({
    queryKey: ["mapPoints", groundId],
    queryFn: async () => {
      const all = await base44.entities.MapPoint.list();
      return all.filter((p) => p.ground_id === groundId);
    },
    enabled: !!groundId,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", groundId],
    queryFn: async () => {
      const all = await base44.entities.Reservation.filter({ ground_id: groundId });
      return all.filter((r) => r.status === "active" && new Date(r.date) >= new Date());
    },
    enabled: !!groundId,
  });

  const isAdmin = membership?.role === "admin";

  if (!ground) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  const permissionLabels = {
    read_only: "Jen čtení",
    can_reserve: "Možnost rezervace",
    full_access: "Plný přístup",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{ground.name}</h1>
            {ground.description && (
              <p className="text-gray-500 mt-1">{ground.description}</p>
            )}
          </div>
        </div>
        <Badge className="bg-[#2D5016] text-white">
          {membership?.role === "admin" ? "Správce" : "Člen"}
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to={`${createPageUrl("GroundMap")}?id=${groundId}`}>
          <Button className="w-full h-20 flex-col gap-1.5 bg-[#2D5016] hover:bg-[#4A7C23]">
            <Map className="w-5 h-5" />
            <span className="text-xs">Mapa</span>
          </Button>
        </Link>
        <Link to={`${createPageUrl("Reservations")}?groundId=${groundId}`}>
          <Button className="w-full h-20 flex-col gap-1.5 bg-white border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016]/5">
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Rezervace</span>
          </Button>
        </Link>
        {isAdmin && (
          <Link to={`${createPageUrl("ManageGround")}?groundId=${groundId}`}>
            <Button className="w-full h-20 flex-col gap-1.5 bg-white border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016]/5">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Správa</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-[#2D5016]" />
              Členové
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{members.length}</p>
            <p className="text-xs text-gray-500 mt-1">Aktivních členů honitby</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crosshair className="w-4 h-4 text-[#2D5016]" />
              Body na mapě
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{mapPoints.length}</p>
            <p className="text-xs text-gray-500 mt-1">Posed, kazatelen, krmelců</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-[#2D5016]" />
              Rezervace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{reservations.length}</p>
            <p className="text-xs text-gray-500 mt-1">Nadcházejících rezervací</p>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-[#2D5016]" />
            Seznam členů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D5016]/10 flex items-center justify-center text-sm font-bold text-[#2D5016]">
                    {(member.user_name || member.user_email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user_name || member.user_email}
                    </p>
                    <p className="text-xs text-gray-500">{member.user_email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      member.role === "admin"
                        ? "border-[#C4A35A] text-[#C4A35A]"
                        : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {member.role === "admin" ? "Správce" : "Člen"}
                  </Badge>
                  {member.permissions && (
                    <span className="text-xs text-gray-400">
                      {permissionLabels[member.permissions]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reservations */}
      {reservations.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-[#2D5016]" />
              Nadcházející rezervace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reservations.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.map_point_name || "Šoulačka"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.user_name} · {format(new Date(r.date), "d. MMMM", { locale: cs })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {r.start_time}–{r.end_time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}