import React from "react";
import { CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/ui";
import type { TopicDetailsDTO } from "../types";

interface TopicKeyPointsProps {
  topic: TopicDetailsDTO;
}

export function TopicKeyPoints({ topic }: TopicKeyPointsProps) {
  const { keyPoints, pitfalls, description } = topic;

  return (
    <div className="space-y-8 py-6">
      {/* Description / Main Body if present */}
      {description && (
        <section className="prose prose-invert max-w-none text-text-primary text-sm sm:text-base leading-relaxed space-y-4">
          <p className="whitespace-pre-line">{description}</p>
        </section>
      )}

      {/* Key concepts */}
      {keyPoints.length > 0 && (
        <section aria-labelledby="key-points-heading">
          <Card variant="default">
            <CardHeader className="pb-3">
              <CardTitle
                id="key-points-heading"
                className="text-sm font-bold flex items-center gap-2 text-status-available"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ключевые концепции</span>
              </CardTitle>
              <CardDescription>
                Главные тезисы темы, которые необходимо понять и запомнить
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-text-primary leading-snug"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-status-available shrink-0 mt-1.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Pitfalls & Common Mistakes */}
      {pitfalls.length > 0 && (
        <section aria-labelledby="pitfalls-heading">
          <Card
            variant="default"
            className="border-status-progress/30 bg-surface-card"
          >
            <CardHeader className="pb-3">
              <CardTitle
                id="pitfalls-heading"
                className="text-sm font-bold flex items-center gap-2 text-status-progress"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Типичные ошибки и подводные камни</span>
              </CardTitle>
              <CardDescription>
                На чем чаще всего спотыкаются на практике и собеседованиях
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {pitfalls.map((pitfall, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-text-primary leading-snug"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-status-progress shrink-0 mt-1.5" />
                    <span>{pitfall}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Fallback if no specific points */}
      {keyPoints.length === 0 && pitfalls.length === 0 && !description && (
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-text-muted">
              <BookOpen className="w-4 h-4" />
              <span>Материал темы подготавливается</span>
            </CardTitle>
            <CardDescription>
              Авторы курса вносят интерактивные блоки и практические примеры.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
