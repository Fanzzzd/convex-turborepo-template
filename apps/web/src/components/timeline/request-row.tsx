import { api } from "@acme/backend/convex/_generated/api";
import type { Doc } from "@acme/backend/convex/_generated/dataModel";
import { useDrag } from "@use-gesture/react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { AllocationBar } from "@/components/complex/allocation-bar";
import { useTimelineDrag } from "./drag-context";

export type RequestSummary = {
  request: Doc<"requests">;
  sumAssignedBoards: number;
  completedBoards?: number;
};

interface RequestRowProps {
  summary: RequestSummary;
}

export function RequestRow({ summary }: RequestRowProps) {
  const {
    handleTaskPreview,
    handleRequestDrop,
    clearPreview,
    isPointOverDropzone,
    updateOverlay,
    clearOverlay,
    readOnly,
  } = useTimelineDrag();
  const rowRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const { request, sumAssignedBoards } = summary;
  const total = request.boards ?? 0;
  const assigned = sumAssignedBoards ?? 0;
  const completed = summary.completedBoards ?? 0;
  const inProgress = Math.max(0, assigned - completed);
  const _remaining = Math.max(0, total - assigned);
  const totalSafe = total > 0 ? total : 1;
  const _pctCompleted = Math.min(
    100,
    Math.max(0, (completed / totalSafe) * 100)
  );
  const _pctInProgress = Math.min(
    100,
    Math.max(0, (inProgress / totalSafe) * 100)
  );

  // Locations (for line 2)
  const locations = useQuery(api.domains.locations.api.listLocations) ?? [];
  const startName =
    locations.find((l) => l._id === request.startLocationId)?.name ?? "Start";
  const endName =
    locations.find((l) => l._id === request.endLocationId)?.name ?? "End";

  useDrag(
    ({ first, last, event }) => {
      if (readOnly) return;
      if (first) setDragging(true);
      const pe = event as PointerEvent | MouseEvent;
      const clientX = (pe as PointerEvent).clientX ?? 0;
      const clientY = (pe as PointerEvent).clientY ?? 0;

      updateOverlay(
        { requestId: request._id as unknown as string },
        clientX,
        clientY
      );
      const overDropzone = isPointOverDropzone(clientX, clientY);
      if (overDropzone) {
        last
          ? handleRequestDrop(
              request._id as unknown as string,
              clientX,
              clientY
            )
          : handleTaskPreview(
              { requestId: request._id as unknown as string },
              clientX,
              clientY
            );
      } else {
        clearPreview();
      }
      if (last) {
        clearOverlay();
        setDragging(false);
      }
    },
    { target: rowRef, pointer: { capture: true }, enabled: !readOnly }
  );

  return (
    <motion.div
      ref={rowRef}
      className={`z-30 cursor-grab rounded-md border px-3 py-2 text-sm shadow-sm active:cursor-grabbing touch-none select-none flex flex-col gap-1.5 ${dragging ? "opacity-0" : ""}`}
    >
      {/* Line 1: title + duration */}
      <div className="flex items-center gap-2">
        <div
          className="min-w-0 flex-1 font-medium truncate"
          title={request.title}
        >
          {request.title}
        </div>
        <div className="shrink-0 text-[11px] text-muted-foreground inline-flex items-center rounded-full border px-1.5 py-0.5">
          {(request as { estimatedTaskDurationMinutes?: number })
            .estimatedTaskDurationMinutes ?? 60}
          min
        </div>
      </div>
      {/* Line 2: start → end */}
      <div className="text-[11px] text-muted-foreground truncate">
        <span className="font-medium text-foreground/80">{startName}</span>
        <span className="mx-1">→</span>
        <span className="font-medium text-foreground/80">{endName}</span>
      </div>
      {/* Line 3: allocation bar (same as Requests table) */}
      <AllocationBar
        total={total}
        assigned={assigned}
        completed={completed}
        showSummary
        summaryAlign="between"
      />
    </motion.div>
  );
}
