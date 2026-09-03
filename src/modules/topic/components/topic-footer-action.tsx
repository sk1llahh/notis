"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Zap, Trophy } from "lucide-react";
import { Button, Card } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { completeTopicAction } from "@/server/actions";
import type { TopicDetailsDTO } from "../types";

interface TopicFooterActionProps {
  topic: TopicDetailsDTO;
}

export function TopicFooterAction({ topic }: TopicFooterActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ xpEarned: number } | null>(
    null
  );

  const { courseSlug, slug, progress } = topic;
  const isCompleted = progress.status === "COMPLETED";

  const handleComplete = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await completeTopicAction({
        courseSlug,
        topicSlug: slug,
      });

      if (!result.success) {
        setErrorMessage(result.error.message || "Не удалось сохранить прогресс");
        return;
      }

      setSuccessInfo({ xpEarned: result.data.xpEarned });

      // Navigate back to course roadmap after short feedback
      setTimeout(() => {
        router.push(ROUTES.COURSE(courseSlug));
        router.refresh();
      }, 700);
    });
  };

  return (
    <footer className="pt-8 pb-16 border-t border-border-subtle mt-10">
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-text-primary flex items-center justify-center sm:justify-start gap-2">
              {successInfo ? (
                <>
                  <Trophy className="w-5 h-5 text-status-progress animate-bounce" />
                  <span>+{successInfo.xpEarned} XP получено!</span>
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-status-completed" />
                  <span>Тема уже завершена</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-status-available" />
                  <span>Готовы закрепить знания?</span>
                </>
              )}
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed max-w-md">
              {successInfo
                ? "Прогресс зафиксирован. Возвращаемся в роадмап..."
                : isCompleted
                ? "Вы можете повторно подтвердить освоение темы для обновления даты повторения."
                : "После подтверждения тема откроет следующие связанные узлы в роадмапе и начислит 50 XP."}
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <Button
              onClick={handleComplete}
              variant="primary"
              size="lg"
              isLoading={isPending}
              disabled={Boolean(successInfo)}
              className="w-full sm:w-auto min-w-[200px]"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              {successInfo
                ? "Сохранено!"
                : isCompleted
                ? "Освоено повторно"
                : "Я освоил материал"}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-sm bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {errorMessage}
          </div>
        )}
      </Card>
    </footer>
  );
}
