import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, CalendarDays } from "lucide-react";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { cs } from "date-fns/locale";
import ReservationCard from "../components/hunting/ReservationCard";

export default function Reservations() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedGroundId = urlParams.get("groundId");

  const [user, setUser] = useState(null);
  const [selectedGroundId, setSelectedGroundId] = useState(preselectedGroundId || "all");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.email],
    queryFn: () => base44.entities.GroundMember.filter({ user_email: user.email, status: "active" }),
    enabled: !!user?.email,
  });

  const groundIds = memberships.map((m) => m.ground_id);

  const { data: grounds = [] } = useQuery({
    queryKey: ["grounds-for-res"],
    queryFn: async () => {
      const all = await base44.entities.HuntingGround.list();
      return all.filter((g) => groundIds.includes(g.id));
    },
    enabled: groundIds.length > 0,
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["all-reservations-list"],
    queryFn: () => base44.entities.Reservation.list("-created_date", 200),
    enabled: groundIds.length > 0,
  });

  const cancelMutation = useMutation({
    mutationFn: (reservation) =>
      base44.entities.Reservation.update(reservation.id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-reservations-list"] });
    },
  });

  const filteredReservations = reservations.filter((r) => {
    if (!groundIds.includes(r.ground_id)) return false;
    if (selectedGroundId !== "all" && r.ground_id !== selectedGroundId) return false;
    return true;
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRes = filteredReservations.filter((r) => r.date === todayStr && r.status === "active");
  const futureRes = filteredReservations.filter((r) => r.date > todayStr && r.status === "active");
  const pastRes = filteredReservations.filter(
    (r) => r.date < todayStr || r.status === "completed" || r.status === "cancelled"
  );

  const getGroundName = (id) => grounds.find((g) => g.id === id)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rezervace</h1>
          <p className="text-gray-500 mt-1">Přehled všech rezervací ve vašich honitbách</p>
        </div>
        {grounds.length > 1 && (
          <Select value={selectedGroundId} onValueChange={setSelectedGroundId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrovat honitbu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny honitby</SelectItem>
              {grounds.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" />
        </div>
      ) : (
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="today" className="gap-1.5">
              Dnes
              {todayRes.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full ml-1">
                  {todayRes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5">
              Nadcházející
              {futureRes.length > 0 && (
                <span className="bg-[#2D5016]/10 text-[#2D5016] text-xs px-1.5 py-0.5 rounded-full ml-1">
                  {futureRes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">Historie</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <ReservationList
              reservations={todayRes}
              user={user}
              onCancel={(r) => cancelMutation.mutate(r)}
              emptyText="Dnes zatím žádné rezervace."
              emptyIcon={<CalendarDays className="w-10 h-10 text-gray-300" />}
            />
          </TabsContent>

          <TabsContent value="upcoming">
            <ReservationList
              reservations={futureRes}
              user={user}
              onCancel={(r) => cancelMutation.mutate(r)}
              emptyText="Žádné nadcházející rezervace."
              emptyIcon={<Calendar className="w-10 h-10 text-gray-300" />}
            />
          </TabsContent>

          <TabsContent value="past">
            <ReservationList
              reservations={pastRes}
              user={user}
              onCancel={() => {}}
              emptyText="Žádná historie."
              emptyIcon={<Calendar className="w-10 h-10 text-gray-300" />}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReservationList({ reservations, user, onCancel, emptyText, emptyIcon }) {
  if (reservations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          {emptyIcon}
        </div>
        <p className="text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((r) => (
        <ReservationCard
          key={r.id}
          reservation={r}
          onCancel={onCancel}
          isOwner={r.user_email === user?.email}
        />
      ))}
    </div>
  );
}