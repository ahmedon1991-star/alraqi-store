import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingAdminButton() {
  const [location] = useLocation();

  if (location.startsWith("/admin")) {
    return null;
  }
  return (
    <Link href="/admin">
      <Button
        className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-50 rounded-full w-10 h-10 md:w-14 md:h-14 shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200 bg-orange-600 text-white border-none"
        size="icon"
        title="Admin Dashboard"
      >
        <Shield className="w-5 h-5 md:w-6 md:h-6" />
      </Button>
    </Link>
  );
}
