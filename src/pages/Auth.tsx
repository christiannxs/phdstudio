import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn, sendPasswordReset } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    if (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const friendly = msg === "Invalid login credentials"
        ? "E-mail ou senha incorretos. Confira os dados ou use «Esqueci minha senha»."
        : msg;
      toast.error(friendly);
    }
    setSubmitting(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      toast.error("Informe o e-mail.");
      return;
    }
    setResetting(true);
    const { error } = await sendPasswordReset(resetEmail.trim());
    if (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar link.");
    } else {
      toast.success("Se o e-mail existir, você receberá um link para redefinir a senha.");
      setShowReset(false);
      setResetEmail("");
    }
    setResetting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent p-4 sm:p-6">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex justify-center">
            <img src="/minha-logo.png" alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <CardDescription className="text-primary font-semibold text-sm">DEMANDAS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
            {!showReset ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary underline pt-2 w-full text-center"
                onClick={() => setShowReset(true)}
              >
                Esqueci minha senha
              </button>
            ) : (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Informe seu e-mail para receber o link de redefinição.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-xs">E-mail para redefinir senha</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={resetting} onClick={handlePasswordReset}>
                      {resetting ? "Enviando..." : "Enviar link"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowReset(false); setResetEmail(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
