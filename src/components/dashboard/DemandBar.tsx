import { cn } from "@/lib/utils";
import { Play, Square } from "lucide-react";
import type { DemandDaySegment } from "@/lib/demandsCalendar";
import { DemandTooltip } from "./DemandTooltip";

const TRACK_HEIGHT = 8;
const TRACK_GAP = 2;

/** Faixa contínua usando variáveis de tema (destructive) */
const STRIP_BASE = "bg-destructive/25 hover:bg-destructive/45 transition-colors duration-150";

interface DemandBarProps {
  segment: DemandDaySegment;
  trackIndex: number;
  overflowCount?: number;
  overflowDemandNames?: string[];
  canEdit?: boolean;
  compact?: boolean;
}

export function DemandBar({
  segment,
  trackIndex,
  overflowCount,
  overflowDemandNames = [],
  canEdit = false,
  compact = false,
}: DemandBarProps) {
  const { type, isSingleDay, startTime, endTime, demand } = segment;
  const isStart = type === "start";
  const isEnd = type === "end";
  const roundedLeft = isStart || isSingleDay;
  const roundedRight = isEnd || isSingleDay;
  const isOverflow = overflowCount !== undefined && overflowCount > 0;

  const timeLabel = startTime && endTime
    ? `${startTime} → ${endTime}`
    : startTime
      ? `${startTime} →`
      : endTime
        ? `→ ${endTime}`
        : null;

  return (
    <DemandTooltip
      demand={demand}
      canEdit={canEdit}
      overflowCount={isOverflow ? overflowCount : undefined}
      overflowDemandNames={isOverflow ? overflowDemandNames : undefined}
    >
      <div
        className={cn(
          "absolute flex items-center justify-center overflow-hidden",
          roundedLeft && "rounded-l-sm",
          roundedRight && "rounded-r-sm"
        )}
        style={{
          top: `${trackIndex * ((compact ? 6 : TRACK_HEIGHT) + TRACK_GAP)}px`,
          height: compact ? 6 : TRACK_HEIGHT,
          left: "-2px",
          right: "-2px",
        }}
      >
        <span
          className={cn(
            "flex items-center justify-center gap-0.5 w-full h-full rounded-none px-1 min-w-0",
            STRIP_BASE,
            roundedLeft && "rounded-l-sm",
            roundedRight && "rounded-r-sm"
          )}
        >
          {compact ? (
            <span className="sr-only">{demand.name}</span>
          ) : isOverflow ? (
            <span className="text-[9px] font-semibold text-destructive truncate">
              +{overflowCount} demandas
            </span>
          ) : (
            <>
              {isStart && <Play className="h-2.5 w-2.5 shrink-0 text-destructive" aria-hidden />}
              {isEnd && !isSingleDay && <Square className="h-2 w-2 shrink-0 text-destructive" aria-hidden />}
              {isSingleDay && (
                <>
                  <Play className="h-2.5 w-2.5 shrink-0 text-destructive" aria-hidden />
                  <Square className="h-2 w-2 shrink-0 text-destructive" aria-hidden />
                </>
              )}
              {timeLabel && (
                <span className="text-[9px] font-medium text-destructive/90 truncate">
                  {timeLabel}
                </span>
              )}
            </>
          )}
        </span>
      </div>
    </DemandTooltip>
  );
}

interface DemandBarListProps {
  segments: DemandDaySegment[];
  demandTracks: Record<string, number>;
  compact?: boolean;
  canEdit?: boolean;
}

const MAX_TRACKS = 6;

export function DemandBarList({
  segments,
  demandTracks,
  compact = false,
  canEdit = false,
}: DemandBarListProps) {
  if (segments.length === 0) return null;

  const withTrack = segments
    .map((seg) => ({ seg, track: demandTracks[seg.demandId] ?? 0 }))
    .sort((a, b) => a.track - b.track);

  const maxTracks = compact ? 2 : MAX_TRACKS;
  const trackHeight = compact ? 6 : TRACK_HEIGHT;
  const visible = withTrack.filter(({ track }) => track < maxTracks);
  const overflowCount = withTrack.length - visible.length;
  const hasOverflow = overflowCount > 0;
  const overflowSegments = withTrack.filter(({ track }) => track >= maxTracks);
  const overflowDemandNames = overflowSegments.map(({ seg }) => seg.demand.name);

  const tracksToRender =
    hasOverflow && visible.length < maxTracks
      ? visible.length + 1
      : visible.length;
  const containerHeight =
    tracksToRender * (trackHeight + TRACK_GAP) - TRACK_GAP;

  const showCountLabel = !compact && segments.length > 1 && !hasOverflow;

  return (
    <div className="flex flex-col w-full gap-0.5 flex-shrink-0">
      {showCountLabel && (
        <p className="text-[9px] font-medium text-muted-foreground leading-none px-0.5">
          {segments.length} demandas
        </p>
      )}
      <div
        className="relative w-full"
        style={{ height: containerHeight }}
      >
        {visible.map(({ seg, track }) => (
          <DemandBar
            key={`${seg.demandId}-${seg.type}`}
            segment={seg}
            trackIndex={track}
            canEdit={canEdit}
            compact={compact}
          />
        ))}
        {hasOverflow && (
          <DemandBar
            segment={visible[0]?.seg ?? segments[0]}
            trackIndex={visible.length}
            overflowCount={overflowCount}
            overflowDemandNames={overflowDemandNames}
            canEdit={canEdit}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
}
