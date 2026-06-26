"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileVideo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"];
const ACCEPT_ATTR = ".mp4,.mov,.mkv,.webm";

interface UploadDropzoneProps {
  className?: string;
}

export function UploadDropzone({ className }: UploadDropzoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const candidate = files[0];
    if (!candidate.type.startsWith("video/") && !ACCEPTED.includes(candidate.type)) {
      setError("Faqat video fayllar qabul qilinadi (MP4, MOV, MKV, WEBM)");
      return;
    }
    setError(null);
    setFile(candidate);
  }, []);

  const upload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("video", file);

      const jobId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/jobs");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.id);
            } catch {
              reject(new Error("Noto'g'ri server javobi"));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error ?? `Yuklash xatosi (${xhr.status})`));
            } catch {
              reject(new Error(`Yuklash xatosi (${xhr.status})`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Tarmoq xatosi"));
        xhr.send(formData);
      });

      router.push(`/editor/${jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
      setUploading(false);
    }
  }, [file, router]);

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer",
          dragging
            ? "border-brand bg-brand/5 scale-[1.01]"
            : "border-border bg-card hover:border-brand/60 hover:bg-accent/30",
          uploading && "pointer-events-none opacity-80",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          {file ? <FileVideo className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
        </div>

        {file ? (
          <div className="space-y-1">
            <p className="text-base font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-lg font-semibold">Videoni shu yerga tashlang</p>
            <p className="text-sm text-muted-foreground">
              yoki bosing va fayl tanlang · MP4, MOV, MKV, WEBM · 500 MB gacha
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {file && !uploading && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setFile(null)} disabled={uploading}>
            Bekor qilish
          </Button>
          <Button variant="brand" size="lg" onClick={upload}>
            Subtitr yarating
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Video yuklanmoqda… {progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
