import { api } from "@acme/backend/convex/_generated/api";
import type { Id } from "@acme/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Mail, MoreHorizontal, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { guardAbility } from "@/auth/guard";
import { useAuth } from "@/auth/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/users")({
  beforeLoad: guardAbility("users"),
  component: UsersPage,
});

type UserRole = "admin" | "user";

function UsersPage() {
  const { currentUser } = useAuth();
  const users = useQuery(api.domains.users.api.list);
  const updateRole = useMutation(api.domains.users.api.updateRole);
  const removeUser = useMutation(api.domains.users.api.remove);
  const toggleActive = useMutation(api.domains.users.api.toggleActive);

  const [roleDialog, setRoleDialog] = useState<{
    userId: Id<"users">;
    role: UserRole;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Id<"users"> | null>(null);

  if (users === undefined) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> User Management
              </CardTitle>
              <CardDescription>
                Manage user roles. Users are created via WorkOS.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <a
                href="https://dashboard.workos.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" /> WorkOS
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {(
                            user.name?.[0] ??
                            user.email?.[0] ??
                            "U"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.name ?? "Unnamed"}
                        </div>
                        {user.email && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin" ? "destructive" : "secondary"
                      }
                    >
                      {user.role ?? "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive === false ? "outline" : "default"}
                    >
                      {user.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setRoleDialog({
                              userId: user._id,
                              role: user.role ?? "user",
                            })
                          }
                        >
                          Change role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await toggleActive({ userId: user._id });
                              toast.success(
                                user.isActive === false
                                  ? "Activated"
                                  : "Deactivated"
                              );
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed"
                              );
                            }
                          }}
                        >
                          {user.isActive === false ? "Activate" : "Deactivate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteDialog(user._id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {users.length}
          </div>
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Select a new role for this user.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={roleDialog?.role}
                onValueChange={(v) =>
                  roleDialog &&
                  setRoleDialog({ ...roleDialog, role: v as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRoleDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!roleDialog) return;
                try {
                  await updateRole(roleDialog);
                  toast.success("Role updated");
                  setRoleDialog(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!deleteDialog) return;
                try {
                  await removeUser({ userId: deleteDialog });
                  toast.success("Deleted");
                  setDeleteDialog(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
