import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { requireAbility } from "../../_shared/auth";

// Get all todos for the current user
export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    await requireAbility(ctx, "read", "todo");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    return await ctx.db
      .query("todos")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Create a new todo
export const createTodo = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "todo");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    if (!args.text.trim()) {
      throw new ConvexError("Todo text cannot be empty");
    }
    return await ctx.db.insert("todos", {
      text: args.text.trim(),
      completed: false,
      userId,
      createdAt: Date.now(),
    });
  },
});

// Toggle todo completion status
export const toggleTodo = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "todo");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      throw new ConvexError("Todo not found");
    }
    if (todo.userId !== userId) {
      throw new ConvexError("Not authorized to modify this todo");
    }
    await ctx.db.patch(args.todoId, {
      completed: !todo.completed,
    });
  },
});

// Delete a todo
export const deleteTodo = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "todo");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      throw new ConvexError("Todo not found");
    }
    if (todo.userId !== userId) {
      throw new ConvexError("Not authorized to delete this todo");
    }
    await ctx.db.delete(args.todoId);
  },
});
