import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";

export default function InviteMemberDialog({ onInvite, isPending }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState("can_reserve");
  const [role, setRole] = useState("member");

  const handleSubmit = () => {
    if (email.trim()) {
      onInvite({ email, permissions, role });
      setEmail("");
      setPermissions("can_reserve");
      setRole("member");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#2D5016] hover:bg-[#4A7C23]">
          <UserPlus className="w-4 h-4" />
          Pozvat člena
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pozvat nového člena</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="myslivec@email.cz"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Člen</SelectItem>
                <SelectItem value="admin">Správce</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Oprávnění</Label>
            <Select value={permissions} onValueChange={setPermissions}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">Jen čtení</SelectItem>
                <SelectItem value="can_reserve">Možnost rezervace</SelectItem>
                <SelectItem value="full_access">Plný přístup</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              {permissions === "read_only" && "Může pouze prohlížet honitbu a rezervace"}
              {permissions === "can_reserve" && "Může prohlížet a vytvářet rezervace"}
              {permissions === "full_access" && "Může spravovat body, členy a nastavení"}
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || isPending}
            className="w-full bg-[#2D5016] hover:bg-[#4A7C23]"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Odeslat pozvánku
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}