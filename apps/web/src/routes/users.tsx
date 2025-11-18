import { api } from "@acme/backend/convex/_generated/api";
import type { Id } from "@acme/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@/auth/useAuth";
import {
  Calendar,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { guardAbility } from "@/auth/guard";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  component: UsersComponent,
});

type UserRole = "admin" | "user";

interface User {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
  role?: UserRole;
  emailVerificationTime?: number;
  isAnonymous?: boolean;
  isActive?: boolean;
}

const getRoleBadgeVariant = (role: string | undefined) => {
  switch (role) {
    case "admin":
      return "destructive";
    case "user":
      return "default";
    default:
      return "secondary";
  }
};

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (name: string | undefined, email: string | undefined) => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
};

function UsersComponent() {
  const { currentUser } = useAuth();
  const users = useQuery(api.domains.users.api.getAllUsers);
  const createUser = useAction(api.domains.users.api.createUser);
  const updateUser = useMutation(api.domains.users.api.updateUser);
  const deleteUser = useAction(api.domains.users.api.deleteUser);
  const deactivateUser = useAction(api.domains.users.api.deactivateUser);
  const activateUser = useAction(api.domains.users.api.activateUser);
  const resetPassword = useAction(api.domains.users.api.resetPassword);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states for create
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Form states for edit
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user" as UserRole,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Form states for reset password
  const [resetForm, setResetForm] = useState({
    password: "",
    confirm: "",
  });
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});
  const [isResetting, setIsResetting] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser?.role === "admin";

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
    });
    setEditErrors({});
    setEditDialogOpen(true);
  };

  const handleResetClick = (user: User) => {
    if (!user.email) {
      toast.error(
        "This user does not have an email and cannot use password login"
      );
      return;
    }
    setSelectedUser(user);
    setResetForm({ password: "", confirm: "" });
    setResetErrors({});
    setResetDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCreateUser = async () => {
    // Validation
    const errors: Record<string, string> = {};
    if (!createForm.name.trim()) errors.name = "Name is required";
    if (!createForm.email.trim()) errors.email = "Email is required";
    if (!createForm.email.includes("@")) errors.email = "Invalid email format";
    if (!createForm.password || createForm.password.length < 8)
      errors.password = "Password must be at least 8 characters";

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsCreating(true);
    try {
      await createUser(createForm);
      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
      setCreateErrors({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      toast.error(message);
      setCreateErrors({ form: message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    // Validation
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = "Name is required";
    if (!editForm.email.trim()) errors.email = "Email is required";
    if (!editForm.email.includes("@")) errors.email = "Invalid email format";

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsEditing(true);
    try {
      await updateUser({
        userId: selectedUser._id,
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      });
      toast.success("User updated successfully");
      setEditDialogOpen(false);
      setSelectedUser(null);
      setEditErrors({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update user";
      toast.error(message);
      setEditErrors({ form: message });
    } finally {
      setIsEditing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    // Validation
    const errors: Record<string, string> = {};
    if (!resetForm.password || resetForm.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }
    if (resetForm.password !== resetForm.confirm) {
      errors.confirm = "Passwords do not match";
    }
    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword({
        userId: selectedUser._id,
        newPassword: resetForm.password,
      });
      toast.success(
        "Password reset successfully. The user will be signed out."
      );
      setResetDialogOpen(false);
      setSelectedUser(null);
      setResetErrors({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
      setResetErrors({ form: message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);
    try {
      await deleteUser({ userId: selectedUser._id });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (users === undefined) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </div>
            <CardDescription>
              You do not have permission to view this page. Admin access is
              required.
            </CardDescription>
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
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage and view all registered users in the system
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: User) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={user.image}
                              alt={user.name || "User"}
                            />
                            <AvatarFallback>
                              {getInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.name || "Unnamed User"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email || user.phone || "No contact"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.emailVerificationTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isActive === false ? (
                          <Badge variant="destructive">Inactive</Badge>
                        ) : user.isAnonymous ? (
                          <Badge variant="outline">Anonymous</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(user)}
                            >
                              Edit user
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetClick(user)}
                            >
                              Reset password
                            </DropdownMenuItem>
                            {user.isActive === false ? (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await activateUser({ userId: user._id });
                                    toast.success("User activated");
                                  } catch (e) {
                                    toast.error(
                                      e instanceof Error
                                        ? e.message
                                        : "Failed to activate"
                                    );
                                  }
                                }}
                              >
                                Activate user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await deactivateUser({ userId: user._id });
                                    toast.success("User deactivated");
                                  } catch (e) {
                                    toast.error(
                                      e instanceof Error
                                        ? e.message
                                        : "Failed to deactivate"
                                    );
                                  }
                                }}
                              >
                                Deactivate user
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(user)}
                              variant="destructive"
                            >
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Total users: <span className="font-medium">{users.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. Fill in all required fields.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="create-name">Full Name</FieldLabel>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="John Doe"
                disabled={isCreating}
              />
              {createErrors.name && (
                <FieldError>{createErrors.name}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-email">Email</FieldLabel>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="john@example.com"
                disabled={isCreating}
              />
              {createErrors.email && (
                <FieldError>{createErrors.email}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-password">Password</FieldLabel>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Min. 6 characters"
                disabled={isCreating}
              />
              {createErrors.password && (
                <FieldError>{createErrors.password}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-role">Role</FieldLabel>
              <Select
                value={createForm.role}
                onValueChange={(value: UserRole) =>
                  setCreateForm({ ...createForm, role: value })
                }
                disabled={isCreating}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {createErrors.form && <FieldError>{createErrors.form}</FieldError>}
          </FieldGroup>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-name">Full Name</FieldLabel>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="John Doe"
                disabled={isEditing}
              />
              {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-email">Email</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="john@example.com"
                disabled={isEditing}
              />
              {editErrors.email && <FieldError>{editErrors.email}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-role">Role</FieldLabel>
              <Select
                value={editForm.role}
                onValueChange={(value: UserRole) =>
                  setEditForm({ ...editForm, role: value })
                }
                disabled={isEditing}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {editErrors.form && <FieldError>{editErrors.form}</FieldError>}
          </FieldGroup>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for the selected user. They will be signed
              out on all devices.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-password">New Password</FieldLabel>
              <Input
                id="reset-password"
                type="password"
                value={resetForm.password}
                onChange={(e) =>
                  setResetForm({ ...resetForm, password: e.target.value })
                }
                placeholder="Min. 8 characters"
                disabled={isResetting}
              />
              {resetErrors.password && (
                <FieldError>{resetErrors.password}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="reset-confirm">Confirm Password</FieldLabel>
              <Input
                id="reset-confirm"
                type="password"
                value={resetForm.confirm}
                onChange={(e) =>
                  setResetForm({ ...resetForm, confirm: e.target.value })
                }
                placeholder="Re-enter new password"
                disabled={isResetting}
              />
              {resetErrors.confirm && (
                <FieldError>{resetErrors.confirm}</FieldError>
              )}
            </Field>
            {resetErrors.form && <FieldError>{resetErrors.form}</FieldError>}
          </FieldGroup>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user{" "}
              <span className="font-semibold">
                {selectedUser?.name || selectedUser?.email}
              </span>{" "}
              and remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
