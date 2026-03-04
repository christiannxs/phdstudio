import {
  format,
  startOfDay,
  addDays,
  isSameDay,
  parseISO,
  isBefore,
  isAfter,
} from "date-fns";
import type { DemandRow } from "@/types/demands";

export type DaySegmentType = "start" | "middle" | "end";

export type DemandDaySegment = {
  demandId: string;
  type: DaySegmentType;
  /** true quando a demanda ocupa só este dia (início = fim) */
  isSingleDay?: boolean;
  /** Horário de início no dia (apenas se início parcial), formato "HH:mm" */
  startTime?: string;
  /** Horário de término no dia (apenas se término parcial), formato "HH:mm" */
  endTime?: string;
  demand: DemandRow;
};

/** Mapa: data "yyyy-MM-dd" → segmentos de demandas naquele dia */
export type DemandsByDayMap = Record<string, DemandDaySegment[]>;

/**
 * Recebe start_at e due_at (ISO) e retorna todos os dias entre eles.
 * Para cada dia identifica: isStartDay, isMiddleDay, isEndDay.
 * Retorna estrutura: { "yyyy-MM-dd": [{ demandId, type, startTime?, endTime?, demand }] }
 */
export function demandsToDaysMap(demands: DemandRow[]): DemandsByDayMap {
  const map: DemandsByDayMap = {};

  for (const demand of demands) {
    const startAt = demand.start_at ? parseISO(demand.start_at) : null;
    const dueAt = demand.due_at ? parseISO(demand.due_at) : null;

    if (!dueAt) continue;
    const start = startAt ?? dueAt;

    if (isAfter(start, dueAt)) continue;

    const startDay = startOfDay(start);
    const endDay = startOfDay(dueAt);

    let current = startDay;
    while (isBefore(current, endDay) || isSameDay(current, endDay)) {
      const key = format(current, "yyyy-MM-dd");
      const list = map[key] ?? [];
      let type: DaySegmentType;
      let startTime: string | undefined;
      let endTime: string | undefined;

      if (isSameDay(current, startDay) && isSameDay(current, endDay)) {
        type = "start";
        if (startAt) startTime = format(startAt, "HH:mm");
        if (dueAt) endTime = format(dueAt, "HH:mm");
      }

      const isSingleDaySegment = isSameDay(current, startDay) && isSameDay(current, endDay);

      if (isSingleDaySegment) {
        list.push({
          demandId: demand.id,
          type: "start",
          isSingleDay: true,
          startTime,
          endTime,
          demand,
        });
      } else if (isSameDay(current, startDay)) {
        type = "start";
        if (startAt && !isSameDay(startAt, startOfDay(startAt)))
          startTime = format(startAt, "HH:mm");
        list.push({ demandId: demand.id, type, startTime, endTime, demand });
      } else if (isSameDay(current, endDay)) {
        type = "end";
        if (dueAt && !isSameDay(dueAt, startOfDay(dueAt)))
          endTime = format(dueAt, "HH:mm");
        list.push({ demandId: demand.id, type, startTime, endTime, demand });
      } else {
        type = "middle";
        list.push({ demandId: demand.id, type, startTime, endTime, demand });
      }

      map[key] = list;
      current = addDays(current, 1);
    }
  }

  return map;
}

/** Mapa demandId → índice de "trilha" (0, 1, 2...) para alinhar a mesma demanda na mesma faixa em todos os dias */
export function getDemandTracks(byDay: DemandsByDayMap): Record<string, number> {
  const firstDayByDemand = new Map<string, string>();
  for (const [dateKey, segments] of Object.entries(byDay)) {
    for (const seg of segments) {
      const current = firstDayByDemand.get(seg.demandId);
      if (current == null || dateKey < current) firstDayByDemand.set(seg.demandId, dateKey);
    }
  }
  const sortedIds = Array.from(firstDayByDemand.keys()).sort(
    (a, b) =>
      (firstDayByDemand.get(a) ?? "").localeCompare(firstDayByDemand.get(b) ?? "") || a.localeCompare(b)
  );
  const tracks: Record<string, number> = {};
  sortedIds.forEach((id, i) => {
    tracks[id] = i;
  });
  return tracks;
}
