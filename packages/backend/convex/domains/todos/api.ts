import { ConvexError, v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { requireAbility } from "../../_shared/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAbility(ctx, "read", "todo");
    return ctx.db
      .query("todos")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const user = await requireAbility(ctx, "write", "todo");
    if (!text.trim()) throw new ConvexError("Text required");
    return ctx.db.insert("todos", {
      text: text.trim(),
      completed: false,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const user = await requireAbility(ctx, "write", "todo");
    const todo = await ctx.db.get(id);
    if (!todo || todo.userId !== user._id) throw new ConvexError("Not found");
    await ctx.db.patch(id, { completed: !todo.completed });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const user = await requireAbility(ctx, "write", "todo");
    const todo = await ctx.db.get(id);
    if (!todo || todo.userId !== user._id) throw new ConvexError("Not found");
    await ctx.db.delete(id);
  },
});
