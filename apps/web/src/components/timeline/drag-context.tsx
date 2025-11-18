import type { Id } from "@acme/backend/convex/_generated/dataModel";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createContext, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clamp, END_MINUTE, fmt, LANE_HEIGHT, START_MINUTE } from "./constants";
import { useTimelineStore } from "./store";

interface TimelineDragContextValue {
  dropzoneRef: RefObject<HTMLDivElement | null>;
  readOnly: boolean;
  handleTaskPreview: (
    source: { requestId: string; taskId?: string },
    clientX: number,
    clientY: number
  ) => void;
  handleTaskDrop: (
    source: { requestId: string; taskId?: string },
    clientX: number,
    clientY: number
  ) => void;
  handleRequestDrop: (
    requestId: string,
    clientX: number,
    clientY: number
  ) => void;
  clearPreview: () => void;
  isOverDropzone: (rect: DOMRect) => boolean;
  isPointOverDropzone: (clientX: number, clientY: number) => boolean;
  registerPointToMinute: (fn: (clientX: number) => number) => void;
  updateOverlay: (
    source: { requestId: string; taskId?: string },
    clientX: number,
    clientY: number,
    anchorPx?: number,
    anchorPy?: number
  ) => void;
  clearOverlay: () => void;
  pointToMinute: (clientX: number) => number | null;
}

const TimelineDragContext = createContext<TimelineDragContextValue | null>(
  null
);

export function useTimelineDrag() {
  const context = useContext(TimelineDragContext);
  if (!context) {
    throw new Error("useTimelineDrag must be used within TimelineDragProvider");
  }
  return context;
}

interface TimelineDragProviderProps {
  children: ReactNode;
  readOnly?: boolean;
}

export function TimelineDragProvider({
  children,
  readOnly = false,
}: TimelineDragProviderProps) {
  const dropzoneRef = useRef<HTMLDivElement | null>(null);
  const pointToMinuteRef = useRef<((clientX: number) => number) | null>(null);
  const lastPreviewRef = useRef<{
    requestId: string;
    taskId?: string;
    minute: number;
    lane: number;
  } | null>(null);
  const upsertEvent = useTimelineStore((state) => state.upsertEvent);
  const insertEvent = useTimelineStore((state) => state.insertEvent);
  const setPreviewState = useTimelineStore((state) => state.setPreviewState);
  const lanes = useTimelineStore((state) => state.lanes);
  const getDurationForSource = useTimelineStore((s) => s.getDurationForSource);

  type DragOverlayState = {
    source: { requestId: string; taskId?: string };
    clientX: number;
    clientY: number;
    anchorPx?: number;
    anchorPy?: number;
  } | null;
  const [overlay, setOverlay] = useState<DragOverlayState>(null);

  const registerPointToMinute = (fn: (clientX: number) => number) => {
    pointToMinuteRef.current = fn;
  };

  const convertClientXToMinute = (clientX: number) => {
    if (!pointToMinuteRef.current) return null;
    return pointToMinuteRef.current(clientX);
  };

  const getLaneFromClientY = (clientY: number) => {
    if (!dropzoneRef.current) return 0;
    const rect = dropzoneRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const idx = Math.floor(y / LANE_HEIGHT);
    return Math.max(0, Math.min(lanes - 1, idx));
  };

  const handleTaskPreview = (
    source: { requestId: string; taskId?: string },
    clientX: number,
    clientY: number
  ) => {
    if (readOnly) return;
    const centerMinute = convertClientXToMinute(clientX);
    if (centerMinute === null) return;
    const lane = getLaneFromClientY(clientY);
    setOverlay({ source, clientX, clientY });

    const dur = useTimelineStore.getState().getDurationForSource(source);
    const start = clamp(centerMinute - dur / 2, START_MINUTE, END_MINUTE - dur);

    // Only update if the value actually changed
    if (
      lastPreviewRef.current?.requestId === source.requestId &&
      lastPreviewRef.current?.taskId === source.taskId &&
      lastPreviewRef.current?.minute === start &&
      lastPreviewRef.current?.lane === lane
    ) {
      return;
    }

    const newState = {
      requestId: source.requestId as unknown as Id<"requests">,
      taskId: (source.taskId as unknown as Id<"tasks">) ?? undefined,
      minute: start,
      lane,
    };
    lastPreviewRef.current = newState;
    setPreviewState(newState);
  };

  const handleTaskDrop = (
    source: { requestId: string; taskId?: string },
    clientX: number,
    clientY: number
  ) => {
    if (readOnly) return;
    const minute = convertClientXToMinute(clientX);
    if (minute === null) return;

    const lane = getLaneFromClientY(clientY);
    const dur = getDurationForSource(source);
    const start = clamp(minute - dur / 2, START_MINUTE, END_MINUTE - dur);
    upsertEvent({
      requestId: source.requestId,
      taskId: source.taskId,
      minute: start,
      lane,
    });
    lastPreviewRef.current = null;
    setPreviewState(null);
    setOverlay(null);
  };

  // Multi-instance drop (requests): always create a new event
  const handleRequestDrop = (
    requestId: string,
    clientX: number,
    clientY: number
  ) => {
    if (readOnly) return;
    const minute = convertClientXToMinute(clientX);
    if (minute === null) return;
    const lane = getLaneFromClientY(clientY);
    const dur = getDurationForSource({ requestId });
    const start = clamp(minute - dur / 2, START_MINUTE, END_MINUTE - dur);
    insertEvent({ requestId, minute: start, lane });
    lastPreviewRef.current = null;
    setPreviewState(null);
    setOverlay(null);
  };

  const clearPreview = () => {
    lastPreviewRef.current = null;
    setPreviewState(null);
  };

  const isOverDropzone = (chipRect: DOMRect) => {
    if (!dropzoneRef.current) return false;
    const dropzoneRect = dropzoneRef.current.getBoundingClientRect();
    const leftX = chipRect.left;
    const centerY = chipRect.top + chipRect.height / 2;
    return (
      leftX >= dropzoneRect.left &&
      leftX <= dropzoneRect.right &&
      centerY >= dropzoneRect.top &&
      centerY <= dropzoneRect.bottom
    );
  };

  const isPointOverDropzone = (clientX: number, clientY: number) => {
    if (!dropzoneRef.current) return false;
    const r = dropzoneRef.current.getBoundingClientRect();
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    );
  };

  const contextValue: TimelineDragContextValue = {
    dropzoneRef,
    readOnly,
    handleTaskPreview,
    handleTaskDrop,
    handleRequestDrop,
    clearPreview,
    isOverDropzone,
    isPointOverDropzone,
    registerPointToMinute,
    updateOverlay: (source, clientX, clientY, anchorPx, anchorPy) =>
      setOverlay({ source, clientX, clientY, anchorPx, anchorPy }),
    clearOverlay: () => setOverlay(null),
    pointToMinute: (clientX: number) => convertClientXToMinute(clientX),
  };

  return (
    <TimelineDragContext.Provider value={contextValue}>
      {children}
      {overlay && typeof document !== "undefined"
        ? (() => {
            const overTl = isPointOverDropzone(
              overlay.clientX,
              overlay.clientY
            );
            const centerMinute = convertClientXToMinute(overlay.clientX);
            const storeState = useTimelineStore.getState();
            const duration = storeState.getDurationForSource(overlay.source);
            const ppm = storeState.pxPerMinute;
            const anchorMinutes =
              (overlay.anchorPx ?? (duration * ppm) / 2) / ppm;
            const start =
              overTl && centerMinute !== null
                ? clamp(
                    centerMinute - anchorMinutes,
                    START_MINUTE,
                    END_MINUTE - duration
                  )
                : null;
            const end = start !== null ? start + duration : null;
            return createPortal(
              <DragOverlay
                source={overlay.source}
                clientX={overlay.clientX}
                clientY={overlay.clientY}
                duration={duration}
                start={start}
                end={end}
                anchorPx={overlay.anchorPx}
                anchorPy={overlay.anchorPy}
              />,
              document.body
            );
          })()
        : null}
    </TimelineDragContext.Provider>
  );
}

