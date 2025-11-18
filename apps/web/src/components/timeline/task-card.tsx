import type { Doc } from "@acme/backend/convex/_generated/dataModel";
import { useDrag } from "@use-gesture/react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { useTimelineDrag } from "./drag-context";
import { useTimelineStore } from "./store";

interface TaskCardProps {
  task: Doc<"tasks">;
  duration?: number;
}

export function TaskCard({ task, duration }: TaskCardProps) {
  const resolveRequestLabel = useTimelineStore((s) => s.resolveRequestLabel);
  const {
    handleTaskPreview,
    handleTaskDrop,
    clearPreview,
    isPointOverDropzone,
    updateOverlay,
    clearOverlay,
  } = useTimelineDrag();
  const chipRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useDrag(
    ({ first, last, event }) => {
      if (first) setDragging(true);
      const pe = event as PointerEvent | MouseEvent;
      const clientX = (pe as PointerEvent).clientX ?? 0;
      const clientY = (pe as PointerEvent).clientY ?? 0;

      // Always show overlay following pointer
      updateOverlay(
        {
          requestId: task.requestId as unknown as string,
          taskId: task._id as unknown as string,
        },
        clientX,
        clientY
      );
      const overDropzone = isPointOverDropzone(clientX, clientY);
      if (overDropzone) {
        last
          ? handleTaskDrop(
              {
                requestId: task.requestId as unknown as string,
                taskId: task._id as unknown as string,
              },
              clientX,
              clientY
            )
          : handleTaskPreview(
              {
                requestId: task.requestId as unknown as string,
                taskId: task._id as unknown as string,
              },
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
      className={`z-30 cursor-grab rounded-md border bg-card p-3 text-sm shadow-sm active:cursor-grabbing touch-none flex flex-col gap-1 ${dragging ? "opacity-0" : ""}`}
    >
      <div className="font-medium">
        {resolveRequestLabel(task.requestId as unknown as string)}
      </div>
      {duration && (
        <div className="text-xs text-muted-foreground">{duration} min</div>
      )}
    </motion.div>
  );
}
