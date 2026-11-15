import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { ArrowUpDown, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { createTaskSchema } from "../../../shared/schemas";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type Task = {
  id: number;
  title: string;
  completed: boolean;
  userId: string;
  createdAt: string;
};

function DashboardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.api.tasks.$get();
      if (!res.ok) {
        throw new Error("Failed to load tasks");
      }
      const data = await res.json();
      return data.tasks as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (title: string) => {
      const res = await api.api.tasks.$post({ json: { title } });
      if (!res.ok) {
        throw new Error("Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task created");
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not create task");
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await api.api.tasks[":id"].$patch({
        param: { id: String(id) },
        json: { completed },
      });
      if (!res.ok) {
        throw new Error("Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Failed to update task"),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.api.tasks[":id"].$delete({
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw new Error("Failed to delete task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task deleted");
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const form = useForm({
    defaultValues: { title: "" },
    validators: {
      onSubmit: createTaskSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await createTask.mutateAsync(value.title);
      formApi.reset();
    },
  });

  const columns = useMemo<LegacyColumnDef<Task>[]>(
    () => [
      {
        accessorKey: "completed",
        header: "Status",
        cell: ({ row }) => {
          const task = row.original;
          return (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
            >
              {task.completed ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
            </Button>
          );
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-1.5 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.completed ? "text-muted-foreground line-through" : "font-medium"
            }
          >
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete task"
              onClick={() => deleteTask.mutate(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [toggleTask, deleteTask],
  );

  const table = useLegacyTable({
    data: tasksQuery.data ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user.name} ({session?.user.email})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            Protected CRUD powered by Hono + Zod + Drizzle + TanStack Query, Form &amp; Table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="flex items-start gap-2"
          >
            <form.Field name="title">
              {(field) => (
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Add a new task..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors
                        .map((err) =>
                          typeof err === "string" ? err : (err?.message ?? "Invalid value"),
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Adding..." : "Add Task"}
            </Button>
          </form>

          <Input
            placeholder="Filter tasks..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {tasksQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Loading tasks...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No tasks yet. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
