import { notFound } from "next/navigation";
import {
  getTopicDetails,
  TopicHeader,
  TopicKeyPoints,
  TopicFooterAction,
} from "@/modules/topic";
import { getQuizForTopic } from "@/modules/quiz";
import { getAuthSession } from "@/server/auth";

interface TopicPageProps {
  params: Promise<{
    slug: string;
    topicSlug: string;
  }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug, topicSlug } = await params;
  const session = await getAuthSession();

  // RSC direct server call to domain service layer with authenticated session
  const topic = await getTopicDetails(slug, topicSlug, {
    userId: session.user?.id,
  });

  if (!topic) {
    notFound();
  }

  // Fetch quiz questions for this topic (without revealing answers to client)
  const quizQuestions = await getQuizForTopic(topic.id);

  return (
    <main className="min-h-screen w-full bg-surface-canvas text-text-primary">
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <TopicHeader topic={topic} />
        <TopicKeyPoints topic={topic} />
        <TopicFooterAction topic={topic} quizQuestions={quizQuestions} />
      </div>
    </main>
  );
}
