import { api } from "@acme/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

export const Route = createFileRoute("/todo")({
  beforeLoad: guardAbility("todo"),
  component: TodoPage,
});

function TodoPage() {
  const todos = useQuery(api.domains.todos.api.list);
  const create = useMutation(api.domains.todos.api.create);
  const toggle = useMutation(api.domains.todos.api.toggle);
  const remove = useMutation(api.domains.todos.api.remove);

  const [text, setText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("Text required");
    setIsCreating(true);
    setError(null);
    try {
      await create({ text });
      setText("");
      toast.success("Created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  if (todos === undefined) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
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
          <CardDescription>Manage your tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="mb-6">
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="new-todo">New Todo</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="new-todo"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter a new todo..."
                    disabled={isCreating}
                  />
                  <Button type="submit" disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>
          </form>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No todos yet
              </div>
            ) : (
              todos.map((todo, i) => (
                <div key={todo._id}>
                  <div
                    className={`flex items-center gap-3 p-4 rounded-lg border ${todo.completed ? "bg-muted/50" : "hover:bg-accent/50"}`}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() =>
                        toggle({ id: todo._id }).catch((e) =>
                          toast.error(e.message)
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {todo.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={todo.completed ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {todo.completed ? "Done" : "Pending"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        remove({ id: todo._id })
                          .then(() => toast.success("Deleted"))
                          .catch((e) => toast.error(e.message))
                      }
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {i < todos.length - 1 && <Separator className="my-2" />}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
