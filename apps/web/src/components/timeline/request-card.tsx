import type { Doc } from "@acme/backend/convex/_generated/dataModel";
import { useDrag } from "@use-gesture/react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { useTimelineDrag } from "./drag-context";

export type RequestSummary = {
  request: Doc<"requests">;
  sumAssignedBoards: number;
  completedBoards?: number;
};

interface RequestCardProps {
  summary: RequestSummary;
}

export function RequestCard({ summary }: RequestCardProps) {
  const {
    handleTaskPreview,
    handleRequestDrop,
    clearPreview,
    isPointOverDropzone,
    updateOverlay,
    clearOverlay,
  } = useTimelineDrag();
  const chipRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const { request, sumAssignedBoards } = summary;
  const total = request.boards ?? 0;
  const assigned = sumAssignedBoards ?? 0;
  const completed = summary.completedBoards ?? 0;
  const inProgress = Math.max(0, assigned - completed);
  const remaining = Math.max(0, total - assigned);
  const totalSafe = total > 0 ? total : 1;
  const pctCompleted = Math.min(
    100,
    Math.max(0, (completed / totalSafe) * 100)
  );
  const pctInProgress = Math.min(
    100,
    Math.max(0, (inProgress / totalSafe) * 100)
  );

  useDrag(
    ({ first, last, event }) => {
      if (first) setDragging(true);
      const pe = event as PointerEvent | MouseEvent;
      const clientX = (pe as PointerEvent).clientX ?? 0;
      const clientY = (pe as PointerEvent).clientY ?? 0;

      // Mirror TaskCard behavior but identify by requestId
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
    { target: chipRef, pointer: { capture: true } }
  );

  return (
    <motion.div
      ref={chipRef}
      className={`z-30 cursor-grab rounded-md border p-3 text-sm shadow-sm active:cursor-grabbing touch-none select-none flex flex-col gap-1 ${dragging ? "opacity-0" : ""}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(34,197,94,1), rgba(34,197,94,1)), " +
          "repeating-linear-gradient(45deg, rgba(34,197,94,0.85) 0 8px, transparent 8px 16px)",
        backgroundSize: `${pctCompleted}% 100%, ${pctInProgress}% 100%`,
        backgroundPosition: `0 0, ${pctCompleted}% 0`,
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="font-medium truncate">{request.title}</div>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span>
          {assigned}/{total} assigned
        </span>
        <span>•</span>
        <span>Completed {completed}</span>
        <span>•</span>
        <span>Remain {remaining}</span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {request.estimatedTaskDurationMinutes} min
      </div>
    </motion.div>
  );
}
