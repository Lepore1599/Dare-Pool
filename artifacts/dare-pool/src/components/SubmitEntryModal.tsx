import { useState, useRef } from "react";
import { Video, Upload, CheckCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiUploadEntry } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

interface SubmitEntryModalProps {
  open: boolean;
  dareId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const MAX_MB = 200;

export function SubmitEntryModal({ open, dareId, onClose, onSuccess }: SubmitEntryModalProps) {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setError(""); setUploadProgress(0); };
  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
      setError("This file type is not supported. Please upload an MP4, WebM, MOV, or AVI file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Video is too large. Maximum size is ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError("You must be logged in to submit."); return; }
    if (!file) { setError("Please upload a video file."); return; }
    setError("");
    setSubmitting(true);
    setUploadProgress(15);
    try {
      await apiUploadEntry(dareId, file);
      setUploadProgress(100);
      toast.success("Entry submitted! Good luck 🎯");
      reset();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit Your Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Upload a video from your device to prove you completed the dare.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Upload zone */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
              className="w-full border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="video-upload-zone"
            >
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-sm font-semibold text-foreground truncate max-w-[220px] mx-auto">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB · Tap to change
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Choose a video</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      From your camera roll or files
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    MP4, WebM, MOV, AVI · Max {MAX_MB}MB
                  </p>
                </div>
              )}
            </button>
          </div>

          {/* Progress bar */}
          {submitting && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Uploading…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span data-testid="submit-error">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !file}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
              data-testid="btn-confirm-submit"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Uploading…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Video className="w-4 h-4" /> Submit Entry
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
