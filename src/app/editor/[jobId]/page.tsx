import { notFound } from "next/navigation";
import { EditorClient } from "@/components/editor-client";
import { getJobFresh } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJobFresh(jobId);
  if (!job) notFound();
  return <EditorClient jobId={jobId} initialJob={job} />;
}
