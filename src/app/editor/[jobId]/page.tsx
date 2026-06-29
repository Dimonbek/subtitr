import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { EditorClient } from "@/components/editor-client";
import { getJobFresh } from "@/lib/jobs";
import { ACCESS_COOKIE, getViewerAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJobFresh(jobId);
  if (!job) notFound();

  const store = await cookies();
  const access = await getViewerAccess(store.get(ACCESS_COOKIE)?.value);

  return <EditorClient jobId={jobId} initialJob={job} initialPro={access.isPro} />;
}
