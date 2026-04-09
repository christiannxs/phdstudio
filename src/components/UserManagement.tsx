import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";

const ROLE_LABELS: Record<AppRole, string> = {
  atendente: "Atendente",
  produtor: "Produtor",
  ceo: "CEO",
  admin: "Desenvolvedor",
};

const ROLES: { value: AppRole; label: string }[] = [
  { value: "atendente", label: "Atendente (sobe demandas)" },
  { value: "produtor", label: "Produtor (Mhad ou Felipe 1x)" },
  { value: "ceo", label: "CEO (acesso total)" },
  { value: "admin", label: "Desenvolvedor (admin)" },
];

interface UserRow {
  user_id: string;
  display_name: string;
  role: AppRole;
}

async function fetchUsers(): Promise<UserRow[]> {
  const { data: profiles, error: profError } = await supabase.from("profiles").select("user_id, display_name");
  if (profError) throw profError;
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("user_id, role");
  if (roleError) throw roleError;

  const roleMap = new Map(roles?.map((r) => [r.user_id, r.role as AppRole]) ?? []);
  return (profiles ?? [])
    .filter((p) => roleMap.has(p.user_id))
    .map((p) => ({ user_id: p.user_id, display_name: p.display_name, role: roleMap.get(p.user_id)! }));
}

interface UserManagementProps {
  expandedByDefault?: boolean;
}

export default function UserManagement({ expandedByDefault = false }: UserManagementProps) {
  const { createUserAsAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(expandedByDefault);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>("atendente");
  const [submitting, setSubmitting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: fetchUsers,
    enabled: expanded,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await createUserAsAdmin(email, password, name, role);
    if (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar usuário.");
    } else {
      toast.success("Usuário criado com sucesso.");
      setEmail("");
      setPassword("");
      setName("");
      setRole("atendente");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: ["producers"] });
    }
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Gerenciar usuários</h2>
              <CardDescription>Cadastrar atendentes, CEOs, produtores</CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="um-name">Nome</Label>
              <Input id="um-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: João" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="um-email">E-mail</Label>
              <Input id="um-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="um-password">Senha</Label>
              <Input id="um-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mín. 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando..." : "Cadastrar"}
              </Button>
            </div>
          </form>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : users.length > 0 ? (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Nome</th>
                    <th className="p-3 text-left font-medium">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b last:border-0">
                      <td className="p-3">{u.display_name}</td>
                      <td className="p-3">{ROLE_LABELS[u.role]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
