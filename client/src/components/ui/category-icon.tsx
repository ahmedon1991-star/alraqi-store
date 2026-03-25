import { 
  Sparkles, 
  Utensils, 
  GlassWater, 
  Leaf, 
  Package, 
  Coffee, 
  Milk, 
  Beef, 
  ShoppingBag,
  LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Utensils,
  GlassWater,
  Leaf,
  Package,
  Coffee,
  Milk,
  Beef,
  ShoppingBag,
};

interface CategoryIconProps {
  icon?: string | null;
  className?: string;
  imgClassName?: string;
}

export function CategoryIcon({ icon, className, imgClassName }: CategoryIconProps) {
  if (!icon) return <Package className={className} />;

  // Check if it is a URL or path
  const isImage = icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:");

  if (isImage) {
    return (
      <img 
        src={icon} 
        alt="Category" 
        className={cn("w-full h-full object-cover", imgClassName)} 
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  // Check if it is a Lucide icon name
  const IconComponent = ICON_MAP[icon];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to text (maybe it's an emoji?)
  return <span className={className}>{icon}</span>;
}
