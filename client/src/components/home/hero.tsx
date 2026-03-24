import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";

export function Hero() {
  return (
    <div className="relative w-full h-[550px] md:h-[750px] overflow-hidden flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/hero-main.png" 
          alt="Food Products Spread" 
          className="w-full h-full object-cover object-center scale-105 animate-pulse-slow font-display text-transparent"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
      </div>

      <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-8 text-white max-w-2xl order-2 lg:order-1 text-center lg:text-right">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/30 text-white w-fit mx-auto lg:mx-0 text-sm md:text-base font-black backdrop-blur-xl border border-white/20 animate-in fade-in slide-in-from-top duration-1000 shadow-2xl">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>وجهتك الأولى للمنتجات الغذائية الأصيلة</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-8xl font-black leading-[1] tracking-tighter text-white animate-in fade-in slide-in-from-right duration-1000 delay-200 drop-shadow-2xl">
              متجر <span className="text-primary italic drop-shadow-[0_0_20px_rgba(25,112,92,0.4)]">الراقي</span>
            </h1>
            <p className="text-2xl md:text-4xl font-black text-amber-500 animate-in fade-in slide-in-from-right duration-1000 delay-400 uppercase tracking-[0.2em] drop-shadow-lg">
              للتميز والفخامة
            </p>
          </div>
          
          <p className="text-sm md:text-2xl text-gray-100/90 leading-relaxed font-bold animate-in fade-in slide-in-from-right duration-1000 delay-600 max-w-xl lg:mr-0 lg:ml-auto drop-shadow-md">
            نقدم لكم أجود أنواع التوابل والأغذية والمنتجات الطبيعية والغذائية المختارة بعناية فائقة مباشرة إلى منزلكم. 
            أصالة الطعم، جودة التغليف، وسرعة التوصيل.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom duration-1000 delay-800">
            <Link href="/shop">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-black text-xl md:text-2xl px-10 md:px-14 h-14 md:h-20 rounded-2xl md:rounded-3xl shadow-[0_25px_60px_rgba(25,112,92,0.4)] hover:scale-110 active:scale-95 transition-all duration-500 border-b-4 border-emerald-900">
                تسوق الآن
                <ArrowLeft className="mr-4 h-6 w-6 md:h-8 md:w-8" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-2xl font-black text-lg md:text-xl px-10 md:px-14 h-14 md:h-20 rounded-2xl md:rounded-3xl border-2 transition-all duration-500 shadow-xl">
              عروض حصرية
            </Button>
          </div>
        </div>

        <div className="relative order-1 lg:order-2 flex justify-center items-center group animate-in zoom-in duration-1000">
          <div className="absolute inset-0 bg-primary/30 blur-[100px] md:blur-[160px] rounded-full group-hover:bg-primary/40 transition-all duration-700 animate-pulse" />
          <div className="relative transform group-hover:scale-110 transition-transform duration-700 hover:rotate-2">
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary/60 via-amber-500/40 to-transparent rounded-3xl md:rounded-[4rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <img 
              src="/logo.png" 
              alt="الراقي" 
              className="relative w-full max-w-[220px] md:max-w-[520px] h-auto object-contain drop-shadow-[0_40px_40px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-md rounded-3xl md:rounded-[4rem] p-6 md:p-14 border border-white/20 shadow-2xl"
              loading="eager"
              fetchPriority="high"
            />
            {/* Glossy overlay on logo */}
            <div className="absolute inset-0 rounded-3xl md:rounded-[4rem] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Modern Wave Divider at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent z-20" />
    </div>
  );
}
