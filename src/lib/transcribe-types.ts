import type { Transcript } from "@/types/job";

export interface Transcriber {
  transcribe(audioPath: string, language: string): Promise<Transcript>;
}
