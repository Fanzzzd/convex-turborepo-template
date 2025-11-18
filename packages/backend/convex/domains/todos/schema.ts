import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("userId_completed", ["userId", "completed"]),
};
