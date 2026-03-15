import { Link } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingAdminButton() {
  return (
    <Link href="/admin">
      <Button
        className="fixed bottom-6 left-6 z-50 rounded-full w-14 h-14 shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
        size="icon"
        title="Admin Dashboard"
      >
        <Shield className="w-6 h-6" />
      </Button>
    </Link>
  );
}
