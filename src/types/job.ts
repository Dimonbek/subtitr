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

/** So'z-so'z effekt turi:
 *  - highlight: faol so'z rangi o'zgaradi (bepul)
 *  - pop: faol so'z kattalashib qaytadi (premium)
 *  - weight: aytilgan so'z qalindan ingichkaga o'tadi (premium)
 *  - bounce: faol so'z yuqoriga sakraydi (premium)
 */
export type CaptionAnimation = "highlight" | "pop" | "weight" | "bounce";

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  bold: boolean;
  animation: CaptionAnimation;
  premium: boolean;
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
  preset?: string;
  font?: string;
  createdAt: number;
  updatedAt: number;
}
