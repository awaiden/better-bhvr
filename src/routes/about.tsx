import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <p className="text-slate-400">
        This page is rendered by TanStack Router on the client. In production, Hono serves{" "}
        <code className="text-slate-200">dist/index.html</code> for non-
        <code className="text-slate-200">/api/*</code> routes so direct page reloads work
        seamlessly.
      </p>
    </div>
  );
}
