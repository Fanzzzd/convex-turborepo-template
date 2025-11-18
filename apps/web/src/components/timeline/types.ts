import type { Doc, Id } from "@acme/backend/convex/_generated/dataModel";

export type EventItem = {
  id: string;
  requestId: Id<"requests">;
  taskId?: Id<"tasks">;
  start: number;
  end: number;
  lane: number;
};

// State types
export interface DraggingState {
  eventId: string;
  start: number;
  end: number;
  lane: number;
}

export interface PreviewState {
  requestId: Id<"requests">;
  taskId?: Id<"tasks">;
  minute: number;
  lane: number;
}

// Utility types
export interface TimeRange {
  start: number;
  end: number;
}

export interface Position {
  x: number;
  y: number;
}

// Store types
export interface TimelineState {
  events: Record<string, EventItem>;
  taskToEventMap: Record<string, string>;
  pxPerMinute: number;
  draggingState: DraggingState | null;
  previewState: PreviewState | null;
  tasks: Doc<"tasks">[];
  requests: Doc<"requests">[];
  lanes: number;
}

export interface TimelineActions {
  // Event actions
  upsertEvent: (args: {
    requestId: string;
    taskId?: string;
    minute: number;
    lane?: number;
  }) => void;
  insertEvent: (args: {
    requestId: string;
    minute: number;
    lane?: number;
  }) => void;
  moveEvent: (eventId: string, minute: number, lane?: number) => void;
  resizeLeft: (eventId: string, newStart: number) => void;
  resizeRight: (eventId: string, newEnd: number) => void;
  deleteEvent: (eventId: string) => void;
  resetEvents: () => void;
  replaceEvents: (
    items: Array<{
      requestId: string;
      taskId: string;
      start: number;
      end: number;
      lane: number;
    }>
  ) => void;

  // View actions
  setPxPerMinute: (value: number) => void;
  setLanes: (value: number) => void;
  setTasks: (tasks: Doc<"tasks">[]) => void;
  setRequests: (requests: Doc<"requests">[]) => void;

  // Drag actions
  updateDraggingEvent: (
    eventId: string,
    start: number,
    end: number,
    lane: number
  ) => void;
  endDragging: () => void;

  // Preview actions
  setPreviewState: (state: PreviewState | null) => void;

  // Helper getters
  resolveTask: (id: string) => Doc<"tasks"> | undefined;
  resolveRequestLabel: (requestId: string) => string;
  getDurationForSource: (src: { requestId: string; taskId?: string }) => number;
  detectOverlaps: (eventId: string) => TimeRange[];
}

export type TimelineStore = TimelineState & TimelineActions;
