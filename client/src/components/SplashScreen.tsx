import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1800);
    const done = setTimeout(() => {
      onDone();
    }, 2400);
    return () => {
      clearTimeout(timer);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#faf7f0] transition-opacity duration-700 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-72 w-72 rounded-full border border-primary/10 animate-ping-slow" />
        <div className="absolute h-56 w-56 rounded-full border border-primary/15" />
        <div className="absolute h-40 w-40 rounded-full border border-primary/20" />
      </div>

      {/* Logo */}
      <div
        className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-75 duration-700"
        style={{ animationDuration: "700ms" }}
      >
        <img
          src="/logo.jpg"
          alt="الراقي"
          className="w-52 h-auto object-contain drop-shadow-xl"
        />
      </div>

      {/* Loading dots */}
      <div className="mt-10 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
      </div>
    </div>
  );
}
