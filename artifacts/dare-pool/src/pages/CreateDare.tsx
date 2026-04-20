import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Flame, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { createDare } from "@/lib/store";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoginModal } from "@/components/LoginModal";

export function CreateDare() {
  const { username } = useUser();
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required.";
    else if (title.trim().length < 5) e.title = "Title must be at least 5 characters.";
    if (!description.trim()) e.description = "Description is required.";
    else if (description.trim().length < 10) e.description = "Give a bit more detail.";
    const prize = Number(prizePool);
    if (!prizePool) e.prizePool = "Prize pool is required.";
    else if (isNaN(prize) || prize < 1) e.prizePool = "Must be at least $1.";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setShowLogin(true);
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    const now = Date.now();
    const dare = createDare({
      title: title.trim(),
      description: description.trim(),
      prizePool: Number(prizePool),
      createdAt: now,
      expiresAt: now + 48 * 60 * 60 * 1000,
      createdBy: username,
    });
    setLocation(`/dare/${dare.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {}}
      />

      <button
        onClick={() => setLocation("/")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
        data-testid="btn-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Post a Dare</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Set the challenge, fund the prize. 48 hours to find the bravest.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5" htmlFor="dare-title">
              Dare Title
            </label>
            <Input
              id="dare-title"
              placeholder="e.g. Eat a ghost pepper on camera"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: "" }));
              }}
              className="bg-secondary border-input text-foreground placeholder:text-muted-foreground"
              maxLength={120}
              data-testid="input-dare-title"
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1" data-testid="error-title">
                {errors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/120</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5" htmlFor="dare-desc">
              Description
            </label>
            <Textarea
              id="dare-desc"
              placeholder="Describe exactly what participants need to do to complete the dare..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: "" }));
              }}
              className="bg-secondary border-input text-foreground placeholder:text-muted-foreground min-h-[120px] resize-none"
              maxLength={500}
              data-testid="input-dare-description"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1" data-testid="error-description">
                {errors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Prize pool */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5" htmlFor="dare-prize">
              Prize Pool
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="dare-prize"
                type="number"
                placeholder="100"
                value={prizePool}
                onChange={(e) => {
                  setPrizePool(e.target.value);
                  setErrors((prev) => ({ ...prev, prizePool: "" }));
                }}
                className="bg-secondary border-input text-foreground pl-9"
                min={1}
                data-testid="input-prize-pool"
              />
            </div>
            {errors.prizePool && (
              <p className="text-xs text-destructive mt-1" data-testid="error-prize-pool">
                {errors.prizePool}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              No real payment — this is a prototype.
            </p>
          </div>

          {/* Info card */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-primary/90 font-medium">
              Dare expires in 48 hours. The entry with the most votes wins the prize pool.
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-base py-5 glow-primary-sm"
            data-testid="btn-submit-dare"
          >
            {submitting ? "Creating..." : username ? "Post Dare" : "Login & Post Dare"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
