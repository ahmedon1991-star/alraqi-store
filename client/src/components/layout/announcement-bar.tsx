import { Sparkles, Truck, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export function AnnouncementBar() {
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("/api/admin/settings"),
  });

  const announcement = settings?.announcementText || "خصم حصري 20% لفترة محدودة على كافة التوابل والبهارات!";

  const items = [
    { text: announcement, icon: Tag },
    { text: "أفضل أنواع الصمغ العربي الهشاب الأصلي - متوفر الآن بكميات محدودة", icon: Sparkles },
    { text: settings?.freeShippingThreshold ? `شحن مجاني لكافة السودان للطلبات فوق ${Number(settings.freeShippingThreshold).toLocaleString()} ج.س` : "شحن مجاني وسريع لكافة أنحاء السودان للطلبات الكبيرة", icon: Truck },
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
