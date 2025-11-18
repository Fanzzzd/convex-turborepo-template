import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  locations: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  }).index("name", ["name"]),
};
