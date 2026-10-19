"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, ListChecks, UserRound } from "lucide-react";
import { cn } from "cn";

const tabs = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/plans", label: "Мои планы", icon: CalendarDays },
  { href: "/assignments", label: "Задания", icon: ListChecks },
  { href: "/schedule", label: "Пары", icon: ClipboardList },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
