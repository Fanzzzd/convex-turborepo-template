import { defineTable } from "convex/server";
import { v } from "convex/values";

export type RequestStatus = "incoming" | "partially_assigned" | "finished";

export const tables = {
  requests: defineTable({
    title: v.string(),
    boards: v.number(),
    estimatedTaskDurationMinutes: v.number(),
    sourcerId: v.id("users"),
    startLocationId: v.id("locations"),
    endLocationId: v.id("locations"),
    notes: v.optional(v.string()),
    assignedBoards: v.number(),
    completedBoards: v.number(),
    status: v.union(
      v.literal("incoming"),
      v.literal("partially_assigned"),
      v.literal("finished")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("sourcerId", ["sourcerId"]) // Filter by sourcer
    .index("createdAt", ["createdAt"]) // Sort by creation time
    .index("statusUpdatedAt", ["status", "updatedAt"]),
};
