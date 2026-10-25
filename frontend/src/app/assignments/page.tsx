"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Inbox,
  Infinity as InfinityIcon,
  Info,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getDeadlines, updateDeadline, type Deadline } from "@/lib/api";

function AssignmentsSkeletonList() {
  return (
    <ul
      className="divide-y divide-border rounded-2xl bg-card px-5 ring-1 ring-border"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((id) => (
        <li
          key={id}
          className="flex items-center justify-between gap-3 py-3.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className="h-5 w-52 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Deadline | "new" | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dated");

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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(String(value))}
        className="mt-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted p-1 sm:w-auto sm:inline-flex">
            <TabsTrigger
              value="dated"
              className="rounded-lg px-4 text-[14px]"
            >
              С дедлайнами{" "}
              {!deadlines.isPending && (
                <span className="ml-1.5 rounded-full bg-brand-primary-light px-2 py-0.5 text-[12px] font-semibold text-brand-primary">
                  {datedItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="open" className="rounded-lg px-4 text-[14px]">
              Бессрочные{" "}
              {!deadlines.isPending && (
                <span className="ml-1.5 rounded-full bg-brand-primary-light px-2 py-0.5 text-[12px] font-semibold text-brand-primary">
                  {openItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <p className="hidden items-center gap-1.5 text-caption text-text-secondary sm:flex">
            <Info className="size-4 shrink-0 text-text-placeholder" />
            <span>
              {activeTab === "dated"
                ? "Сверху вниз: от красного к зелёному"
                : "У бессрочных заданий нет даты и цвета"}
            </span>
          </p>
        </div>

        <TabsContent value="dated" className="mt-4">
          {deadlines.isPending ? (
            <AssignmentsSkeletonList />
          ) : datedItems.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
                <Inbox className="size-5" />
              </span>
              <p className="mt-4 text-h3">Заданий с дедлайнами пока нет</p>
              <p className="mx-auto mt-1 max-w-sm text-caption text-text-secondary">
                Добавьте домашку, проект или реферат — список выстроится от
                самых срочных к дальним.
              </p>
              <Button className="mt-4 h-11" onClick={() => setSheet("new")}>
                <Plus /> Новое задание
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <div className="hidden items-center justify-between border-b border-border bg-bg-page/60 px-5 py-2.5 text-caption font-medium text-text-secondary sm:flex">
                <span className="pl-7">Задание</span>
                <span>Комментарий, ред. и дедлайн</span>
              </div>
              <ul className="divide-y divide-border px-5">
                {datedItems.map((item) => (
                  <DeadlineItem
                    key={item.id}
                    deadline={item}
                    done={Boolean(item.completed)}
                    showTime
                    onToggle={() => toggleDeadlineMutation.mutate(item)}
                    onEdit={() => setSheet(item)}
                  />
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="open" className="mt-4">
          {deadlines.isPending ? (
            <AssignmentsSkeletonList />
          ) : openItems.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
                <InfinityIcon className="size-5" />
              </span>
              <p className="mt-4 text-h3">Бессрочных заданий пока нет</p>
              <p className="mx-auto mt-1 max-w-sm text-caption text-text-secondary">
                У бессрочных заданий нет даты и цветового индикатора.
              </p>
              <Button className="mt-4 h-11" onClick={() => setSheet("new")}>
                <Plus /> Новое задание
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <div className="hidden items-center justify-between border-b border-border bg-bg-page/60 px-5 py-2.5 text-caption font-medium text-text-secondary sm:flex">
                <span className="pl-7">Задание</span>
                <span>Комментарий и ред.</span>
              </div>
              <ul className="divide-y divide-border px-5">
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
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="mt-3 flex items-center gap-1.5 text-caption text-text-secondary">
        <CheckCircle2 className="size-4 shrink-0 text-text-placeholder" />
        <span>
          Отмеченное задание считается выполненным везде и исчезает из списков
          через 12 часов.
        </span>
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
