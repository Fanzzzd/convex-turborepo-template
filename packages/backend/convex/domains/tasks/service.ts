import { ConvexError } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { updateRequestStatus } from "../requests/service";

export async function createTask(
  ctx: MutationCtx,
  args: {
    boards: number;
    requestId: Id<"requests">;
    assignedVehicleId?: Id<"vehicles">;
    estimatedDurationMinutes?: number;
  }
) {
  const status = args.assignedVehicleId
    ? ("assigned" as const)
    : ("pending" as const);
  const id = await ctx.db.insert("tasks", { ...args, status });
  await updateRequestStatus(ctx, args.requestId);
  return id;
}

export async function assignTaskToVehicle(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  vehicleId: Id<"vehicles">
) {
  const task = await ctx.db.get(taskId);
  if (!task) throw new ConvexError("Task not found");
  await ctx.db.patch(taskId, {
    assignedVehicleId: vehicleId,
    status: "assigned",
  });
  if (task.requestId) {
    await updateRequestStatus(ctx, task.requestId as Id<"requests">);
  }
  return taskId;
}

export async function scheduleTask(
  ctx: MutationCtx,
  args: {
    taskId: Id<"tasks">;
    vehicleId: Id<"vehicles">;
    date: string; // YYYY-MM-DD
    startMinute: number;
    endMinute: number;
  }
) {
  if (args.endMinute <= args.startMinute) {
    throw new ConvexError("Invalid time range");
  }
  const task = await ctx.db.get(args.taskId);
  if (!task) throw new ConvexError("Task not found");
  await ctx.db.patch(args.taskId, {
    assignedVehicleId: args.vehicleId,
    status: "assigned",
    scheduledDate: args.date,
    scheduledStartMinute: args.startMinute,
    scheduledEndMinute: args.endMinute,
  });
  if (task.requestId) {
    await updateRequestStatus(ctx, task.requestId as Id<"requests">);
  }
  return args.taskId;
}

export async function unscheduleTask(ctx: MutationCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) throw new ConvexError("Task not found");
  await ctx.db.patch(taskId, {
    scheduledDate: undefined,
    scheduledStartMinute: undefined,
    scheduledEndMinute: undefined,
  });
  if (task.requestId) {
    await updateRequestStatus(ctx, task.requestId as Id<"requests">);
  }
  return taskId;
}

export async function deleteTask(ctx: MutationCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) throw new ConvexError("Task not found");
  if (task.status === "completed") {
    throw new ConvexError("Cannot delete a completed task");
  }
  const requestId = task.requestId as Id<"requests"> | undefined;
  await ctx.db.delete(taskId);
  if (requestId) {
    await updateRequestStatus(ctx, requestId);
  }
  return { ok: true as const };
}

export async function createTaskForRequest(
  ctx: MutationCtx,
  args: {
    requestId: Id<"requests">;
    vehicleId: Id<"vehicles">;
    boards: number;
    estimatedDurationMinutes?: number;
    scheduledDate?: string;
    scheduledStartMinute?: number;
    scheduledEndMinute?: number;
  }
) {
  if (args.boards <= 0) throw new ConvexError("Boards must be > 0");

  const request = await ctx.db.get(args.requestId);
  if (!request) throw new ConvexError("Request not found");
  const vehicle = await ctx.db.get(args.vehicleId);
  if (!vehicle) throw new ConvexError("Vehicle not found");
  if (args.boards > vehicle.boardCapacity) {
    throw new ConvexError("Boards exceed vehicle capacity");
  }

  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("requestId", (q) => q.eq("requestId", args.requestId))
    .collect();
  const existingBoards = existingTasks.reduce(
    (sum, t) => sum + (t.boards ?? 0),
    0
  );
  if (existingBoards + args.boards > request.boards) {
    throw new ConvexError("Total assigned boards would exceed request total");
  }

  const id = await ctx.db.insert("tasks", {
    boards: args.boards,
    requestId: args.requestId,
    assignedVehicleId: args.vehicleId,
    estimatedDurationMinutes: args.estimatedDurationMinutes,
    status: "assigned",
    scheduledDate: args.scheduledDate,
    scheduledStartMinute: args.scheduledStartMinute,
    scheduledEndMinute: args.scheduledEndMinute,
  });
  await updateRequestStatus(ctx, args.requestId);
  return id;
}

export async function completeTask(ctx: MutationCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) throw new ConvexError("Task not found");
  await ctx.db.patch(taskId, { status: "completed" });
  if (task.requestId) {
    await updateRequestStatus(ctx, task.requestId as Id<"requests">);
  }
  return taskId;
}
