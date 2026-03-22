import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowRight, Minus, Plus, Loader2, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart, useUpdateCartQuantity, useRemoveFromCart } from "@/hooks/use-cart";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Cart() {
  const { data, isLoading: isCartLoading } = useCart();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const { toast } = useToast();

  const { data: adminSettings } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("/api/settings"),
  });

  const cartItems = data?.items || [];
  const subtotal = cartItems.reduce((acc: number, item: any) => acc + item.product.price * item.quantity, 0);
  
  const shippingFeeBase = Number(adminSettings?.shippingFee) || 0;
  const freeShippingThreshold = Number(adminSettings?.freeShippingThreshold) || 0;
  const isFreeShipping = (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) || shippingFeeBase === 0;
  const shipping = cartItems.length > 0 && !isFreeShipping ? shippingFeeBase : 0;
  const total = subtotal + shipping;

  function handleRemove(id: string, name: string) {
    removeItem.mutate(id, {
      onSuccess: () => toast({ title: "تم الحذف", description: `${name} أُزيل من السلة` }),
    });
  }

  const [checkoutData, setCheckoutData] = useState({ 
    name: user?.name || "", 
    phone: user?.phone || "", 
    address: "", 
    paymentMethod: "cod", 
    bankId: "" 
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: banks } = useQuery<any[]>({
    queryKey: ["/api/banks"],
    queryFn: () => apiRequest("/api/banks"),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(checkoutData),
      }),
    onSuccess: async (data) => {
      // Clear cart queries
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cart/count"] });
      
      setIsCheckoutOpen(false);
      toast({
        title: "تم الطلب بنجاح",
        description: "جاري تحويلك للواتساب لإتمام عملية الشراء...",
      });
      
      if (data.whatsappUrl) {
        // Open WhatsApp in new tab
        window.open(data.whatsappUrl, "_blank");
      }
      
      // Optionally redirect user to orders or home
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isCartLoading || isUserLoading) {
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
                  <div className="w-24 h-24 bg-white border border-border/30 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1">
                    <img src={item.product.image || ""} alt={item.product.name} className="w-full h-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{item.product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-1">{item.product.category}</p>
                    {(item.size || item.measurement) && (
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] md:text-xs font-bold w-fit">
                        {item.size && <span className="bg-primary/10 text-primary px-2 py-1 rounded-md shadow-sm">المقاس: {item.size}</span>}
                        {item.measurement && <span className="bg-primary/10 text-primary px-2 py-1 rounded-md shadow-sm">الحجم/الوزن: {item.measurement}</span>}
                      </div>
                    )}
                    <div className="font-mono font-bold text-primary text-sm md:text-base">{item.product.price.toLocaleString()} ج.س</div>
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
                    <span>{isFreeShipping ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full">تهانينا! شحن مجاني 🎉</span> : <span className="font-mono">{shipping.toLocaleString()}</span>}</span>
                    <span>الشحن</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between font-black text-xl">
                    <span>الإجمالي</span>
                    <span className="text-primary font-mono" data-testid="text-cart-total">{total.toLocaleString()} ج.س</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {user ? (
                    <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full h-12 rounded-full font-bold text-lg shadow-lg hover:shadow-primary/20" data-testid="button-checkout">
                          إتمام الشراء عبر واتساب
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader className="text-right">
                          <DialogTitle>بيانات التوصيل</DialogTitle>
                          <DialogDescription>
                            يرجى إدخال بيانات التوصيل لإتمام الطلب وسيتم تحويلك للواتساب للتأكيد.
                          </DialogDescription>
                        </DialogHeader>
                        <form 
                          className="space-y-4 mt-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            
                            // Client-side validation
                            if (checkoutData.name.trim().length < 3) {
                              toast({ title: "خطأ في البيانات", description: "يرجى إدخال اسم حقيقي", variant: "destructive" });
                              return;
                            }

                            const cleanPhone = checkoutData.phone.replace(/[^0-9]/g, '');
                            if (cleanPhone.length < 9) {
                              toast({ title: "رقم الهاتف غير صحيح", description: "يرجى التأكد من كتابة رقم الهاتف بشكل صحيح", variant: "destructive" });
                              return;
                            }

                            if (checkoutData.address.trim().length < 5) {
                              toast({ title: "العنوان ناقص", description: "يرجى كتابة العنوان بالتفصيل لضمان وصول الطلب", variant: "destructive" });
                              return;
                            }

                            checkoutMutation.mutate();
                          }}
                        >
                          <Input
                            placeholder="الاسم كاملًا"
                            required
                            value={checkoutData.name}
                            onChange={e => setCheckoutData(prev => ({ ...prev, name: e.target.value }))}
                            className="text-right"
                          />
                          <Input
                            placeholder="رقم الهاتف (للتواصل)"
                            required
                            type="tel"
                            value={checkoutData.phone}
                            onChange={e => setCheckoutData(prev => ({ ...prev, phone: e.target.value }))}
                            className="text-right"
                          />
                          <Input
                            placeholder="العنوان بالتفصيل"
                            required
                            value={checkoutData.address}
                            onChange={e => setCheckoutData(prev => ({ ...prev, address: e.target.value }))}
                            className="text-right"
                          />

                          <div className="space-y-3">
                            <label className="text-sm font-bold block text-right">طريقة الدفع</label>
                            <RadioGroup
                              value={checkoutData.paymentMethod}
                              onValueChange={(val) => setCheckoutData(prev => ({ ...prev, paymentMethod: val }))}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div className="flex items-center justify-end space-x-2 space-x-reverse border rounded-xl p-3 cursor-pointer">
                                <Label htmlFor="cod" className="cursor-pointer">الدفع عند الاستلام</Label>
                                <RadioGroupItem value="cod" id="cod" />
                              </div>
                              <div className="flex items-center justify-end space-x-2 space-x-reverse border rounded-xl p-3 cursor-pointer">
                                <Label htmlFor="bank" className="cursor-pointer">تحويل بنكي</Label>
                                <RadioGroupItem value="bank" id="bank" />
                              </div>
                            </RadioGroup>
                          </div>

                          {checkoutData.paymentMethod === "bank" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                              <label className="text-sm font-bold block text-right">اختر البنك</label>
                              <Select
                                value={checkoutData.bankId}
                                onValueChange={(val) => setCheckoutData(prev => ({ ...prev, bankId: val }))}
                              >
                                <SelectTrigger className="text-right">
                                  <SelectValue placeholder="اختر الحساب المحول إليه" />
                                </SelectTrigger>
                                <SelectContent>
                                  {banks?.map((bank) => (
                                    <SelectItem key={bank.id} value={bank.id}>
                                      {bank.bankName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {checkoutData.bankId && (
                                <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 text-right space-y-1">
                                  {banks?.find(b => b.id === checkoutData.bankId) && (
                                    <>
                                      <p className="text-xs text-muted-foreground font-bold">بيانات الحساب:</p>
                                      <p className="text-sm font-black">{banks.find(b => b.id === checkoutData.bankId).accountName}</p>
                                      <p className="font-mono text-sm">{banks.find(b => b.id === checkoutData.bankId).accountNumber}</p>
                                      <p className="text-[10px] text-primary/60 mt-1">يرجى إرفاق إشعار التحويل في الواتساب عند الطلب.</p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold"
                            disabled={checkoutMutation.isPending}
                          >
                            {checkoutMutation.isPending ? "جاري المعالجة..." : "تأكيد واستمرار للواتساب"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Link href="/login">
                      <Button className="w-full h-12 rounded-full font-bold text-lg shadow-lg hover:shadow-primary/20" data-testid="button-login-checkout">
                        تسجيل الدخول لإتمام الشراء
                      </Button>
                    </Link>
                  )}
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
