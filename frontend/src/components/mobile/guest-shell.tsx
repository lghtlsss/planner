"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Check, Clock3 } from "lucide-react";
import { useSession } from "@/lib/session";
import { BrandMark } from "./brand-mark";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Расписание пар",
    description:
      "Подключите ссылку на таблицу — изменения подсветятся сами",
  },
  {
    icon: Clock3,
    title: "Светофор дедлайнов",
    description: "Сразу видно, что горит, а что может подождать",
  },
  {
    icon: CalendarDays,
    title: "План на каждый день",
    description: "Расставляйте задачи по часам с учётом сна и дел",
  },
];

export function GuestShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  if (session) return null;

  return (
    <div className="min-h-dvh w-full lg:grid lg:grid-cols-2">
      {/* Десктопная левая бренд-панель по макету */}
      <aside className="hidden bg-brand-primary p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-white text-brand-primary">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <span className="text-[20px] font-semibold tracking-tight text-white">
            Планер
          </span>
        </div>

        <div className="my-auto max-w-md space-y-8">
          <h2 className="text-[36px] leading-[44px] font-bold tracking-tight text-white">
            Пары, дедлайны и планы на день — в одном месте
          </h2>

          <ul className="space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-[15px] leading-[22px] font-semibold text-white">
                      {feature.title}
                    </p>
                    <p className="mt-0.5 text-[14px] leading-[20px] text-white/80">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div />
      </aside>

      {/* Правая колонка с формой (и мобильный вид) */}
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-5 pt-14 pb-10 lg:max-w-none lg: items-center lg:justify-center lg:px-12 lg:py-12">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
