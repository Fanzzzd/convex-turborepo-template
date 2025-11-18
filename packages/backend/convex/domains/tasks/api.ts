import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id as DocId } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import { requireAbility, requireUser } from "../../_shared/auth";
import * as taskService from "./service";

// Role checks are unified via requireAnyRole from _shared/auth

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    await requireAbility(ctx, "read", "task-assignment");
    return await ctx.db.query("tasks").collect();
  },
});

export const paginateTasks = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "task-assignment");
    return await ctx.db.query("tasks").paginate(args.paginationOpts);
  },
});

export const listTasksByVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "task-assignment");
    return await ctx.db
      .query("tasks")
      .withIndex("vehicleAndDate", (q) =>
        q.eq("assignedVehicleId", args.vehicleId)
      )
      .collect();
  },
});

export const listTasksByDate = query({
  args: { date: v.string() }, // YYYY-MM-DD
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "task-assignment");
    return await ctx.db
      .query("tasks")
      .withIndex("scheduledDate", (q) => q.eq("scheduledDate", args.date))
      .collect();
  },
});

export const createTask = mutation({
  args: {
    boards: v.number(),
    requestId: v.id("requests"),
    assignedVehicleId: v.optional(v.id("vehicles")),
    estimatedDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.createTask(ctx, args);
  },
});

export const assignTaskToVehicle = mutation({
  args: { taskId: v.id("tasks"), vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.assignTaskToVehicle(
      ctx,
      args.taskId,
      args.vehicleId
    );
  },
});

export const scheduleTask = mutation({
  args: {
    taskId: v.id("tasks"),
    vehicleId: v.id("vehicles"),
    date: v.string(), // YYYY-MM-DD
    startMinute: v.number(),
    endMinute: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.scheduleTask(ctx, args);
  },
});

export const unscheduleTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.unscheduleTask(ctx, args.taskId);
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.deleteTask(ctx, args.taskId);
  },
});

export const createTaskForRequest = mutation({
  args: {
    requestId: v.id("requests"),
    vehicleId: v.id("vehicles"),
    boards: v.number(),
    estimatedDurationMinutes: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    scheduledStartMinute: v.optional(v.number()),
    scheduledEndMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");
    return await taskService.createTaskForRequest(ctx, args);
  },
});

export const completeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await taskService.completeTask(ctx, args.taskId);
  },
});

// Read-side enrichment
export const listTasksByDateEnriched = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "task-assignment");
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("scheduledDate", (q) => q.eq("scheduledDate", args.date))
      .collect();
    const results = [] as Array<{
      task: Doc<"tasks">;
      request: Pick<
        Doc<"requests">,
        | "_id"
        | "title"
        | "startLocationId"
        | "endLocationId"
        | "estimatedTaskDurationMinutes"
      >;
    }>;
    for (const t of tasks) {
      const req = await ctx.db.get(t.requestId as DocId<"requests">);
      if (!req) continue;
      results.push({
        task: t,
        request: {
          _id: req._id,
          title: req.title,
          startLocationId: req.startLocationId,
          endLocationId: req.endLocationId,
          estimatedTaskDurationMinutes: req.estimatedTaskDurationMinutes,
        },
      });
    }
    return results;
  },
});

export const listDriverTasksEnriched = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "my-tasks");
    const me = await requireUser(ctx);
    // Find vehicles for this driver
    const myVehicles = await ctx.db
      .query("vehicles")
      .withIndex("driverId", (q) => q.eq("driverId", me._id))
      .collect();
    if (myVehicles.length === 0)
      return [] as Array<{
        task: Doc<"tasks">;
        request: Pick<
          Doc<"requests">,
          | "_id"
          | "title"
          | "startLocationId"
          | "endLocationId"
          | "estimatedTaskDurationMinutes"
        >;
      }>;
    const results: Array<{
      task: Doc<"tasks">;
      request: Pick<
        Doc<"requests">,
        | "_id"
        | "title"
        | "startLocationId"
        | "endLocationId"
        | "estimatedTaskDurationMinutes"
      >;
    }> = [];
    for (const vehicle of myVehicles) {
      const items = args.date
        ? await ctx.db
            .query("tasks")
            .withIndex("vehicleAndDate", (q) =>
              q
                .eq("assignedVehicleId", vehicle._id)
                .eq("scheduledDate", args.date as string)
            )
            .collect()
        : await ctx.db
            .query("tasks")
            .withIndex("vehicleAndDate", (q) =>
              q.eq("assignedVehicleId", vehicle._id)
            )
            .collect();
      for (const t of items) {
        const req = await ctx.db.get(t.requestId as DocId<"requests">);
        if (!req) continue;
        results.push({
          task: t,
          request: {
            _id: req._id,
            title: req.title,
            startLocationId: req.startLocationId,
            endLocationId: req.endLocationId,
            estimatedTaskDurationMinutes: req.estimatedTaskDurationMinutes,
          },
        });
      }
    }
    return results;
  },
});

export const listDriverTasks = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "my-tasks");
    const me = await requireUser(ctx);
    // Find vehicles for this driver
    const myVehicles = await ctx.db
      .query("vehicles")
      .withIndex("driverId", (q) => q.eq("driverId", me._id))
      .collect();
    if (myVehicles.length === 0) return [];
    // Query tasks per vehicle and merge
    const results: Array<Doc<"tasks">> = [];
    for (const vehicle of myVehicles) {
      const items = args.date
        ? await ctx.db
            .query("tasks")
            .withIndex("vehicleAndDate", (q) =>
              q
                .eq("assignedVehicleId", vehicle._id)
                .eq("scheduledDate", args.date as string)
            )
            .collect()
        : await ctx.db
            .query("tasks")
            .withIndex("vehicleAndDate", (q) =>
              q.eq("assignedVehicleId", vehicle._id)
            )
            .collect();
      results.push(...items);
    }
    return results;
  },
});

// No internal helpers exposed here; seeding-only functions live in seed.ts
