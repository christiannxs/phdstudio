import type { DemandRow } from "@/types/demands";

export type DemandOrganization = "status" | "producer" | "deadline";

export type DemandGroupAccent =
  | "warning"
  | "primary"
  | "success"
  | "muted"
  | "destructive";

export interface DemandGroup {
  id: string;
  label: string;
  accent: DemandGroupAccent;
  /** Identificador de status quando aplicável (para ícones no UI). */
  statusKey?: "aguardando" | "em_producao" | "concluido";
  items: DemandRow[];
}

const STATUS_ORDER: DemandGroup["statusKey"][] = ["aguardando", "em_producao", "concluido"];

const STATUS_META: Record<
  NonNullable<DemandGroup["statusKey"]>,
  { label: string; accent: DemandGroupAccent }
> = {
  aguardando: { label: "Aguardando", accent: "warning" },
  em_producao: { label: "Em produção", accent: "primary" },
  concluido: { label: "Concluído", accent: "success" },
};

export function groupDemands(filtered: DemandRow[], organization: DemandOrganization): DemandGroup[] {
  if (organization === "status") {
    const byStatus = {
      aguardando: filtered.filter((d) => d.status === "aguardando"),
      em_producao: filtered.filter((d) => d.status === "em_producao"),
      concluido: filtered.filter((d) => d.status === "concluido"),
    };

    return STATUS_ORDER.map((key) => ({
      id: key,
      label: STATUS_META[key].label,
      accent: STATUS_META[key].accent,
      statusKey: key,
      items: byStatus[key],
    }));
  }

  if (organization === "producer") {
    const map = new Map<string, DemandRow[]>();
    for (const demand of filtered) {
      const k = demand.producer_name?.trim() || "Sem produtor";
      const current = map.get(k) ?? [];
      current.push(demand);
      map.set(k, current);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([producer, items]) => ({
        id: `producer-${producer}`,
        label: producer,
        accent: "muted" as const,
        items: items.sort((a, b) => {
          const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
          return aDue - bDue;
        }),
      }));
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysFromNow = startOfToday + 7 * 24 * 60 * 60 * 1000;

  const overdue: DemandRow[] = [];
  const upcoming: DemandRow[] = [];
  const future: DemandRow[] = [];
  const withoutDate: DemandRow[] = [];

  for (const demand of filtered) {
    if (!demand.due_at) {
      withoutDate.push(demand);
      continue;
    }

    const dueTime = new Date(demand.due_at).getTime();
    if (Number.isNaN(dueTime)) {
      withoutDate.push(demand);
    } else if (dueTime < startOfToday) {
      overdue.push(demand);
    } else if (dueTime <= sevenDaysFromNow) {
      upcoming.push(demand);
    } else {
      future.push(demand);
    }
  }

  const sortByDueDate = (a: DemandRow, b: DemandRow) =>
    (a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY) -
    (b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY);

  return [
    {
      id: "deadline-overdue",
      label: "Atrasadas",
      accent: "destructive",
      items: overdue.sort(sortByDueDate),
    },
    {
      id: "deadline-upcoming",
      label: "Próximos 7 dias",
      accent: "warning",
      items: upcoming.sort(sortByDueDate),
    },
    {
      id: "deadline-future",
      label: "Futuras",
      accent: "primary",
      items: future.sort(sortByDueDate),
    },
    {
      id: "deadline-without-date",
      label: "Sem data de entrega",
      accent: "muted",
      items: withoutDate,
    },
  ];
}
