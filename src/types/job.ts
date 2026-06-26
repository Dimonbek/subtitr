export type JobStatus =
  | "uploading"
  | "extracting_audio"
  | "transcribing"
  | "ready_to_render"
  | "rendering"
  | "done"
  | "failed";

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words: WordToken[];
}

export interface Transcript {
  language: string;
  duration: number;
  segments: TranscriptSegment[];
}

export interface StylePreset {
  id: "tiktok" | "mrbeast" | "minimal" | "neon";
  name: string;
  description: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  bold: boolean;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  sourceFilename: string;
  sourceSize: number;
  duration?: number;
  transcript?: Transcript;
  preset?: StylePreset["id"];
  createdAt: number;
  updatedAt: number;
}
