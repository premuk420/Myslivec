import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function InviteMemberDialog({ groundId, onInvited }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    try {
      // Zde je zjednodušená logika: Vytvoříme členství i když uživatel neexistuje (pending)
      // V reálné aplikaci bychom asi posílali email
      await base44.entities.GroundMember.create({
        ground_id: groundId,
        email: email,
        role: "member",
        status: "pending" // Čeká na přijetí nebo registraci
      });
      
      toast({ title: "Pozvánka odeslána", description: `Uživatel ${email} byl přidán.` });
      setOpen(false);
      setEmail("");
      if (onInvited) onInvited();
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#2D5016]"><Plus className="w-4 h-4 mr-1"/> Pozvat</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pozvat nového člena</DialogTitle>
          <DialogDescription>
            Zadejte email uživatele, kterého chcete přidat do této honitby.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Email uživatele</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="pepa@les.cz" />
            </div>
            <Button onClick={handleInvite} disabled={loading} className="w-full bg-[#2D5016]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Odeslat pozvánku"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}