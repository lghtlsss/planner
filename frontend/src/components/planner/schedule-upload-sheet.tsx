"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { Sheet } from "@/components/mobile/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createScheduleSource, type AddSourceOut } from "@/lib/api";

export interface ScheduleUploadSheetProps {
  open: boolean;
  onClose: () => void;
  onUploaded?: (result: AddSourceOut) => void;
}

export function ScheduleUploadSheet({
  open,
  onClose,
  onUploaded,
}: ScheduleUploadSheetProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        throw new Error("Вставьте ссылку на Google Таблицу с расписанием");
      }
      const res = await createScheduleSource({ url: trimmedUrl });
      if (!res.ok) {
        throw new Error(
          res.errors?.[0] || res.message || "Не удалось подключить ссылку",
        );
      }
      return res;
    },
    onSuccess: async (res) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule"] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
      ]);
      onUploaded?.(res);
      setUrl("");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Не удалось загрузить расписание");
    },
  });

  const canSubmit = Boolean(url.trim()) && !uploadMutation.isPending;

  return (
    <Sheet open={open} title="Загрузка расписания" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-url">Ссылка на таблицу</Label>
          <div className="relative">
            <Input
              id="schedule-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="Вставьте ссылку"
              disabled={uploadMutation.isPending}
              className="pr-10"
            />
            <Link2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-placeholder" />
          </div>
          <p className="text-caption text-text-secondary">
            Приложение само проверяет таблицу по ссылке и покажет красную точку у
            «Пары», если расписание изменилось
          </p>
        </div>

        {error && <p className="text-caption text-danger">{error}</p>}

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={onClose}
            disabled={uploadMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={!canSubmit}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? "Загрузка..." : "Загрузить"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
