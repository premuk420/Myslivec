import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
// Závorky ZDE MUSÍ BÝT, protože export je { Button }
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// U Card jsou také pojmenované exporty
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // PŘIHLÁŠENÍ
        await base44.auth.signIn(email, password);
        toast({ title: "Úspěch", description: "Jste přihlášen." });
        window.location.href = '/'; 
      } else {
        // REGISTRACE
        await base44.auth.signUp(email, password, fullName);
        toast({ title: "Registrace úspěšná", description: "Zkontrolujte svůj email nebo se přihlaste." });
        setIsLogin(true);
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Chyba", 
        description: error.message || "Něco se pokazilo." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Přihlášení' : 'Registrace'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Vítejte zpět v aplikaci Myslivec' : 'Vytvořte si nový účet'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullname">Celé jméno</Label>
                <Input 
                  id="fullname" 
                  placeholder="Karel Novák" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="myslivec@les.cz" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Pracuji...' : (isLogin ? 'Přihlásit se' : 'Vytvořit účet')}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Nemáte účet? Zaregistrujte se' : 'Už máte účet? Přihlaste se'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}