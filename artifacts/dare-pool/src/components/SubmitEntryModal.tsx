import { useState, useRef } from "react";
import { Video, Link2, Upload, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiSubmitEntry, apiUploadEntry } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubmitEntryModalProps {
  open: boolean;
  dareId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitEntryModal({ open, dareId, onClose, onSuccess }: SubmitEntryModalProps) {
  const { user } = useUser();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setVideoUrl(""); setFile(null); setError(""); setUploadProgress(0); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError("You must be logged in to submit."); return; }
    setError("");
    setSubmitting(true);
    try {
      if (mode === "link") {
        if (!videoUrl.trim()) { setError("Please paste a video link."); setSubmitting(false); return; }
        try { new URL(videoUrl.trim()); } catch { setError("Please enter a valid URL."); setSubmitting(false); return; }
        await apiSubmitEntry(dareId, videoUrl.trim(), "link");
      } else {
        if (!file) { setError("Please select a video file."); setSubmitting(false); return; }
        setUploadProgress(10);
        await apiUploadEntry(dareId, file);
        setUploadProgress(100);
      }
      toast.success("Entry submitted! Good luck.");
      reset();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const ALLOWED = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
  const MAX_MB = 200;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit Your Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Upload your video or paste a link to prove you completed the dare.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Video</label>
            <div className="flex gap-2 mb-3">
              {(["link", "upload"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-1 justify-center transition-all",
                    mode === m ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )} data-testid={`mode-${m}`}>
                  {m === "link" ? <Link2 className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                  {m === "link" ? "Paste Link" : "Upload File"}
                </button>
              ))}
            </div>

            {mode === "link" ? (
              <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl}
                onChange={(e) => { setVideoUrl(e.target.value); setError(""); }}
                className="bg-secondary border-input" data-testid="input-video-url" />
            ) : (
              <div>
                <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) {
                    if (!ALLOWED.includes(f.type)) { setError("Only mp4, webm, mov, avi files allowed."); return; }
                    if (f.size > MAX_MB * 1024 * 1024) { setError(`File must be under ${MAX_MB}MB.`); return; }
                    setFile(f); setError(""); } }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                  {file ? (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Click to choose a video</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, AVI · Max {MAX_MB}MB</p>
                    </>
                  )}
                </button>
                {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive" data-testid="submit-error">{error}</p>}

          <Button type="submit" disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
            data-testid="btn-confirm-submit">
            {submitting ? "Submitting…" : "Submit Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
