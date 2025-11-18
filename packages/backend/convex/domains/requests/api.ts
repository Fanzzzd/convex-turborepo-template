import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import { requireAbility } from "../../_shared/auth";
import type { RequestStatus } from "./schema";
import { assignVehiclesToRequest, getAggregates } from "./service";

// RequestStatus is defined in schema.ts

export const listRequests = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("incoming"),
        v.literal("partially_assigned"),
        v.literal("finished")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "requests");
    const items = args.status
      ? await ctx.db
          .query("requests")
          .withIndex("statusUpdatedAt", (q) =>
            q.eq("status", args.status as RequestStatus)
          )
          .collect()
      : await ctx.db.query("requests").collect();
    return items;
  },
});

export const getRequestSummary = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "requests");
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Request not found");

    const { assignedBoards, completedBoards } = await getAggregates(
      ctx,
      args.requestId
    );

    return { request, sumAssignedBoards: assignedBoards, completedBoards };
  },
});

export const createRequest = mutation({
  args: {
    title: v.string(),
    boards: v.number(),
    estimatedTaskDurationMinutes: v.optional(v.number()),
    sourcerId: v.id("users"),
    startLocationId: v.id("locations"),
    endLocationId: v.id("locations"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "requests");

    if (args.boards <= 0) throw new ConvexError("Boards must be > 0");

    const now = Date.now();
    const id = await ctx.db.insert("requests", {
      ...args,
      estimatedTaskDurationMinutes: args.estimatedTaskDurationMinutes ?? 120,
      assignedBoards: 0,
      completedBoards: 0,
      status: "incoming" as RequestStatus,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const updateRequest = mutation({
  args: {
    requestId: v.id("requests"),
    title: v.optional(v.string()),
    boards: v.optional(v.number()),
    estimatedTaskDurationMinutes: v.optional(v.number()),
    sourcerId: v.optional(v.id("users")),
    startLocationId: v.optional(v.id("locations")),
    endLocationId: v.optional(v.id("locations")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "requests");

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("requestId", (q) => q.eq("requestId", args.requestId))
      .first();
    if (existingTasks) {
      throw new ConvexError("Cannot modify a request that has derived tasks");
    }

    const update: Partial<Doc<"requests">> = {};
    if (args.title !== undefined) update.title = args.title;
    if (args.boards !== undefined) {
      if (args.boards <= 0) throw new ConvexError("Boards must be > 0");
      update.boards = args.boards;
    }
    if (args.estimatedTaskDurationMinutes !== undefined) {
      if (args.estimatedTaskDurationMinutes <= 0)
        throw new ConvexError("Duration must be > 0");
      update.estimatedTaskDurationMinutes = args.estimatedTaskDurationMinutes;
    }
    if (args.sourcerId !== undefined) update.sourcerId = args.sourcerId;
    if (args.startLocationId !== undefined)
      update.startLocationId = args.startLocationId;
    if (args.endLocationId !== undefined)
      update.endLocationId = args.endLocationId;
    if (args.notes !== undefined) update.notes = args.notes;

    update.updatedAt = Date.now();

    await ctx.db.patch(args.requestId, update);
    return await ctx.db.get(args.requestId);
  },
});

export const deleteRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "requests");

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("requestId", (q) => q.eq("requestId", args.requestId))
      .first();
    if (existingTasks) {
      throw new ConvexError("Cannot delete a request that has derived tasks");
    }

    await ctx.db.delete(args.requestId);
    return { ok: true as const };
  },
});

export const assignToVehicles = mutation({
  args: {
    requestId: v.id("requests"),
    assignments: v.array(
      v.object({
        vehicleId: v.id("vehicles"),
        boards: v.number(),
        estimatedDurationMinutes: v.optional(v.number()),
        scheduledDate: v.optional(v.string()), // YYYY-MM-DD
        scheduledStartMinute: v.optional(v.number()),
        scheduledEndMinute: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "task-assignment");

    await assignVehiclesToRequest(ctx, args.requestId, args.assignments);

    return { ok: true as const };
  },
});

/**
 * @deprecated Prefer `listPendingRequestsWithSummary` or
 * `paginateFinishedRequestsWithSummary` for indexed, scalable access patterns.
 */
// (Removed legacy listRequestsWithSummary in favor of indexed endpoints)

// New optimized endpoints per plan
export const listPendingRequestsWithSummary = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "requests");
    const cap = Math.max(1, Math.min(args.limit ?? 200, 500));

    const incoming = await ctx.db
      .query("requests")
      .withIndex("statusUpdatedAt", (q) => q.eq("status", "incoming"))
      .order("desc")
      .take(cap);

    const partial = await ctx.db
      .query("requests")
      .withIndex("statusUpdatedAt", (q) => q.eq("status", "partially_assigned"))
      .order("desc")
      .take(cap);

    const merged = [...incoming, ...partial]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, cap);

    return merged.map((r) => ({
      request: r,
      sumAssignedBoards: (r as { assignedBoards?: number }).assignedBoards ?? 0,
      completedBoards: (r as { completedBoards?: number }).completedBoards ?? 0,
    }));
  },
});

export const paginateFinishedRequestsWithSummary = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "requests");
    const page = await ctx.db
      .query("requests")
      .withIndex("statusUpdatedAt", (q) => q.eq("status", "finished"))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((r) => ({
        request: r,
        sumAssignedBoards:
          (r as { assignedBoards?: number }).assignedBoards ?? 0,
        completedBoards:
          (r as { completedBoards?: number }).completedBoards ?? 0,
      })),
    };
  },
});
