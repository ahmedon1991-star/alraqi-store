import { Sparkles, Truck, Tag } from "lucide-react";

export function AnnouncementBar() {
  const items = [
    { text: "خصم حصري 20% لفترة محدودة على كافة التوابل والبهارات!", icon: Tag },
    { text: "أفضل أنواع الصمغ العربي الهشاب الأصلي - متوفر الآن بكميات محدودة", icon: Sparkles },
    { text: "شحن مجاني وسريع لكافة أنحاء الخرطوم للطلبات فوق 50 ألف ج.س", icon: Truck },
    { text: "منتجات سودانية أصيلة 100% من قلب المزارع ليدك مباشرة", icon: Sparkles },
  ];

  return (
    <div className="bg-[#1a1a1a] text-white py-2.5 relative overflow-hidden border-b border-white/5 select-none z-[60]">
      <div className="flex whitespace-nowrap animate-marquee items-center gap-10 md:gap-20 px-4">
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 shrink-0">
            <item.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span className="text-[10px] md:text-sm font-black tracking-tight">{item.text}</span>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}} />
    </div>
  );
}
