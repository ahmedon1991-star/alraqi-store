import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Diamond } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <div className="relative w-full h-[400px] md:h-[800px] overflow-hidden flex items-center bg-[#0E0D0B]">
      {/* Background with Radial Glow and Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_rgba(200,150,62,0.15),_transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        {/* Floating Particles (Simulated) */}
        <div className="absolute h-full w-full pointer-events-none opacity-30">
           <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-primary animate-ping-slow" />
           <div className="absolute top-3/4 right-1/3 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
           <div className="absolute top-1/3 right-1/4 h-3 w-3 rounded-full bg-primary/40 animate-ping-slow delay-700" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6 md:space-y-10 animate-fade-up">
          
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-card/60 border border-primary/20 backdrop-blur-xl text-primary font-bold text-xs md:text-lg shadow-[0_0_25px_rgba(200,150,62,0.15)] animate-in zoom-in duration-1000">
            <Diamond className="h-4 w-4 fill-current animate-pulse" />
            <span className="tracking-[3px] uppercase font-heading">منتجات سودانية فاخرة</span>
          </div>
          
          <div className="space-y-4">
             <h1 className="text-5xl md:text-[140px] font-display font-black leading-[0.9] text-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
               متجر <span className="text-primary tracking-tighter italic">الراقي</span>
             </h1>
             <p className="font-heading text-lg md:text-5xl font-black text-primary/80 uppercase tracking-[12px] md:tracking-[25px] opacity-90">
               للتميز والفخامة
             </p>
          </div>
          
          <p className="font-sans text-xs md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium tracking-wide">
            أنت الآن في رحلة تذوق استثنائية. نجمع لك أجود ما جادت به أرض السودان من توابل وأغذية طبيعية بجودة تليق بذوقك الرفيع.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full justify-center px-8 sm:px-0">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button size="lg" className="h-14 md:h-24 w-full sm:px-20 rounded-2xl md:rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/70 text-black font-heading font-black text-lg md:text-3xl shadow-[0_15px_45px_rgba(200,150,62,0.4)] hover:shadow-[0_20px_60px_rgba(200,150,62,0.6)] hover:scale-105 transition-all duration-500 group">
                تسوق المجموعة
                <ArrowLeft className="mr-3 h-6 w-6 md:h-10 md:w-10 group-hover:-translate-x-2 transition-transform" />
              </Button>
            </Link>
            <Link href="/shop?offers=true" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="h-14 md:h-24 w-full sm:px-16 rounded-2xl md:rounded-[2.5rem] border-primary/40 bg-white/5 backdrop-blur-md text-foreground font-heading font-black text-lg md:text-2xl hover:bg-white/10 hover:border-primary transition-all duration-500">
                العروض الذهبية
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Decorative Gradient Overlay Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0E0D0B] to-transparent pointer-events-none" />
    </div>
  );
}
