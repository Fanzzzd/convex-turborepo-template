import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { RequestStatus } from "./schema";

export async function computeRequestStatus(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"requests">
): Promise<RequestStatus> {
  const request = await ctx.db.get(requestId);
  if (!request) throw new ConvexError("Request not found");

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("requestId", (q) => q.eq("requestId", requestId))
    .collect();

  if (tasks.length === 0) return "incoming";

  const sumBoards = tasks.reduce((sum, t) => sum + (t.boards ?? 0), 0);
  const allCompleted = tasks.every((t) => t.status === "completed");
  if (allCompleted && sumBoards >= request.boards) return "finished";
  return "partially_assigned";
}

export async function recomputeRequestAggregates(
  ctx: MutationCtx,
  requestId: Id<"requests">
) {
  const request = await ctx.db.get(requestId);
  if (!request) throw new ConvexError("Request not found");

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("requestId", (q) => q.eq("requestId", requestId))
    .collect();

  const assignedBoards = tasks.reduce((sum, t) => sum + (t.boards ?? 0), 0);
  const completedBoards = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (t.boards ?? 0), 0);

  let status: RequestStatus = "incoming";
  if (tasks.length === 0) {
    status = "incoming";
  } else if (completedBoards >= request.boards) {
    status = "finished";
  } else {
    status = "partially_assigned";
  }

  await ctx.db.patch(requestId, {
    assignedBoards,
    completedBoards,
    status,
    updatedAt: Date.now(),
  });
  return { assignedBoards, completedBoards, status } as const;
}

export async function updateRequestStatus(
  ctx: MutationCtx,
  requestId: Id<"requests">
): Promise<RequestStatus> {
  const { status } = await recomputeRequestAggregates(ctx, requestId);
  return status;
}

export type VehicleAssignment = {
  vehicleId: Id<"vehicles">;
  boards: number;
  estimatedDurationMinutes?: number;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledStartMinute?: number;
  scheduledEndMinute?: number;
};

export async function assignVehiclesToRequest(
  ctx: MutationCtx,
  requestId: Id<"requests">,
  assignments: Array<VehicleAssignment>
): Promise<void> {
  const request = await ctx.db.get(requestId);
  if (!request) throw new ConvexError("Request not found");

  if (!assignments.length) throw new ConvexError("No assignments provided");

  const vehiclesById: Record<string, Doc<"vehicles">> = {};
  for (const a of assignments) {
    if (a.boards <= 0) throw new ConvexError("Assignment boards must be > 0");
    const key = String(a.vehicleId);
    let vehicle: Doc<"vehicles"> | undefined = vehiclesById[key];
    if (!vehicle) {
      const fetched = await ctx.db.get(a.vehicleId);
      if (!fetched) throw new ConvexError("Vehicle not found");
      vehicle = fetched;
      vehiclesById[key] = vehicle;
    }
    if (a.boards > vehicle.boardCapacity) {
      throw new ConvexError(
        `Boards exceed vehicle capacity (${vehicle.plate})`
      );
    }
  }

  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("requestId", (q) => q.eq("requestId", requestId))
    .collect();

  const existingAssignedBoards = existingTasks.reduce(
    (sum, t) => sum + (t.boards ?? 0),
    0
  );
  const newBoards = assignments.reduce((sum, a) => sum + a.boards, 0);

  if (existingAssignedBoards + newBoards > request.boards) {
    throw new ConvexError("Total assigned boards would exceed request total");
  }

  for (const a of assignments) {
    await ctx.db.insert("tasks", {
      boards: a.boards,
      requestId,
      assignedVehicleId: a.vehicleId,
      estimatedDurationMinutes:
        a.estimatedDurationMinutes ?? request.estimatedTaskDurationMinutes,
      status: "assigned",
      scheduledDate: a.scheduledDate,
      scheduledStartMinute: a.scheduledStartMinute,
      scheduledEndMinute: a.scheduledEndMinute,
    });
  }

  await recomputeRequestAggregates(ctx, requestId);
}

export async function getAggregates(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"requests">
): Promise<{
  assignedBoards: number;
  completedBoards: number;
  status: RequestStatus;
}> {
  const request = await ctx.db.get(requestId);
  if (!request) throw new ConvexError("Request not found");

  const hasStored =
    typeof (request as { assignedBoards?: number }).assignedBoards ===
      "number" &&
    typeof (request as { completedBoards?: number }).completedBoards ===
      "number" &&
    typeof (request as { status?: RequestStatus }).status === "string";

  if (hasStored) {
    return {
      assignedBoards: (request as { assignedBoards: number }).assignedBoards,
      completedBoards: (request as { completedBoards: number }).completedBoards,
      status: request.status as RequestStatus,
    };
  }

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("requestId", (q) => q.eq("requestId", requestId))
    .collect();

  const assignedBoards = tasks.reduce((sum, t) => sum + (t.boards ?? 0), 0);
  const completedBoards = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (t.boards ?? 0), 0);

  let status: RequestStatus = "incoming";
  if (tasks.length === 0) {
    status = "incoming";
  } else if (completedBoards >= request.boards) {
    status = "finished";
  } else {
    status = "partially_assigned";
  }

  return { assignedBoards, completedBoards, status } as const;
}
