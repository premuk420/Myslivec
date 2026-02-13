import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Check,
  Users,
  Settings,
  Crosshair,
  Trash2,
  Loader2,
  TreePine,
  UserMinus,
  Shield,
  UserPlus,
} from "lucide-react";
import { getTypeEmoji, getTypeLabel } from "../components/hunting/MapPointIcon";
import InviteMemberDialog from "../components/hunting/InviteMemberDialog";

export default function ManageGround() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const urlGroundId = urlParams.get("groundId");
  const [selectedGroundId, setSelectedGroundId] = useState(urlGroundId);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.email],
    queryFn: () =>
      base44.entities.GroundMember.filter({ user_email: user.email, status: "active" }),
    enabled: !!user?.email,
  });

  const adminMemberships = memberships.filter((m) => m.role === "admin");

  const { data: allGrounds = [] } = useQuery({
    queryKey: ["admin-grounds"],
    queryFn: () => base44.entities.HuntingGround.list(),
    enabled: adminMemberships.length > 0,
  });

  const adminGrounds = allGrounds.filter((g) =>
    adminMemberships.some((m) => m.ground_id === g.id)
  );

  useEffect(() => {
    if (adminGrounds.length > 0 && !selectedGroundId) {
      const newGroundId = adminGrounds[0].id;
      setSelectedGroundId(newGroundId);
      window.history.replaceState(null, "", `?groundId=${newGroundId}`);
    }
  }, [adminGrounds, selectedGroundId]);

  const handleGroundChange = (newGroundId) => {
    setSelectedGroundId(newGroundId);
    window.history.replaceState(null, "", `?groundId=${newGroundId}`);
  };

  const ground = adminGrounds.find((g) => g.id === selectedGroundId);

  const { data: groundMembers = [] } = useQuery({
    queryKey: ["ground-members", selectedGroundId],
    queryFn: async () => {
      const all = await base44.entities.GroundMember.list();
      return all.filter((m) => m.ground_id === selectedGroundId);
    },
    enabled: !!selectedGroundId,
  });

  const { data: groundPoints = [] } = useQuery({
    queryKey: ["ground-points", selectedGroundId],
    queryFn: async () => {
      const all = await base44.entities.MapPoint.list();
      return all.filter((p) => p.ground_id === selectedGroundId);
    },
    enabled: !!selectedGroundId,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => base44.entities.GroundMember.delete(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ground-members"] }),
  });

  const deletePointMutation = useMutation({
    mutationFn: (pointId) => base44.entities.MapPoint.delete(pointId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ground-points"] }),
  });

  const updateGroundMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HuntingGround.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-grounds"] }),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, permissions, role }) => {
      await base44.users.inviteUser(email, role);
      await base44.entities.GroundMember.create({
        user_email: email,
        user_name: email,
        ground_id: selectedGroundId,
        role,
        permissions,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ground-members"] });
    },
  });

  const updateMemberPermissionsMutation = useMutation({
    mutationFn: ({ memberId, permissions }) => 
      base44.entities.GroundMember.update(memberId, { permissions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ground-members"] }),
  });

  const copyCode = () => {
    if (ground?.invite_code) {
      navigator.clipboard.writeText(ground.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (adminGrounds.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Správa honiteb</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Tato sekce je určena pro správce honiteb. Pokud jste správce, vaše honitby se zde zobrazí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Správa honitby</h1>
          <p className="text-gray-500 mt-1">Nastavení, členové a body zájmu</p>
        </div>
        {adminGrounds.length > 1 && (
          <Select value={selectedGroundId} onValueChange={handleGroundChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminGrounds.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {ground && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-[#2D5016]" />
                Nastavení
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Název honitby</Label>
                <Input
                  value={ground.name}
                  onChange={(e) =>
                    updateGroundMutation.mutate({ id: ground.id, data: { name: e.target.value } })
                  }
                  className="border-gray-200"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Pozvánkový kód</Label>
                <div className="flex gap-2">
                  <Input
                    value={ground.invite_code}
                    readOnly
                    className="font-mono text-lg tracking-widest text-center bg-[#2D5016]/5 border-[#2D5016]/20"
                  />
                  <Button variant="outline" onClick={copyCode} className="shrink-0 gap-2">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Zkopírováno</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopírovat
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Sdílejte tento kód s myslivci, kteří se chtějí připojit
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-[#2D5016]" />
                Členové ({groundMembers.filter((m) => m.status === "active").length})
              </CardTitle>
              <InviteMemberDialog 
                onInvite={(data) => inviteMemberMutation.mutate(data)}
                isPending={inviteMemberMutation.isPending}
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groundMembers
                  .filter((m) => m.status === "active")
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2D5016]/10 flex items-center justify-center text-sm font-bold text-[#2D5016]">
                          {(member.user_name || member.user_email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user_name || member.user_email}
                          </p>
                          <p className="text-xs text-gray-500">{member.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        {member.permissions && member.role !== "admin" && (
                          <Select
                            value={member.permissions}
                            onValueChange={(value) =>
                              updateMemberPermissionsMutation.mutate({
                                memberId: member.id,
                                permissions: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read_only">Jen čtení</SelectItem>
                              <SelectItem value="can_reserve">Rezervace</SelectItem>
                              <SelectItem value="full_access">Plný přístup</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {member.user_email !== user?.email && member.role !== "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Odebrat člena?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Člen {member.user_name || member.user_email} bude odebrán z honitby.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Odebrat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Map Points */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crosshair className="w-5 h-5 text-[#2D5016]" />
                Body na mapě ({groundPoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groundPoints.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Zatím žádné body. Přidejte je na mapě honitby.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groundPoints.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getTypeEmoji(point.type)}</span>
                        <div>
                          <p className="text-sm font-medium">{point.name}</p>
                          <p className="text-xs text-gray-500">{getTypeLabel(point.type)}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Smazat bod?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bod "{point.name}" bude smazán z mapy.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zrušit</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePointMutation.mutate(point.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Smazat
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}