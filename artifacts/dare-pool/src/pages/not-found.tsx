import { Link } from "wouter";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <Flame className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
        <h1 className="text-3xl font-black text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">That page doesn't exist.</p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
