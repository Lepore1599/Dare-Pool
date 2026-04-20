import { useState } from "react";
import { Video, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSubmission } from "@/lib/store";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

interface SubmitEntryModalProps {
  open: boolean;
  dareId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitEntryModal({ open, dareId, onClose, onSuccess }: SubmitEntryModalProps) {
  const { username } = useUser();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [videoUrl, setVideoUrl] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveUsername = username || guestName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUsername) {
      setError("Please enter your username.");
      return;
    }
    if (mode === "link" && !videoUrl.trim()) {
      setError("Please paste a video link.");
      return;
    }
    if (mode === "link") {
      try {
        new URL(videoUrl.trim());
      } catch {
        setError("Please enter a valid URL.");
        return;
      }
    }

    setSubmitting(true);
    createSubmission({
      dareId,
      username: effectiveUsername,
      videoUrl: mode === "link" ? videoUrl.trim() : "uploaded-video",
      videoType: mode,
      uploadedAt: Date.now(),
    });
    setSubmitting(false);
    setVideoUrl("");
    setGuestName("");
    setError("");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit Your Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Upload your video or paste a link to prove you completed the dare.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Guest username if not logged in */}
          {!username && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Your Username
              </label>
              <Input
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setError("");
                }}
                className="bg-secondary border-input"
                maxLength={24}
                data-testid="input-guest-name"
              />
            </div>
          )}

          {/* Mode switcher */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Video
            </label>
            <div className="flex gap-2 mb-3">
              {(["link", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-1 justify-center transition-all",
                    mode === m
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`mode-${m}`}
                >
                  {m === "link" ? <Link2 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  {m === "link" ? "Paste Link" : "Upload File"}
                </button>
              ))}
            </div>

            {mode === "link" ? (
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setError("");
                }}
                className="bg-secondary border-input"
                data-testid="input-video-url"
              />
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  File upload coming soon — use a video link for now.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive" data-testid="submit-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || (mode === "upload")}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
            data-testid="btn-confirm-submit"
          >
            {submitting ? "Submitting..." : "Submit Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
