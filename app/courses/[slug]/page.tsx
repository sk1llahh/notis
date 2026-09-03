import { notFound } from "next/navigation";
import { getCourseRoadmapGraph, RoadmapCanvas } from "@/modules/roadmap";
import { getAuthSession } from "@/server/auth";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const session = await getAuthSession();

  // In Next.js RSC, direct call to service layer with authenticated user session
  const graphData = await getCourseRoadmapGraph(slug, {
    userId: session.user?.id,
  });

  if (!graphData) {
    notFound();
  }

  return (
    <main className="w-full h-screen bg-surface-canvas text-text-primary flex flex-col">
      <RoadmapCanvas initialData={graphData} />
    </main>
  );
}
