import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/status")({
  loader: async () => {
    const res = await api.api.health.$get();
    return res.json();
  },
  component: Status,
});

function Status() {
  const data = Route.useLoaderData();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">API Status</h1>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${data.ok ? "bg-emerald-400" : "bg-rose-500"}`} />
          <span className="font-mono text-sm">GET /api/health → {JSON.stringify(data)}</span>
        </div>
      </div>
    </div>
  );
}
