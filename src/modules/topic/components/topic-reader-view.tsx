import React from "react";
import { TopicHeader } from "./topic-header";
import { TopicKeyPoints } from "./topic-key-points";
import { TopicFooterAction } from "./topic-footer-action";
import type { TopicDetailsDTO } from "../types";
import type { QuizQuestionDTO } from "@/modules/quiz";

export interface TopicReaderViewProps {
  topic: TopicDetailsDTO;
  quizQuestions: QuizQuestionDTO[];
}

export function TopicReaderView({ topic, quizQuestions }: TopicReaderViewProps) {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <TopicHeader topic={topic} />
      <TopicKeyPoints topic={topic} />
      <TopicFooterAction topic={topic} quizQuestions={quizQuestions} />
    </div>
  );
}
