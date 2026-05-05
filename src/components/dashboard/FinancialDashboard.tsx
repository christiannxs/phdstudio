import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Clock, CheckCircle2, AlertTriangle, XCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DemandRow } from "@/types/demands";
import {
  SERVICE_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  formatPrice,
} from "@/lib/demandFinancial";

const STATUS_PROD: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em produção",
  concluido: "Concluído",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
}

interface Props {
  demands: DemandRow[];
  onViewDemand?: (d: DemandRow) => void;
}

export default function FinancialDashboard({ demands, onViewDemand }: Props) {
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterArtist, setFilterArtist] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [search, setSearch] = useState("");

  const artists = useMemo(() => {
    const s = new Set(demands.map((d) => d.artist_name).filter(Boolean) as string[]);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [demands]);

  const filtered = useMemo(() => {
    return demands.filter((d) => {
      if (filterPayment !== "all" && (d.payment_status ?? "pending") !== filterPayment) return false;
      if (filterArtist !== "all" && d.artist_name !== filterArtist) return false;
      if (filterService !== "all" && d.service_type !== filterService) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !(d.artist_name ?? "").toLowerCase().includes(q) &&
          !(d.producer_name ?? "").toLowerCase().includes(q) &&
          !(d.client_name ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [demands, filterPayment, filterArtist, filterService, search]);

  // Totais apenas de demandas com valor
  const withPrice = demands.filter((d) => d.price != null);
  const totalGeral = withPrice.reduce((s, d) => s + (d.price ?? 0), 0);
  const totalPago = withPrice.filter((d) => d.payment_status === "paid").reduce((s, d) => s + (d.price ?? 0), 0);
  const totalPendente = withPrice.filter((d) => !d.payment_status || d.payment_status === "pending").reduce((s, d) => s + (d.price ?? 0), 0);
  const totalAtrasado = withPrice.filter((d) => d.payment_status === "overdue").reduce((s, d) => s + (d.price ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total geral</span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{formatPrice(totalGeral)}</p>
            <p className="text-[10px] text-muted-foreground">{withPrice.length} demandas com valor</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pago</span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPrice(totalPago)}</p>
            <p className="text-[10px] text-muted-foreground">{withPrice.filter((d) => d.payment_status === "paid").length} demandas</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pendente</span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatPrice(totalPendente)}</p>
            <p className="text-[10px] text-muted-foreground">{withPrice.filter((d) => !d.payment_status || d.payment_status === "pending").length} demandas</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Atrasado</span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-red-700 dark:text-red-400">{formatPrice(totalAtrasado)}</p>
            <p className="text-[10px] text-muted-foreground">{withPrice.filter((d) => d.payment_status === "overdue").length} demandas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, artista, produtor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:w-[260px]"
        />
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterArtist} onValueChange={setFilterArtist}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Artista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os artistas</SelectItem>
            {artists.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os serviços</SelectItem>
            {Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} demanda{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demanda</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artista</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produtor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serviço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status prod.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data pag.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Método</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma demanda encontrada com estes filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const ps = d.payment_status ?? "pending";
                  return (
                    <tr key={d.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground line-clamp-1 max-w-[180px]" title={d.name}>{d.name}</p>
                        {d.notes_finance && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1 max-w-[180px]">{d.notes_finance}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.artist_name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{d.producer_name}</td>
                      <td className="px-4 py-3">
                        {d.service_type ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {SERVICE_TYPE_LABELS[d.service_type] ?? d.service_type}
                          </span>
                        ) : <span className="text-xs text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          {STATUS_PROD[d.status] ?? d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {d.price != null ? formatPrice(d.price) : <span className="font-normal text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${PAYMENT_STATUS_STYLES[ps]}`}>
                          {PAYMENT_STATUS_LABELS[ps]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatDate(d.payment_date)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.payment_method ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.client_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {onViewDemand && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDemand(d)} title="Ver / editar">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-border/40 bg-muted/20">
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Total ({filtered.filter((d) => d.price != null).length} com valor)
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-foreground">
                    {formatPrice(filtered.reduce((s, d) => s + (d.price ?? 0), 0))}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Aviso: demandas sem valor */}
      {demands.filter((d) => d.price == null && d.status !== "aguardando").length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {demands.filter((d) => d.price == null && d.status !== "aguardando").length} demanda(s) em andamento ou concluída(s) sem valor registrado.
        </div>
      )}
    </div>
  );
}
