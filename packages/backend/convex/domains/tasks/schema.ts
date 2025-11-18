import { defineTable } from "convex/server";
import type { Infer } from "convex/values";
import { v } from "convex/values";

export const taskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("assigned"),
  v.literal("completed")
);

export type TaskStatus = Infer<typeof taskStatusValidator>;

export const tables = {
  tasks: defineTable({
    boards: v.number(), // Boards count
    requestId: v.id("requests"), // Parent request (required)
    assignedVehicleId: v.optional(v.id("vehicles")), // Assigned vehicle
    estimatedDurationMinutes: v.optional(v.number()), // Estimated duration
    status: v.optional(taskStatusValidator),
    // Scheduling fields (per-day planning)
    scheduledDate: v.optional(v.string()), // YYYY-MM-DD
    scheduledStartMinute: v.optional(v.number()),
    scheduledEndMinute: v.optional(v.number()),
  })
    .index("requestId", ["requestId"]) // Query tasks by request
    .index("scheduledDate", ["scheduledDate"]) // Query by date
    .index("vehicleAndDate", ["assignedVehicleId", "scheduledDate"]), // Vehicle + date
};
