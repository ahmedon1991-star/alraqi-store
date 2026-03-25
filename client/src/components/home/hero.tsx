import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";

export function Hero() {
  return (
    <div className="relative w-full h-[300px] md:h-[650px] overflow-hidden flex items-center">
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

      <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <div className="flex flex-col gap-3 text-white max-w-2xl order-2 lg:order-1 text-center lg:text-right">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-primary/40 text-white w-fit mx-auto lg:mx-0 text-[10px] md:text-base font-black backdrop-blur-xl border border-white/10 animate-in fade-in slide-in-from-top duration-700">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>منتجات غذائية سودانية أصيلة</span>
          </div>
          
          <div className="space-y-2 md:space-y-6">
            <h1 className="text-3xl md:text-8xl font-black leading-tight text-white drop-shadow-lg">
              متجر <span className="text-primary italic">الراقي</span>
            </h1>
            <p className="text-lg md:text-4xl font-black text-amber-500 uppercase tracking-wider drop-shadow-md">
              للتميز والفخامة
            </p>
          </div>
          
          <p className="text-[10px] md:text-2xl text-gray-200 leading-relaxed font-bold max-w-xl lg:mr-0 lg:ml-auto">
            أجود أنواع التوابل والأغذية والمنتجات الطبيعية مباشرة إلى باب بيتك بجودة عالية وسعر منافس.
          </p>
          
          <div className="flex flex-wrap gap-2 mt-2 justify-center lg:justify-start">
            <Link href="/shop">
              <Button size="sm" className="md:size-lg bg-primary hover:bg-primary/90 text-white font-black text-xs md:text-2xl px-6 md:px-14 h-9 md:h-20 rounded-xl md:rounded-3xl shadow-lg hover:scale-105 transition-all duration-300">
                تسوق الآن
                <ArrowLeft className="mr-2 h-4 w-4 md:h-8 md:w-8" />
              </Button>
            </Link>
            <Link href="/shop?offers=true">
              <Button variant="outline" size="sm" className="md:size-lg bg-white/10 text-white border-white/20 backdrop-blur-md font-black text-[10px] md:text-xl px-4 md:px-14 h-9 md:h-20 rounded-xl md:rounded-3xl border transition-all">
                عروضنا
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative order-1 lg:order-2 flex justify-center items-center">
          <div className="absolute inset-0 bg-primary/20 blur-[60px] md:blur-[160px] rounded-full" />
          <div className="relative transform hover:scale-105 transition-transform duration-500">
            <img 
              src="/logo.png" 
              alt="الراقي" 
              className="relative w-full max-w-[140px] md:max-w-[520px] h-auto object-contain bg-white/95 backdrop-blur-md rounded-2xl md:rounded-[4rem] p-3 md:p-14 border border-white/20 shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Modern Wave Divider at Bottom - Slimmer */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background via-background/40 to-transparent z-20" />
    </div>
  );
}
