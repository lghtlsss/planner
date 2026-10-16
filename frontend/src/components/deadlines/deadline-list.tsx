"use client";

import { Deadline } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";

const getExamplesDeadlines = async (): Promise<Deadline[]> => {
  return await new Promise((resolve) => {
    setTimeout(
      () =>
        resolve([
          {
            id: 1,
            title: "Test1",
            expire_date: null,
            comment: null,
            description: null,
            difficulty: null,
            repeat: false,
            send_notification: false,
            tag: null,
          },
          {
            id: 2,
            title: "Test2 Test Test ",
            expire_date: null,
            comment: null,
            description: null,
            difficulty: null,
            repeat: false,
            send_notification: false,
            tag: null,
          },
          {
            id: 3,
            title: "Test3ehwiwu. wi i bwifiwb w bw",
            expire_date: null,
            comment: null,
            description: null,
            difficulty: null,
            repeat: false,
            send_notification: false,
            tag: null,
          },
        ]),
      2000,
    );
  });
};

const fallback = [1, 2, 3, 4, 5];

type Props = {
  style?: "default" | "checkbox" | "radio";
  selectedId?: number;
  toggleChecked?: (deadline: Deadline) => void;
};

export const DeadlineList = ({
  style = "default",
  selectedId,
  toggleChecked,
}: Props) => {
  const { data, isPending } = useQuery({
    queryKey: ["deadlines"],
    queryFn: getExamplesDeadlines,
  });

  return (
    <ul className="flex w-fit flex-col gap-2 border-2 p-2">
      {data?.map((deadline) => (
        <li key={deadline.id}>
          <label className="flex h-10 w-3xs cursor-pointer items-center gap-2 overflow-hidden rounded-xl border-2 p-2">
            {style === "checkbox" && (
              <Input
                type="checkbox"
                onChange={() => toggleChecked?.(deadline)}
                className="size-4 shrink-0 p-0 shadow-none"
              />
            )}
            {style === "radio" && (
              <Input
                type="radio"
                name="deadlines"
                checked={selectedId === deadline.id}
                onChange={() => toggleChecked?.(deadline)}
                className="size-4 shrink-0 p-0 shadow-none"
              />
            )}
            <span className="truncate text-sm">{deadline.title}</span>
          </label>
        </li>
      ))}

      {isPending &&
        fallback.map((id) => (
          <li key={id}>
            <Skeleton className="h-10 w-3xs rounded-xl p-2" />
          </li>
        ))}
    </ul>
  );
};
