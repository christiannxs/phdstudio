import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import CreateDemandDialog from "@/components/CreateDemandDialog";
import { Filter, Plus } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "all", label: "Todos os períodos" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
] as const;

interface DemandFiltersProps {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterProducer: string;
  setFilterProducer: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  producers: string[];
  showFilters: boolean;
  showCreateButton: boolean;
  onCreated: () => void;
  /** Quando informado, o botão "Nova Demanda" chama este callback em vez de renderizar o dialog (dialog controlado pelo pai). */
  onOpenCreateDialog?: (initialDueDate?: Date | null) => void;
}

export default function DemandFilters({
  filterStatus,
  setFilterStatus,
  filterProducer,
  setFilterProducer,
  dateFilter,
  setDateFilter,
  producers,
  showFilters,
  showCreateButton,
  onCreated,
  onOpenCreateDialog,
}: DemandFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[160px] min-h-[44px] sm:min-h-0">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showFilters && (
            <>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[150px] min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_producao">Em produção</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProducer} onValueChange={setFilterProducer}>
                <SelectTrigger className="w-full sm:w-[150px] min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Produtor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtores</SelectItem>
                  {producers.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {showCreateButton && (
            <div className="w-full sm:w-auto sm:ml-2">
              {onOpenCreateDialog ? (
                <Button onClick={() => onOpenCreateDialog()}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Demanda
                </Button>
              ) : (
                <CreateDemandDialog onCreated={onCreated} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
