"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Plus } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getDeadlines, updateDeadline, type Deadline } from "@/lib/api";

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Deadline | "new" | null>(null);

  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });

  const toggleDeadlineMutation = useMutation({
    mutationFn: (deadline: Deadline) =>
      updateDeadline(deadline.id, { completed: !deadline.completed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });

  const datedItems = [...(deadlines.data ?? [])]
    .filter((item) => item.expire_date)
    .sort((a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!));
  const openItems = (deadlines.data ?? []).filter((item) => !item.expire_date);

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Все задания</h1>
        <Button className="h-11" onClick={() => setSheet("new")}>
          <Plus /> Новое задание
        </Button>
      </div>

      <Tabs defaultValue="dated" className="mt-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-muted p-1">
          <TabsTrigger value="dated" className="rounded-xl text-[14px]">
            С дедлайнами{" "}
            <span className="ml-1 rounded-full bg-brand-primary-light px-2 py-0.5 text-[12px] font-semibold text-brand-primary">
              {datedItems.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="open" className="rounded-xl text-[14px]">
            Бессрочные{" "}
            <span className="ml-1 rounded-full bg-brand-primary-light px-2 py-0.5 text-[12px] font-semibold text-brand-primary">
              {openItems.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dated" className="mt-3">
          {datedItems.length === 0 ? (
            <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
                <Inbox className="size-5" />
              </span>
              <p className="mt-3 text-h3">Заданий с дедлайнами пока нет</p>
              <p className="mt-1 text-caption text-text-secondary">
                Добавьте домашку, проект или реферат — список выстроится от
                самых срочных к дальним.
              </p>
              <Button className="mt-4 h-11" onClick={() => setSheet("new")}>
                <Plus /> Новое задание
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-3xl bg-card px-4 ring-1 ring-border">
              {datedItems.map((item) => (
                <DeadlineItem
                  key={item.id}
                  deadline={item}
                  done={Boolean(item.completed)}
                  onToggle={() => toggleDeadlineMutation.mutate(item)}
                  onEdit={() => setSheet(item)}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="open" className="mt-3">
          {openItems.length === 0 ? (
            <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
              <p className="text-h3">Бессрочных заданий пока нет</p>
              <p className="mt-1 text-caption text-text-secondary">
                У бессрочных заданий нет даты и цветового индикатора.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-3xl bg-card px-4 ring-1 ring-border">
              {openItems.map((item) => (
                <DeadlineItem
                  key={item.id}
                  deadline={item}
                  done={Boolean(item.completed)}
                  onToggle={() => toggleDeadlineMutation.mutate(item)}
                  onEdit={() => setSheet(item)}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <p className="mt-3 text-caption text-text-secondary">
        Отмеченное задание считается выполненным везде и исчезает из списков
        через 12 часов.
      </p>

      <AssignmentSheet
        key={sheet === "new" ? "new" : sheet?.id ?? "closed"}
        open={sheet != null}
        deadline={sheet === "new" || sheet == null ? undefined : sheet}
        onClose={() => setSheet(null)}
      />
    </AppShell>
  );
}
