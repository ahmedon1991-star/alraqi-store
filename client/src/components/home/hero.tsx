import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
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

      <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-8 text-white max-w-2xl order-2 lg:order-1 text-center lg:text-right">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground w-fit mx-auto lg:mx-0 text-sm font-bold backdrop-blur-md border border-primary/30 animate-in fade-in slide-in-from-top duration-700">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>وجهتك الأولى للمنتجات السودانية الأصيلة</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-white animate-in fade-in slide-in-from-right duration-700 delay-100">
              متجر <span className="text-primary italic">الراقي</span>
            </h1>
            <p className="text-2xl md:text-3xl font-bold text-gray-100/90 animate-in fade-in slide-in-from-right duration-700 delay-200">
              للتميز والفخامة
            </p>
          </div>
          
          <p className="text-xl text-gray-200 leading-relaxed font-medium animate-in fade-in slide-in-from-right duration-700 delay-300">
            نقدم لكم أجود أنواع التوابل، الأغذية، والمنتجات الطبيعية من قلب السودان مباشرة إلى منزلكم. 
            أصالة الطعم، جودة التغليف، وسرعة التوصيل.
          </p>
          
          <div className="flex flex-wrap gap-5 mt-6 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom duration-700 delay-400">
            <Link href="/shop">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl px-10 h-16 rounded-2xl shadow-[0_20px_50px_rgba(27,112,92,0.3)] hover:scale-105 transition-all duration-300">
                تسوق الآن
                <ArrowLeft className="mr-3 h-6 w-6" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="bg-white/5 hover:bg-white/10 text-white border-white/20 backdrop-blur-xl font-bold text-lg px-10 h-16 rounded-2xl border-2 transition-all duration-300">
              عروض حصرية
            </Button>
          </div>
        </div>

        <div className="relative order-1 lg:order-2 flex justify-center items-center group animate-in zoom-in duration-1000">
          <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full group-hover:bg-primary/30 transition-all duration-500" />
          <div className="relative transform group-hover:scale-105 transition-transform duration-500">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary/50 to-transparent rounded-[3rem] blur opacity-30" />
            <img 
              src="/logo.png" 
              alt="الراقي" 
              className="relative w-full max-w-[480px] h-auto object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] bg-white rounded-[3rem] p-8 lg:p-12 border border-white/10"
            />
          </div>
        </div>
      </div>

      {/* Decorative Curve at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
