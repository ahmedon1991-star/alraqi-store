import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowRight, Minus, Plus, Loader2, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { useCart, useUpdateCartQuantity, useRemoveFromCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { data, isLoading } = useCart();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const { toast } = useToast();

  const cartItems = data?.items || [];
  const subtotal = cartItems.reduce((acc: number, item: any) => acc + item.product.price * item.quantity, 0);
  const shipping = cartItems.length > 0 ? 1500 : 0;
  const total = subtotal + shipping;

  function handleRemove(id: string, name: string) {
    removeItem.mutate(id, {
      onSuccess: () => toast({ title: "تم الحذف", description: `${name} أُزيل من السلة` }),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-black mb-8">سلة المشتريات ({cartItems.length})</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-bold mb-2">السلة فارغة</h2>
            <p className="text-muted-foreground mb-8">لم تضف أي منتجات بعد، تصفح المتجر وأضف ما يعجبك!</p>
            <Link href="/shop">
              <Button size="lg" className="rounded-full px-8">تصفح المتجر</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white border border-border/50 items-center" data-testid={`card-cart-item-${item.id}`}>
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                    <img src={item.product.image || ""} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{item.product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-2">{item.product.category}</p>
                    <div className="font-mono font-bold text-primary">{item.product.price.toLocaleString()} ج.س</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500"
                      onClick={() => handleRemove(item.id, item.product.name)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => {
                          if (item.quantity <= 1) handleRemove(item.id, item.product.name);
                          else updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 });
                        }}
                        className="w-7 h-7 flex items-center justify-center hover:text-primary"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}
                        className="w-7 h-7 flex items-center justify-center hover:text-primary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl border border-border/50 sticky top-24 shadow-sm">
                <h2 className="font-bold text-xl mb-6">ملخص الطلب</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع الفرعي</span>
                    <span className="font-mono">{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>الشحن</span>
                    <span className="font-mono">{shipping.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between font-black text-xl">
                    <span>الإجمالي</span>
                    <span className="text-primary font-mono" data-testid="text-cart-total">{total.toLocaleString()} ج.س</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full h-12 rounded-full font-bold text-lg shadow-lg hover:shadow-primary/20" data-testid="button-checkout">
                    إتمام الشراء
                  </Button>
                  <Link href="/shop">
                    <Button variant="outline" className="w-full h-12 rounded-full font-bold">
                      <ArrowRight className="h-4 w-4 ml-2" />
                      مواصلة التسوق
                    </Button>
                  </Link>
                </div>

                <div className="mt-6">
                  <div className="flex gap-2">
                    <Input placeholder="كود الخصم" className="rounded-l-none rounded-r-xl" data-testid="input-coupon" />
                    <Button className="rounded-r-none rounded-l-xl">تطبيق</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
