import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { requireAbility, requireUser } from "../../_shared/auth";

export const listLocations = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("locations").collect();
  },
});

export const paginateLocations = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.query("locations").paginate(args.paginationOpts);
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "locations");
    const id = await ctx.db.insert("locations", args);
    return id;
  },
});