function DragOverlay({
  source,
  clientX,
  clientY,
  duration,
  start,
  end,
  anchorPx,
  anchorPy,
}: {
  source: { requestId: string; taskId?: string };
  clientX: number;
  clientY: number;
  duration: number;
  start: number | null;
  end: number | null;
  anchorPx?: number;
  anchorPy?: number;
}) {
  const pxPerMinute = useTimelineStore((s) => s.pxPerMinute);
  const resolveRequestLabel = useTimelineStore((s) => s.resolveRequestLabel);
  const width = duration * pxPerMinute;
  const title = resolveRequestLabel(source.requestId);

  return (
    <div
      className="fixed z-9999 pointer-events-none flex h-16 flex-col justify-center gap-1 rounded-sm border bg-card shadow-lg overflow-hidden"
      style={{
        left: clientX,
        top: clientY,
        width,
        transform: `translate(-${anchorPx ?? width / 2}px, -${anchorPy ?? LANE_HEIGHT / 2}px)`,
      }}
    >
      {/* Visual resize handles to match timeline EventBlock */}
      <div
        className="absolute top-0 h-full"
        style={{ left: 0, width: "8px", marginLeft: "-4px" }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 h-full w-0.5 bg-green-500 hover:bg-green-600 transition-colors pointer-events-none" />
      </div>
      <div
        className="absolute top-0 h-full"
        style={{ right: 0, width: "8px", marginRight: "-4px" }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 h-full w-0.5 bg-green-500 hover:bg-green-600 transition-colors pointer-events-none" />
      </div>
      <div className="px-2.5 flex items-center gap-2">
        <div className="truncate text-xs font-medium">{title}</div>
        <div className="ml-auto text-[10px] text-muted-foreground">
          {duration}min
        </div>
      </div>
      {start !== null && end !== null && (
        <div className="px-2.5 text-[10px] text-muted-foreground">
          {fmt(Math.round(start))} - {fmt(Math.round(end))}
        </div>
      )}
    </div>
  );
}

interface TimelineDropZoneProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function TimelineDropZone({
  className,
  style,
  children,
}: TimelineDropZoneProps) {
  const { dropzoneRef } = useTimelineDrag();

  return (
    <div ref={dropzoneRef} className={className} style={style} data-dropzone>
      {children}
    </div>
  );
}
