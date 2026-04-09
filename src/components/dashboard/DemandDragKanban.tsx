import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { KanbanBoard, type KanbanCardModel, type KanbanColumnModel } from "@/components/ui/kanban";
import type { DemandRow, DemandStatus } from "@/types/demands";

const STATUS_COLUMNS: KanbanColumnModel<DemandStatus>[] = [
  {
    id: "aguardando",
    title: "Aguardando",
    headingClassName: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "em_producao",
    title: "Em produção",
    headingClassName: "text-primary",
  },
  {
    id: "concluido",
    title: "Concluído",
    headingClassName: "text-emerald-700 dark:text-emerald-500",
  },
];

interface DemandDragKanbanProps {
  filtered: DemandRow[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  onViewDemand?: (demand: DemandRow) => void;
  ariaLabelledBy?: string;
  onOpenCreateDialog?: (initialDueDate?: Date | null) => void;
}

export default function DemandDragKanban({
  filtered,
  onViewDemand,
  onUpdateStatus,
  onOpenCreateDialog,
  ariaLabelledBy,
}: DemandDragKanbanProps) {
  const [cards, setCards] = useState<KanbanCardModel<DemandStatus>[]>([]);
  const signatureRef = useRef("");

  const serverSignature = filtered.map((d) => `${d.id}:${d.status}`).join("|");

  useEffect(() => {
    if (serverSignature === signatureRef.current) return;
    signatureRef.current = serverSignature;
    setCards(
      filtered.map((d) => ({
        id: d.id,
        title: d.name,
        column: d.status,
      })),
    );
  }, [serverSignature, filtered]);

  const setCardsAndPersist = useCallback(
    (updater: SetStateAction<KanbanCardModel<DemandStatus>[]>) => {
      setCards((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const prevById = new Map(prev.map((c) => [c.id, c]));
        for (const c of next) {
          const p = prevById.get(c.id);
          if (p && p.column !== c.column) {
            void onUpdateStatus(c.id, c.column);
          }
        }
        return next;
      });
    },
    [onUpdateStatus],
  );

  const handleOpenCard = useCallback(
    (cardId: string) => {
      const d = filtered.find((x) => x.id === cardId);
      if (!d) return;
      onViewDemand?.(d);
    },
    [filtered, onViewDemand],
  );

  return (
    <section className="space-y-2" aria-labelledby={ariaLabelledBy}>
      <p className="text-pretty text-xs text-muted-foreground">
        Arraste os cartões entre as colunas para alterar o status no sistema. Use o ícone para abrir a demanda.
      </p>
      <KanbanBoard<DemandStatus>
        columns={STATUS_COLUMNS}
        cards={cards}
        onCardsChange={setCardsAndPersist}
        readOnly={false}
        onOpenCard={handleOpenCard}
        addCardLabel="Nova demanda"
        onRequestAdd={onOpenCreateDialog ? () => onOpenCreateDialog() : undefined}
        className="min-h-[240px]"
      />
    </section>
  );
}
