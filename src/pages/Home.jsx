import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreePine, Plus, LogIn, Copy, Check, Loader2 } from "lucide-react";
import GroundCard from "../components/hunting/GroundCard";
import CreateGroundWizard from "../components/hunting/CreateGroundWizard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["memberships", user?.email],
    queryFn: () => base44.entities.GroundMember.filter({ user_email: user.email, status: "active" }),
    enabled: !!user?.email,
  });

  const groundIds = memberships.map((m) => m.ground_id);

  const { data: allGrounds = [], isLoading: groundsLoading } = useQuery({
    queryKey: ["grounds"],
    queryFn: () => base44.entities.HuntingGround.list(),
    enabled: memberships.length > 0,
  });

  const grounds = allGrounds.filter((g) => groundIds.includes(g.id));

  const { data: allPoints = [] } = useQuery({
    queryKey: ["all-points", groundIds],
    queryFn: () => base44.entities.MapPoint.list(),
    enabled: grounds.length > 0,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members", groundIds],
    queryFn: () => base44.entities.GroundMember.filter({ status: "active" }),
    enabled: grounds.length > 0,
  });

  const { data: allReservations = [] } = useQuery({
    queryKey: ["all-reservations"],
    queryFn: () => base44.entities.Reservation.filter({ status: "active" }),
    enabled: grounds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (groundData) => {
      const ground = await base44.entities.HuntingGround.create(groundData);
      await base44.entities.GroundMember.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        ground_id: ground.id,
        role: "admin",
        status: "active",
      });
      return ground;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["grounds"] });
      setWizardOpen(false);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const allG = await base44.entities.HuntingGround.list();
      const found = allG.find((g) => g.invite_code === joinCode.trim().toUpperCase());
      if (!found) throw new Error("Neplatný kód");

      const existingMemberships = await base44.entities.GroundMember.filter({
        user_email: user.email,
        ground_id: found.id,
      });
      if (existingMemberships.length > 0) throw new Error("Již jste členem této honitby");

      await base44.entities.GroundMember.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        ground_id: found.id,
        role: "member",
        status: "active",
      });
      return found;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["grounds"] });
      setJoinOpen(false);
      setJoinCode("");
      setJoinError("");
    },
    onError: (err) => {
      setJoinError(err.message);
    },
  });

  const isLoading = membershipsLoading || groundsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Vaše honitby
          </h1>
          <p className="text-gray-500 mt-1">
            Správa revírů a rezervace míst lovu
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                Připojit se
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Připojit se k honitbě</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Pozvánkový kód</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
                    placeholder="Zadejte kód od správce"
                    className="text-center text-lg tracking-widest uppercase"
                  />
                </div>
                {joinError && <p className="text-sm text-red-600">{joinError}</p>}
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={!joinCode.trim() || joinMutation.isPending}
                  className="w-full bg-[#2D5016] hover:bg-[#4A7C23]"
                >
                  {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Připojit se
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => setWizardOpen(true)} 
            className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]"
          >
            <Plus className="w-4 h-4" />
            Nová honitba
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" />
        </div>
      ) : grounds.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto bg-[#2D5016]/10 rounded-2xl flex items-center justify-center mb-6">
            <TreePine className="w-10 h-10 text-[#2D5016]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Zatím nemáte žádnou honitbu
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Vytvořte novou honitbu jako správce, nebo se připojte ke stávající pomocí pozvánkového kódu.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
              <LogIn className="w-4 h-4" />
              Připojit se
            </Button>
            <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]">
              <Plus className="w-4 h-4" />
              Nová honitba
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grounds.map((ground) => {
            const membership = memberships.find((m) => m.ground_id === ground.id);
            const memberCount = allMembers.filter((m) => m.ground_id === ground.id).length;
            const pointCount = allPoints.filter((p) => p.ground_id === ground.id).length;
            const activeRes = allReservations.filter((r) => r.ground_id === ground.id).length;
            return (
              <GroundCard
                key={ground.id}
                ground={ground}
                memberCount={memberCount}
                pointCount={pointCount}
                activeReservations={activeRes}
                role={membership?.role}
              />
            );
          })}
        </div>
      )}

      {/* Wizard */}
      {wizardOpen && (
        <CreateGroundWizard
          // ZMĚNA: Používáme mutateAsync, abychom počkali na dokončení uložení
          // Tím se zajistí, že Wizard nezavře okno dřív, než se vytvoří členství
          onComplete={async (data) => {
             await createMutation.mutateAsync(data);
          }}
          onCancel={() => setWizardOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}