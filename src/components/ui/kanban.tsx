import { type Dispatch, type DragEvent, type SetStateAction, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type KanbanCardModel<TColumn extends string = string> = {
  id: string;
  title: string;
  column: TColumn;
};

export type KanbanColumnModel<TColumn extends string = string> = {
  id: TColumn;
  title: string;
  headingClassName?: string;
};

export type KanbanBoardProps<TColumn extends string> = {
  columns: KanbanColumnModel<TColumn>[];
  cards: KanbanCardModel<TColumn>[];
  onCardsChange: Dispatch<SetStateAction<KanbanCardModel<TColumn>[]>>;
  /** Sem arrastar (somente leitura). */
  readOnly?: boolean;
  className?: string;
  /** Clique no botão de abrir cartão (ícone). */
  onOpenCard?: (cardId: string) => void;
  /** Texto do botão de adicionar por coluna (opcional). */
  addCardLabel?: string;
  onRequestAdd?: (column: TColumn) => void;
};

export function KanbanBoard<TColumn extends string>({
  columns,
  cards,
  onCardsChange,
  readOnly = false,
  className,
  onOpenCard,
  addCardLabel = "Adicionar",
  onRequestAdd,
}: KanbanBoardProps<TColumn>) {
  return (
    <LayoutGroup>
      <div
        className={cn(
          "flex w-full gap-3 overflow-x-auto overflow-y-hidden pb-2 pt-1 [scrollbar-gutter:stable]",
          className,
        )}
      >
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={cards}
            setCards={onCardsChange}
            readOnly={readOnly}
            onOpenCard={onOpenCard}
            addCardLabel={addCardLabel}
            onRequestAdd={onRequestAdd}
          />
        ))}
      </div>
    </LayoutGroup>
  );
}

type KanbanColumnInnerProps<TColumn extends string> = {
  column: KanbanColumnModel<TColumn>;
  cards: KanbanCardModel<TColumn>[];
  setCards: Dispatch<SetStateAction<KanbanCardModel<TColumn>[]>>;
  readOnly: boolean;
  onOpenCard?: (cardId: string) => void;
  addCardLabel: string;
  onRequestAdd?: (column: TColumn) => void;
};

function KanbanColumn<TColumn extends string>({
  column,
  cards,
  setCards,
  readOnly,
  onOpenCard,
  addCardLabel,
  onRequestAdd,
}: KanbanColumnInnerProps<TColumn>) {
  const [active, setActive] = useState(false);
  const colId = column.id;

  const handleDragStart = (e: DragEvent, card: KanbanCardModel<TColumn>) => {
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");
    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    if (!indicators.length) return;

    const { element } = getNearestIndicator(e, indicators);
    const before = element.dataset.before || "-1";

    if (before === cardId) return;

    setCards((prev) => {
      const copy = [...prev];
      const cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return prev;

      const updated = { ...cardToTransfer, column: colId };
      const without = copy.filter((c) => c.id !== cardId);
      const moveToBack = before === "-1";

      if (moveToBack) {
        without.push(updated);
        return without;
      }

      const insertAtIndex = without.findIndex((el) => el.id === before);
      if (insertAtIndex < 0) {
        without.push(updated);
        return without;
      }

      without.splice(insertAtIndex, 0, updated);
      return without;
    });
  };

  const handleDragOver = (e: DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els ?? getIndicators();
    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: DragEvent) => {
    const indicators = getIndicators();
    clearHighlights(indicators);
    const el = getNearestIndicator(e, indicators);
    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;
    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + DISTANCE_OFFSET);
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      },
    );
    return el;
  };

  const getIndicators = () =>
    Array.from(
      document.querySelectorAll(`[data-kanban-column="${String(colId)}"]`) as NodeListOf<HTMLElement>,
    );

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.column === colId);

  return (
    <div className="w-[min(100%,280px)] shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className={cn(
            "truncate text-sm font-semibold tracking-tight text-foreground",
            column.headingClassName,
          )}
        >
          {column.title}
        </h3>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {filteredCards.length}
        </span>
      </div>
      <div
        onDrop={readOnly ? undefined : handleDragEnd}
        onDragOver={readOnly ? undefined : handleDragOver}
        onDragLeave={readOnly ? undefined : handleDragLeave}
        className={cn(
          "min-h-[200px] w-full rounded-xl border border-border/60 bg-muted/20 p-2 transition-colors",
          !readOnly && active && "bg-primary/5 ring-1 ring-primary/20",
        )}
      >
        {filteredCards.map((c) => (
          <KanbanCard
            key={c.id}
            card={c}
            columnId={colId}
            readOnly={readOnly}
            handleDragStart={handleDragStart}
            onOpenCard={onOpenCard}
          />
        ))}
        <DropIndicator beforeId={null} column={String(colId)} />
        {onRequestAdd && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-8 w-full justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onRequestAdd(colId)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {addCardLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

type KanbanCardProps<TColumn extends string> = {
  card: KanbanCardModel<TColumn>;
  columnId: TColumn;
  readOnly: boolean;
  handleDragStart: (e: DragEvent, card: KanbanCardModel<TColumn>) => void;
  onOpenCard?: (cardId: string) => void;
};

function KanbanCard<TColumn extends string>({
  card,
  columnId,
  readOnly,
  handleDragStart,
  onOpenCard,
}: KanbanCardProps<TColumn>) {
  const { id, title } = card;

  return (
    <>
      <DropIndicator beforeId={id} column={String(columnId)} />
      <motion.div layout layoutId={id} className="mb-2">
        <div
          draggable={!readOnly}
          onDragStart={
            readOnly
              ? undefined
              : (e: DragEvent<HTMLDivElement>) => handleDragStart(e, card)
          }
          className={cn(
            "rounded-lg border border-border bg-card p-2.5 shadow-sm",
            !readOnly && "cursor-grab active:cursor-grabbing",
            readOnly && "cursor-default opacity-95",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground line-clamp-4">{title}</p>
            {onOpenCard && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                title="Abrir demanda"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onOpenCard(id);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

type DropIndicatorProps = {
  beforeId: string | null;
  column: string;
};

function DropIndicator({ beforeId, column }: DropIndicatorProps) {
  return (
    <div
      data-before={beforeId ?? "-1"}
      data-kanban-column={column}
      className="my-0.5 h-0.5 w-full rounded-full bg-primary opacity-0 transition-opacity"
    />
  );
}
