import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import * as Todos from "./domains/todos/schema";
import * as Users from "./domains/users/schema";

export default defineSchema({
  ...authTables,
  ...Users.tables,
  ...Todos.tables,
});
