"use client";

import { useQuery } from "@tanstack/react-query";
import { OpenDeadlineFormButton } from "@/components/deadlines/open-deadline-form-button";
import { DeadlineRow } from "@/components/deadlines/deadline-row";
import { AppShell } from "@/components/mobile/app-shell";
import { getDeadlines } from "@/lib/api";

export default function AssignmentsPage() {
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });

  const items = [...(deadlines.data ?? [])].sort((a, b) => {
    const left = a.expire_date ? new Date(a.expire_date).getTime() : Infinity;
    const right = b.expire_date ? new Date(b.expire_date).getTime() : Infinity;
    return left - right;
  });

  return (
    <AppShell title="Все задания" action={<OpenDeadlineFormButton />}>
      {deadlines.isPending && (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      )}
      {deadlines.isError && (
        <p className="text-sm text-destructive">Не удалось загрузить задания</p>
      )}
      {!deadlines.isPending && !deadlines.isError && items.length === 0 && (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Заданий пока нет
        </p>
      )}
      <ul className="space-y-2">
        {items.map((deadline) => (
          <DeadlineRow key={deadline.id} deadline={deadline} />
        ))}
      </ul>
    </AppShell>
  );
}
