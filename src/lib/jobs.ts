import { promises as fs } from "node:fs";
import type { Job, JobStatus } from "@/types/job";
import { paths } from "./paths";

const store = new Map<string, Job>();
const listeners = new Map<string, Set<(job: Job) => void>>();

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function setJob(job: Job): void {
  store.set(job.id, job);
  void persistJob(job);
  emit(job);
}

export function updateJob(
  id: string,
  patch: Partial<Omit<Job, "id" | "createdAt">>,
): Job | undefined {
  const current = store.get(id);
  if (!current) return undefined;
  const next: Job = { ...current, ...patch, updatedAt: Date.now() };
  store.set(id, next);
  void persistJob(next);
  emit(next);
  return next;
}

export function failJob(id: string, error: string): Job | undefined {
  return updateJob(id, { status: "failed", error, progress: 0 });
}

export function setStatus(id: string, status: JobStatus, progress = 0, message?: string): Job | undefined {
  return updateJob(id, { status, progress, message });
}

export function subscribe(id: string, fn: (job: Job) => void): () => void {
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) listeners.delete(id);
  };
}

function emit(job: Job) {
  const set = listeners.get(job.id);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(job);
    } catch {
      // Listener xatosi job state'ga ta'sir qilmasin
    }
  }
}

async function persistJob(job: Job) {
  try {
    await fs.mkdir(paths.outputDir(job.id), { recursive: true });
    await fs.writeFile(paths.jobStateJson(job.id), JSON.stringify(job, null, 2), "utf8");
  } catch {
    // Persistence muvaffaqiyatsiz bo'lsa ham in-memory state ishlaydi
  }
}

export async function loadJobFromDisk(id: string): Promise<Job | undefined> {
  if (store.has(id)) return store.get(id);
  try {
    const raw = await fs.readFile(paths.jobStateJson(id), "utf8");
    const job = JSON.parse(raw) as Job;
    store.set(id, job);
    return job;
  } catch {
    return undefined;
  }
}

/**
 * Holatni HAR DOIM diskdan (state.json) o'qiydi — xotiradan emas.
 *
 * Next.js dev rejimida route handler'lar alohida modul nusxalariga ega
 * bo'lishi mumkin, shuning uchun bitta instansiyaning xotirasi boshqasinikidan
 * eskirgan bo'ladi. state.json esa har yangilanishda diskka yoziladi —
 * shuning uchun status/transkript o'qishlari uchun disk haqiqat manbai.
 * Disk yangiroq bo'lsa xotirani ham yangilaydi.
 */
export async function getJobFresh(id: string): Promise<Job | undefined> {
  const mem = store.get(id);
  try {
    const raw = await fs.readFile(paths.jobStateJson(id), "utf8");
    const disk = JSON.parse(raw) as Job;
    // Disk yoki xotira — qaysi biri yangiroq bo'lsa o'shani olamiz
    if (!mem || disk.updatedAt >= mem.updatedAt) {
      store.set(id, disk);
      return disk;
    }
    return mem;
  } catch {
    return mem;
  }
}
