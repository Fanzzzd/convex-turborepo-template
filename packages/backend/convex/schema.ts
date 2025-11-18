import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import * as Locations from "./domains/locations/schema";
import * as Requests from "./domains/requests/schema";
import * as Tasks from "./domains/tasks/schema";
import * as Todos from "./domains/todos/schema";
import * as Users from "./domains/users/schema";
import * as Vehicles from "./domains/vehicles/schema";

export default defineSchema({
  ...authTables,
  ...Users.tables,
  ...Locations.tables,
  ...Vehicles.tables,
  ...Requests.tables,
  ...Tasks.tables,
  ...Todos.tables,
});
