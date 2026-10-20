import type { Deadline, Event, User } from "@/lib/api";
import { addDays, isoDate, startOfWeek } from "@/lib/urgency";

const SEEDED = "planner_demo_seeded";

export type Affair = {
  id: number;
  title: string;
  when: string;
};

function at(day: Date, hours: number, minutes = 0) {
  const copy = new Date(day);
  copy.setHours(hours, minutes, 0, 0);
  return copy.toISOString();
}

export function ensureDemoData() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEDED)) return;

  const monday = startOfWeek(new Date());
  const deadlines: Deadline[] = [
    ["ДЗ по мат. анализу", 2, "Задачи 4.1–4.12 из задачника"],
    ["Проект по ОРГ", 3, null],
    ["Лабораторная по физике", 8, null],
    ["Реферат по истории", 12, "10–15 страниц, реформы Петра I"],
    ["Курсовая работа", 40, null],
    ["Презентация по проекту", 50, null],
    ["Разобрать конспекты за семестр", null, null],
    ["Выучить английские слова", null, null],
    ["Подготовить портфолио", null, "Собрать работы за модуль"],
  ].map(([title, offset, comment], index) => ({
    id: index + 1,
    title: String(title),
    description: null,
    expire_date:
      offset == null ? null : at(addDays(monday, Number(offset)), 23, 59),
    repeat: false,
    difficulty: null,
    tag: null,
    comment: comment == null ? null : String(comment),
    send_notification: false,
  }));

  const events: Event[] = [
    ["Мат. анализ", 0, "09:30", "11:00", "к. 2, ауд. 214"],
    ["Физика", 0, "11:10", "12:40", "к. 1, ауд. 108"],
    ["Алгоритмы", 1, "11:10", "12:40", null],
    ["Физика", 1, "13:00", "14:30", null],
    ["История", 2, "09:30", "11:00", null],
    ["Мат. анализ", 2, "11:10", "12:40", null],
    ["Философия", 3, "09:30", "11:00", null],
    ["Англ. язык", 3, "13:00", "14:30", null],
    ["Мат. анализ", 4, "11:10", "12:40", null],
    ["История", 4, "13:00", "14:30", null],
    ["Алгоритмы", 5, "09:30", "11:00", null],
  ].map(([name, offset, start, end, description], index) => ({
    id: index + 1,
    name: String(name),
    description: description == null ? null : String(description),
    start_time: String(start),
    end_time: String(end),
    event_date: isoDate(addDays(monday, Number(offset))),
  }));

  const user: User = {
    name: "Студент",
    surname: "",
    email: "dev@local",
    sleepTimeHours: 8,
    goToSleepTime: "23:00",
    wakeUpTime: "07:00",
  };

  const affairs: Affair[] = [
    { id: 1, title: "Секция", when: "Вт, Чт · 18:00–20:00" },
    { id: 2, title: "Английский клуб", when: "Пн · 18:30–20:00" },
    { id: 3, title: "Подработка", when: "Сб · 12:00–16:00" },
  ];

  const savedDeadlines = localStorage.getItem("planner_local_deadlines");
  if (!savedDeadlines || savedDeadlines === "[]") {
    localStorage.setItem("planner_local_deadlines", JSON.stringify(deadlines));
  }
  const savedEvents = localStorage.getItem("planner_local_events");
  if (!savedEvents || savedEvents === "[]") {
    localStorage.setItem("planner_local_events", JSON.stringify(events));
  }
  if (!localStorage.getItem("planner_local_user")) {
    localStorage.setItem("planner_local_user", JSON.stringify(user));
  }
  if (!localStorage.getItem("planner_local_affairs")) {
    localStorage.setItem("planner_local_affairs", JSON.stringify(affairs));
  }
  localStorage.setItem(
    "planner_local_ids",
    JSON.stringify({ deadline: 20, event: 20, affair: 4 }),
  );
  localStorage.setItem(SEEDED, "1");
  if (localStorage.getItem("planner_onboarded") == null) {
    localStorage.setItem("planner_onboarded", "1");
  }
}
