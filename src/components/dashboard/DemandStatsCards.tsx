interface DemandStatsCardsProps {
  counts: { aguardando: number; em_producao: number; concluido: number };
  filterStatus: string;
  onStatusCardClick: (status: string) => void;
  /** Destaque no card Concluído quando a aba de concluídas está ativa (filtro por status não usa mais "concluído"). */
  completedListTabActive?: boolean;
}

export default function DemandStatsCards({
  counts,
  filterStatus,
  onStatusCardClick,
  completedListTabActive = false,
}: DemandStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <button
        type="button"
        onClick={() => onStatusCardClick("aguardando")}
        className={`min-h-[72px] sm:min-h-0 rounded-xl border bg-card p-3 sm:p-4 text-center transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${filterStatus === "aguardando" ? "ring-2 ring-[hsl(var(--warning))] border-[hsl(var(--warning))] shadow-sm" : "border-border"}`}
      >
        <p className="text-2xl font-bold text-[hsl(var(--warning))] tabular-nums">{counts.aguardando}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Aguardando</p>
      </button>
      <button
        type="button"
        onClick={() => onStatusCardClick("em_producao")}
        className={`min-h-[72px] sm:min-h-0 rounded-xl border bg-card p-3 sm:p-4 text-center transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${filterStatus === "em_producao" ? "ring-2 ring-primary border-primary shadow-sm" : "border-border"}`}
      >
        <p className="text-2xl font-bold text-primary tabular-nums">{counts.em_producao}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Em produção</p>
      </button>
      <button
        type="button"
        onClick={() => onStatusCardClick("concluido")}
        className={`min-h-[72px] sm:min-h-0 rounded-xl border bg-card p-3 sm:p-4 text-center transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${filterStatus === "concluido" || completedListTabActive ? "ring-2 ring-[hsl(var(--success))] border-[hsl(var(--success))] shadow-sm" : "border-border"}`}
      >
        <p className="text-2xl font-bold text-[hsl(var(--success))] tabular-nums">{counts.concluido}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Concluído</p>
      </button>
    </div>
  );
}
