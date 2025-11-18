import { api } from "@acme/backend/convex/_generated/api";
import type { Id } from "@acme/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { guardAbility } from "@/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/todo")({
  beforeLoad: guardAbility("todo"),
  component: TodoComponent,
});

interface Todo {
  _id: Id<"todos">;
  _creationTime: number;
  text: string;
  completed: boolean;
  userId: Id<"users">;
  createdAt: number;
}

function TodoComponent() {
  const todos = useQuery(api.domains.todos.api.getTodos);
  const createTodo = useMutation(api.domains.todos.api.createTodo);
  const toggleTodo = useMutation(api.domains.todos.api.toggleTodo);
  const deleteTodo = useMutation(api.domains.todos.api.deleteTodo);

  const [newTodoText, setNewTodoText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) {
      setError("Todo text cannot be empty");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await createTodo({ text: newTodoText });
      setNewTodoText("");
      toast.success("Todo created");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create todo";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTodo = async (todoId: Id<"todos">) => {
    try {
      await toggleTodo({ todoId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to toggle todo";
      toast.error(message);
    }
  };

  const handleDeleteTodo = async (todoId: Id<"todos">) => {
    try {
      await deleteTodo({ todoId });
      toast.success("Todo deleted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete todo";
      toast.error(message);
    }
  };

  if (todos === undefined) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>
            Manage your tasks and stay organized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTodo} className="mb-6">
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="new-todo">New Todo</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="new-todo"
                    value={newTodoText}
                    onChange={(e) => {
                      setNewTodoText(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter a new todo..."
                    disabled={isCreating}
                    aria-invalid={!!error}
                  />
                  <Button type="submit" disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>
          </form>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No todos yet. Create your first todo above!
              </div>
            ) : (
              todos.map((todo: Todo, index: number) => (
                <div key={todo._id}>
                  <div
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                      todo.completed
                        ? "bg-muted/50 border-muted"
                        : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo._id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm ${
                          todo.completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {todo.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={todo.completed ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {todo.completed ? "Completed" : "Pending"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo._id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < todos.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

