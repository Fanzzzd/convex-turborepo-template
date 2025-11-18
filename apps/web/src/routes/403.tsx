import { createFileRoute } from "@tanstack/react-router";

function ForbiddenPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-lg font-medium">403 — Access Denied</div>
      <div className="text-sm text-muted-foreground">
        You don&apos;t have permission to view this page.
      </div>
    </div>
  );
}

export const Route = createFileRoute("/403")({
  component: ForbiddenPage,
});
