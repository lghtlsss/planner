"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Button } from "@/components/ui/button";
import { getDeadlines, type Deadline } from "@/lib/api";
import { doneIds, toggleDone } from "@/lib/extras";
import { cn } from "cn";

export default function AssignmentsPage() {
  const [tab, setTab] = useState<"dated" | "open">("dated");
  const [sheet, setSheet] = useState<Deadline | "new" | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  useEffect(() => setDone(doneIds()), []);
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: getDeadlines });
  const items = (deadlines.data ?? []).filter((item) =>
    tab === "dated" ? item.expire_date : !item.expire_date,
  );
  const datedCount = (deadlines.data ?? []).filter((item) => item.expire_date).length;
  const openCount = (deadlines.data ?? []).filter((item) => !item.expire_date).length;

  function flip(id: number) {
    toggleDone(id);
    setDone(doneIds());
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Все задания</h1>
        <Button className="h-11" onClick={() => setSheet("new")}>
          <Plus /> Новое задание
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#ECEEF2] p-1 text-[14px] font-medium">
        <button type="button" className={cn("rounded-xl py-2", tab === "dated" && "bg-white")} onClick={() => setTab("dated")}>
          С дедлайнами {datedCount}
        </button>
        <button type="button" className={cn("rounded-xl py-2", tab === "open" && "bg-white")} onClick={() => setTab("open")}>
          Бессрочные {openCount}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-card p-6 text-center text-text-secondary ring-1 ring-[#E3E5EC]">
          Заданий пока нет
        </p>
      ) : (
        <ul className="mt-3 rounded-3xl bg-card px-3 ring-1 ring-[#E3E5EC]">
          {items.map((item) => (
            <DeadlineItem
              key={item.id}
              deadline={item}
              done={done.has(item.id)}
              onToggle={() => flip(item.id)}
              onEdit={() => setSheet(item)}
            />
          ))}
        </ul>
      )}
      <p className="mt-3 text-caption text-text-secondary">
        Отмеченное задание считается выполненным и исчезает из списков через 12 часов.
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
