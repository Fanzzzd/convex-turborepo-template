import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import { requireAbility, requireUser } from "../../_shared/auth";

export const listVehicles = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const vehicles = await ctx.db.query("vehicles").collect();
    if (vehicles.length === 0) return [];
    // Batch fetch drivers to avoid N+1 calls
    const uniqueDriverIds = [...new Set(vehicles.map((v) => v.driverId))];
    const drivers = await Promise.all(
      uniqueDriverIds.map((id) => ctx.db.get(id))
    );
    const driverMap = new Map();
    for (const d of drivers) {
      if (d) driverMap.set(d._id, d.name);
    }
    return vehicles.map((v) => ({
      ...v,
      driverName: driverMap.get(v.driverId) ?? null,
    })) as Array<Doc<"vehicles"> & { driverName: string | null }>;
  },
});

export const paginateVehicles = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const page = await ctx.db.query("vehicles").paginate(args.paginationOpts);
    if (page.page.length === 0) return page;
    const uniqueDriverIds = [...new Set(page.page.map((v) => v.driverId))];
    const drivers = await Promise.all(
      uniqueDriverIds.map((id) => ctx.db.get(id))
    );
    const driverMap = new Map();
    for (const d of drivers) {
      if (d) driverMap.set(d._id, d.name);
    }
    return {
      ...page,
      page: page.page.map((v) => ({
        ...v,
        driverName: driverMap.get(v.driverId) ?? null,
      })) as Array<Doc<"vehicles"> & { driverName: string | null }>,
    };
  },
});

export const createVehicle = mutation({
  args: {
    plate: v.string(),
    boardCapacity: v.number(),
    driverId: v.id("users"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "vehicles");
    const existing = await ctx.db
      .query("vehicles")
      .withIndex("plate", (q) => q.eq("plate", args.plate))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("vehicles", args);
  },
});
