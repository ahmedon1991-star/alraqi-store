import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft } from "lucide-react";
import { useCart, useUpdateCartQuantity, useRemoveFromCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function CartSheet({ children }: { children: React.ReactNode }) {
  const { data } = useCart();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const cartItems = data?.items || [];
  const subtotal = cartItems.reduce((acc: number, item: any) => acc + (item.price || item.product.price) * item.quantity, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="top" className="h-[90vh] md:h-[70vh] rounded-b-[2.5rem] p-0 flex flex-col border-primary/20 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="p-6 border-b border-primary/10">
          <SheetTitle className="text-right font-display text-3xl text-primary flex items-center justify-end gap-3">
            سلة المشتريات
            <ShoppingCart className="h-6 w-6" />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <ShoppingCart className="h-20 w-20 text-muted-foreground/20" />
              <p className="text-xl font-bold text-muted-foreground">السلة فارغة حالياً</p>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-full px-8">تصفح المتجر</Button>
              </SheetTrigger>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-card border border-primary/5 items-center">
                  <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 p-1 border border-primary/10">
                    <img src={item.image || item.product.image || ""} alt={item.product.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="font-bold text-sm md:text-lg truncate">{item.product.name}</h3>
                    <p className="text-primary font-mono font-bold text-sm">{(item.price || item.product.price).toLocaleString()} ج.س</p>
                  </div>
                  <div className="flex items-center gap-3 bg-primary/5 px-2 py-1 rounded-xl border border-primary/10">
                    <button 
                      onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}
                      className="w-8 h-8 flex items-center justify-center text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => {
                        if (item.quantity > 1) updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 });
                        else removeItem.mutate(item.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 bg-card/50 border-t border-primary/10 space-y-4 rounded-b-[2.5rem]">
            <div className="flex justify-between items-center px-2">
              <span className="text-2xl font-display text-primary font-black">{(subtotal).toLocaleString()} ج.س</span>
              <span className="font-heading text-lg font-bold text-muted-foreground">المجموع الفرعي</span>
            </div>
            <div className="flex gap-4">
              <Link href="/cart" className="flex-1">
                <Button className="w-full h-14 rounded-2xl text-lg font-black bg-gradient-to-br from-primary to-primary-foreground text-black shadow-lg shadow-primary/20">
                  إتمام الطلب
                </Button>
              </Link>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-primary/20">
                  مواصلة التسوق
                </Button>
              </SheetTrigger>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
