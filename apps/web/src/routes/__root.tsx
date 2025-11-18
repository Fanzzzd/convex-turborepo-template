import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "@/components/header";
import type { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import "../index.css";

export const Route = createRootRouteWithContext<{ convex: ConvexReactClient }>()({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-lg font-medium">Page not found</div>
      <div className="text-sm text-muted-foreground">
        Please check the URL or return to the homepage
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      {
        title: "acme",
      },
      {
        name: "description",
        content: "acme is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <Header />
          {isFetching ? (
            <div className="flex h-full items-center justify-center pt-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
        <Toaster richColors />
      </ThemeProvider>
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-left" />
      )}
    </>
  );
}
