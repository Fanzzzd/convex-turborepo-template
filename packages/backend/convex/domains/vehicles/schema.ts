import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  vehicles: defineTable({
    plate: v.string(),
    boardCapacity: v.number(), // Max boards capacity
    driverId: v.id("users"), // Linked driver
    isActive: v.optional(v.boolean()),
  })
    .index("plate", ["plate"])
    .index("driverId", ["driverId"]),
};
