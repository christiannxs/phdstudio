import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSetupStatus, useSetSetupComplete } from "@/hooks/useSetupStatus";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function Setup() {
  const navigate = useNavigate();
  const { signUpWithRole, user } = useAuth();
  const { data: setupStatus, isLoading: setupLoading, isError: setupError, refetch: refetchSetup } = useSetupStatus();
  const setSetupCompleteMutation = useSetSetupComplete();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (setupLoading || (setupStatus === undefined && !setupError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (setupStatus?.complete && !setupError) {
    return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
  }

  if (setupError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
          <CardHeader className="text-center pb-2">
            <CardDescription className="text-destructive font-semibold text-sm">
              Erro ao conectar
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-1">
              Não foi possível verificar o status da configuração. Verifique sua conexão com a internet e se o Supabase está acessível.
            </p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => refetchSetup()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUpWithRole(email, password, name, "admin");
    if (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar conta do administrador.");
      setSubmitting(false);
      return;
    }
    try {
      await setSetupCompleteMutation.mutateAsync();
      toast.success("Conta do administrador criada! Redirecionando...");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao finalizar setup.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex justify-center">
            <img src="/minha-logo.png" alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <CardDescription className="text-primary font-semibold text-sm">Configuração inicial</CardDescription>
          <p className="text-sm text-muted-foreground mt-1">
            Crie a conta do administrador. Depois, você poderá cadastrar atendentes, admins e produtores pelo painel.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-name">Nome</Label>
              <Input id="setup-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-email">E-mail</Label>
              <Input id="setup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Senha</Label>
              <Input id="setup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mín. 6 caracteres" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Criando..." : "Criar conta do administrador"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
