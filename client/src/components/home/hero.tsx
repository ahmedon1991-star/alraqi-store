import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export function Hero() {
  return (
    <div className="relative w-full h-[600px] overflow-hidden flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/hero-main.png" 
          alt="Sudanese Food Spread" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6 text-white max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/90 text-primary-foreground w-fit text-sm font-bold backdrop-blur-sm border border-white/20">
            <span>✨</span>
            <span>طعم السودان الأصيل</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            الراقي <br/>
            <span className="text-primary-foreground/90 text-4xl md:text-6xl font-bold">للمنتجات السودانية</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-light max-w-lg">
            اكتشف أجود أنواع التوابل، الأغذية، والمنتجات الطبيعية من قلب السودان. 
            جودة عالية وتوصيل سريع لكل مكان.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <Link href="/shop">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 h-14 rounded-full shadow-lg hover:shadow-primary/25 transition-all">
                تسوق الآن
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md font-bold text-lg px-8 h-14 rounded-full">
              عروض اليوم
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Curve at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
