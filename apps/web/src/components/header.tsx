import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/useAuth";
import { Button } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu";

export default function Header() {
  const { isAuthenticated, can } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <NavigationMenu>
          <NavigationMenuList>
            {[
              { label: "Users", to: "/users" as const, subject: "users" as const },
              { label: "Todo", to: "/todo" as const, subject: "todo" as const },
            ]
              .filter((item) => can("read", item.subject))
              .map((item) => (
                <NavigationMenuItem key={item.to}>
                  <NavigationMenuLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="default">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
      <hr />
    </div>
  );
}
