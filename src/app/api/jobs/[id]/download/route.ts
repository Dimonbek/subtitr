import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { paths } from "@/lib/paths";
import { getJob, loadJobFromDisk } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id) ?? (await loadJobFromDisk(id));
  if (!job) {
    return new Response("Job topilmadi", { status: 404 });
  }
  if (job.status !== "done") {
    return new Response("Video hali tayyor emas", { status: 409 });
  }

  const filePath = paths.outputVideo(id);
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return new Response("Output video topilmadi", { status: 404 });
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  const filename = `${sanitizeFilename(job.sourceFilename)}-subtitr.mp4`;
  return new Response(webStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60) || "video";
}
