import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MoveRight, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(135deg,_#fff_0%,_#f8f4ee_100%)] p-4 text-right" dir="rtl">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <img src="/logo.png" alt="الراقي" className="h-24 md:h-32 w-auto relative z-10 opacity-40 grayscale" />
      </div>
      
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Sparkles className="h-4 w-4" />
            خطأ 404
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800">عذراً، الصفحة غير موجودة!</h1>
        </div>
        
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          يبدو أنك سلكت طريقاً غير موجود في المتجر، لا تقلق! كل شيء لدينا بخير ويمكنك العودة للتسوق الآن.
        </p>

        <div className="pt-8">
          <Link href="/">
            <Button className="h-14 px-10 rounded-2xl text-xl font-black shadow-lg shadow-primary/20 gap-3 group">
              العودة للرئيسية
              <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
      
      <footer className="absolute bottom-8 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
        متجر الراقي للمنتجات السودانية
      </footer>
    </div>
  );
}
