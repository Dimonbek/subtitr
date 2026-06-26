import { getJobFresh, subscribe } from "@/lib/jobs";
import type { Job } from "@/types/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initial = await getJobFresh(id);
  if (!initial) {
    return new Response("Job topilmadi", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastUpdatedAt = 0;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const pushState = (job: Job) => {
        if (job.updatedAt <= lastUpdatedAt) return;
        lastUpdatedAt = job.updatedAt;
        send("state", job);
        if (job.status === "done" || job.status === "failed") {
          send("end", { status: job.status });
          close();
        }
      };

      pushState(initial);

      // In-memory pub/sub (bir xil modul nusxasida ishlaydi)
      const unsubscribe = subscribe(id, pushState);

      // Disk-polling fallback — dev rejimida ish boshqa modul nusxasida bo'lsa,
      // state.json o'zgarishini kuzatib, yangilanishlarni yetkazadi.
      const poll = setInterval(async () => {
        const fresh = await getJobFresh(id);
        if (fresh) pushState(fresh);
      }, 1500);

      const heartbeat = setInterval(() => {
        try {
          if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          close();
        }
      }, 15000);

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* allaqachon yopilgan */
        }
      }

      setTimeout(close, 3_600_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
