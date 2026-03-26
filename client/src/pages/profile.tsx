import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Package,
  ShieldCheck,
  MapPin,
  ChevronLeft,
  Heart,
  FileText,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  ChevronRight,
  User as UserIcon,
  LogOut,
  UserCog,
  ShoppingBag,
  Bell,
  Wallet,
  ArrowRight,
  Fingerprint,
  Check,
  ImageIcon,
  Mail,
  Lock,
  Key,
  RefreshCw,
  History as HistoryIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { apiRequest, setCustomerToken } from "../lib/api";
import { useCurrentUser, useLogout } from "../hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useAddToCart } from "@/hooks/use-cart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatOrderDate(value: string | null) {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const profileSchema = z.object({
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z.string().min(9, { message: "رقم الهاتف غير صحيح" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

const statusData: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  processing: { label: "قيد التجهيز", icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  completed: { label: "تم التوصيل", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
};

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const addToCartMutation = useAddToCart();
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isTrackOpen, setIsTrackOpen] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["/api/orders/me"],
    queryFn: () => apiRequest("/api/orders/me"),
    enabled: !!user,
  });

  // Mutation to close an order (set status to cancelled)
  const closeOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest(`/api/orders/${orderId}/close`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/me"] });
      toast({ title: "تم إغلاق الطلب", description: "تم إغلاق الطلب بنجاح." });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إغلاق الطلب",
        description: error.message || "حدث خطأ غير متوقع.",
        variant: "destructive",
      });
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  // Password change form schema and hook
  const passwordSchema = z.object({
    currentPassword: z.string().min(6, { message: "كلمة السر الحالية يجب أن تكون 6 أحرف على الأقل" }),
    newPassword: z.string().min(6, { message: "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل" }),
    confirmPassword: z.string().min(6),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمة السر الجديدة وتأكيدها غير متطابقين",
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) =>
      apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast({ title: "تم تغيير كلمة السر", description: "تم حفظ كلمة السر الجديدة بنجاح." });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل تغيير كلمة السر", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    } else if (!isUserLoading) {
      setLocation("/login");
    }
  }, [user, profileForm, isUserLoading, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: (values: any) => apiRequest("/api/auth/me", { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "تم التحديث", description: "تم تحديث بياناتك الشخصية بنجاح." });
    },
    onError: (error: any) => toast({ title: "خطأ", description: error.message, variant: "destructive" }),
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest(`/api/orders/${orderId}/read-notification`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/me"] });
    },
  });

  const handleTrackClick = (order: any) => {
    setSelectedOrder(order);
    setIsTrackOpen(true);
    if (order.hasNewNotification) {
      markNotificationReadMutation.mutate(order.id);
    }
  };

  const handleEnableBiometrics = async () => {
    try {
      if (!window.PublicKeyCredential) {
        toast({
          title: "غير مدعوم",
          description: "جهازك أو متصفحك لا يدعم السمات الحيوية (WebAuthn).",
          variant: "destructive",
        });
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      if (!user) return;
      const userIdBuffer = new TextEncoder().encode(user.id);
      
      const credential = await navigator.credentials.create({

        publicKey: {
          challenge: challenge.buffer,
          rp: { 
            name: "الراقي للمنتجات الغذائية",
            id: window.location.hostname === "localhost" ? undefined : window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: user?.email || "user",
            displayName: user?.name || "User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          timeout: 60000,
          attestation: "direct",
        }
      });

      if (credential) {
        const deviceToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await apiRequest("/api/auth/biometric/enable", {
          method: "POST",
          body: JSON.stringify({ token: deviceToken }),
        });

        localStorage.setItem("alraqi_biometric_email", user?.email || "");
        localStorage.setItem("alraqi_biometric_token", deviceToken);

        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "تم التفعيل", description: "تم تفعيل الدخول بالبصمة/الوجه بنجاح لهذا الجهاز." });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "فشل التفعيل",
        description: error.message || "تعذر إكمال عملية التحقق",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (itemsJson: string) => {
    try {
      const items = JSON.parse(itemsJson);
      for (const item of items) {
        await addToCartMutation.mutateAsync(item.id);
      }
      toast({ title: "تمت إعادة الطلب", description: "تمت إضافة كافة المنتجات إلى سلتك." });
      setLocation("/cart");
    } catch (e) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إضافة المنتجات للسلة.", variant: "destructive" });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]" dir="rtl">
      <Navbar />
      
      <div className="bg-white border-b sticky top-0 z-40 md:relative">
         <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-primary/10 shadow-xl overflow-hidden bg-primary/5 flex items-center justify-center text-4xl font-black text-primary hover:scale-105 transition-transform cursor-pointer">
                    {user.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : user.name?.charAt(0) || "U"}
                  </div>
                  <div className="text-right flex-1">
                     <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{user.name || "مرحباً بك"}</h1>
                     <p className="text-gray-500 font-bold text-sm">{user.email}</p>
                     <div className="flex gap-2 mt-3 overflow-x-auto pb-1 invisible-scrollbar">
                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black text-emerald-600 border border-emerald-100">
                           <ShieldCheck className="h-3 w-3 md:h-4 md:w-4" /> عضو بلاتيني
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black text-primary border border-primary/10">
                           <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" /> {ordersQuery.data?.length || 0} طلبات
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="hidden md:flex items-center gap-3">
                  <Button variant="outline" className="rounded-2xl font-black h-12 px-6 border-2 hover:bg-gray-50" onClick={() => setLocation("/")}>العودة للتسوق <ChevronLeft className="h-5 w-5 rotate-180 mr-2" /></Button>
               </div>
            </div>
         </div>
      </div>

      <main className="container mx-auto flex-1 px-4 py-6 md:py-10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="w-full lg:w-80 space-y-4">
                   <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                      <div className="flex items-center gap-5 mb-8">
                         <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-[#2c917a] flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <UserIcon className="h-8 w-8" />
                         </div>
                         <div className="text-right">
                            <h2 className="font-black text-xl text-gray-900 leading-tight">{user.name}</h2>
                            <p className="text-sm font-bold text-gray-400">عميل الراقي المميز</p>
                         </div>
                     </div>

                      <nav className="space-y-1">
                         {[
                            { id: "orders", label: "طلباتي", icon: ShoppingBag, hasNtf: ordersQuery.data?.some((o: any) => o.hasNewNotification && o.status !== 'cancelled') },
                            { id: "wallet", label: "المحفظة", icon: Wallet },
                            { id: "profile", label: "البيانات الشخصية", icon: Settings },
                            { id: "password", label: "كلمة السر", icon: Key },
                             { id: "orderHistory", label: "الطلبات الملغية", icon: HistoryIcon, hasNtf: ordersQuery.data?.some((o: any) => o.hasNewNotification && o.status === 'cancelled') },
                            { id: "settings", label: "الأمان", icon: ShieldCheck },
                         ].map((tab) => (
                            <button
                               key={tab.id}
                               onClick={() => setActiveTab(tab.id)}
                               className={cn(
                                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black relative group",
                                  activeTab === tab.id 
                                     ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                     : "text-gray-500 hover:bg-gray-50"
                               )}
                            >
                               <div className="flex items-center gap-4">
                                  <tab.icon className={cn("h-5 w-5", activeTab === tab.id ? "text-white" : "text-gray-400 group-hover:text-primary")} />
                                  <span>{tab.label}</span>
                               </div>
                               {tab.hasNtf && (
                                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse" />
                               )}
                               {activeTab === tab.id && <ChevronLeft className="h-5 w-5 opacity-50" />}
                            </button>
                         ))}
                      </nav>
                   </div>
                  <button onClick={() => logoutMutation.mutate()} className="flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-rose-600 hover:bg-rose-50 transition-all mt-6"><LogOut className="h-5 w-5 text-rose-400" /> تسجيل الخروج</button>
               </aside>

                <div className="flex md:hidden items-center justify-between gap-2 overflow-x-auto pb-4 invisible-scrollbar sticky top-[80px] z-30 bg-[#F7F8FA]">
                  {[
                    { id: "orders", label: "طلباتي", icon: ShoppingBag },
                     { id: "orderHistory", label: "ملغية", icon: HistoryIcon },
                    { id: "profile", label: "الملف", icon: UserCog },
                    { id: "password", label: "كلمة السر", icon: Settings },
                    { id: "settings", label: "الأمان", icon: ShieldCheck }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl font-black text-[10px] transition-all whitespace-nowrap",
                        activeTab === item.id ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white text-gray-500 shadow-sm"
                      )}
                    >
                      <item.icon className="h-4 w-4 mb-1" />
                      {item.label}
                    </button>
                  ))}
                </div>

            <div className="lg:col-span-9 space-y-6">
               {activeTab === "orders" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl md:text-2xl font-black text-gray-900">سجل طلباتي</h2>
                       <Search className="h-5 w-5 text-gray-400 cursor-pointer hover:text-primary transition-colors" />
                    </div>

                    {ordersQuery.isLoading ? (
                      <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="font-bold text-muted-foreground">جاري استرجاع طلباتك...</p></div>
                    ) : ordersQuery.data?.filter((order: any) => order.status !== "cancelled").length ? (
                      <div className="grid gap-5">
                         {ordersQuery.data.filter((order: any) => order.status !== "cancelled").map((order: any) => {
                            const status = statusData[order.status] || statusData.pending;
                            const items = JSON.parse(order.items || "[]");
                            return (
                              <Card key={order.id} className="border-none shadow-sm md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-visible rounded-[2rem] bg-white group transition-all duration-300 relative">
                                 {/* "Red Mark" Close Button (Top Left in RTL) */}
                                 {order.status === "pending" && (
                                   <button 
                                      onClick={() => closeOrderMutation.mutate(order.id)}
                                      className="absolute -top-3 -right-3 md:top-4 md:right-4 z-20 h-8 w-8 md:h-10 md:w-10 bg-white border-2 border-rose-100 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all transform hover:rotate-90"
                                      title="إغلاق / إلغاء الطلب"
                                   >

                                      <XCircle className="h-5 w-5 md:h-6 md:w-6" />
                                   </button>
                                 )}

                                 <div className="flex flex-col">
                                    <div className="p-5 md:p-6 flex items-center justify-between border-b border-gray-50">
                                       <div className="flex items-center gap-3">
                                          <div className={cn("p-2.5 rounded-2xl", status.bg)}>
                                             <status.icon className={cn("h-5 w-5", status.color)} />
                                          </div>
                                          <div>
                                             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatOrderDate(order.createdAt)}</div>
                                             <h3 className="font-black text-gray-900">طلب #{order.id.slice(0, 8).toUpperCase()}</h3>
                                          </div>
                                       </div>
                                       <Badge className={cn("px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black border", status.bg, status.color, status.border)}>
                                          {status.label}
                                       </Badge>
                                    </div>

                                    <div className="p-5 md:p-6">
                                       <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-4">
                                              <div className="text-right">
                                                 <p className="text-[10px] font-bold text-gray-400 mb-1">إجمالي المبلغ</p>
                                                 <p className="text-lg md:text-xl font-black text-primary">{formatPrice(order.total)}</p>
                                              </div>
                                              {order.hasNewNotification && (
                                                <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full text-rose-500 animate-pulse">
                                                  <Bell className="h-3 w-3" />
                                                  <span className="text-[10px] font-black">تحديث جديد!</span>
                                                </div>
                                              )}
                                           </div>
                                          <div className="flex gap-2">
                                             <Button 
                                                size="sm" 
                                                className="rounded-full font-black px-4 md:px-6 h-10 bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none"
                                                onClick={() => handleTrackClick(order)}
                                             >
                                                تفاصيل الطلب <FileText className="h-4 w-4 mr-1.5" />
                                              </Button>
                                              <Button 
                                                 size="sm" 
                                                 variant="outline" 
                                                 className="rounded-full font-black px-4 md:px-6 h-10 border-2"
                                                 onClick={() => handleReorder(order.items)}
                                              >
                                                 إعادة طلب <RotateCcw className="h-4 w-4 mr-1.5 text-orange-500" />
                                              </Button>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </Card>
                             )
                          })}
                      </div>

                    ) : (
                      <div className="bg-white rounded-[2rem] p-16 text-center shadow-lg shadow-gray-100 animate-in zoom-in-95">
                         <div className="bg-primary/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                            <ShoppingBag className="h-12 w-12 text-primary/40" />
                         </div>
                         <h3 className="text-2xl font-black text-gray-900 mb-3">سجل طلباتك خالي حالياً</h3>
                         <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">ابدأ الآن رحلة تسوق ممتعة واستمتع بأفضل المنتجات السودانية الأصيلة.</p>
                         <Button onClick={() => setLocation("/shop")} className="rounded-full px-10 h-14 text-lg font-black shadow-xl shadow-primary/20">ابدأ التسوق الآن <ArrowRight className="h-5 w-5 mr-2 rotate-180" /></Button>
                      </div>
                    )}
                 </div>
               )}

               {activeTab === "profile" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-black text-gray-900">البيانات الشخصية</h2>
                    <Card className="border-none shadow-sm p-8 rounded-[2rem] bg-white">
                       <Form {...profileForm}>
                          <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={profileForm.control} name="name" render={({ field }) => (
                                   <FormItem><FormLabel className="font-bold pr-2">الاسم الكامل</FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                   <FormItem><FormLabel className="font-bold pr-2">رقم الموبايل</FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={profileForm.control} name="email" render={({ field }) => (
                                   <FormItem className="md:col-span-2"><FormLabel className="font-bold pr-2">البريد الإلكتروني</FormLabel><FormControl><Input {...field} disabled className="h-14 rounded-2xl bg-gray-100 border-none text-right font-black opacity-70" /></FormControl><FormMessage /></FormItem>
                                )} />
                             </div>
                             <Button type="submit" className="w-full md:w-auto rounded-full px-12 h-14 font-black text-lg shadow-xl shadow-primary/10" disabled={updateProfileMutation.isPending}>
                                {updateProfileMutation.isPending ? "جاري الحفظ..." : "تحديث البيانات"}
                             </Button>
                          </form>
                       </Form>
                    </Card>
                 </div>
               )}
               
               {activeTab === "wallet" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <h2 className="text-2xl font-black text-gray-900">محفظتك</h2>
                     <Card className="border-none bg-gradient-to-br from-primary to-[#2c917a] text-white p-10 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                           <div className="flex items-center gap-3 mb-8 opacity-90"><Wallet className="h-6 w-6" /><span className="font-bold text-sm tracking-widest uppercase">الرصيد المتاح</span></div>
                           <h3 className="text-5xl font-black mb-10 tracking-tighter">0.00 <span className="text-lg opacity-80">ج.س</span></h3>
                           <div className="flex flex-wrap gap-4">
                              <Button className="bg-white text-primary hover:bg-white/90 rounded-full font-black px-8 h-12 shadow-lg">تعريف الحساب</Button>
                              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full font-black px-8 h-12">سجل العمليات</Button>
                           </div>
                        </div>
                     </Card>
                  </div>
               )}

               {activeTab === "settings" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-black text-gray-900">إعدادات الحساب والأمان</h2>
                    <Card className="border-none shadow-sm overflow-hidden rounded-[2rem] bg-white">
                      <CardHeader className="bg-gray-50/50 border-b p-8">
                        <CardTitle className="text-xl font-black flex items-center gap-3">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                          الأمان والسمات الحيوية
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-bold">
                          قم بتفعيل الدخول السريع عبر بصمة الإصبع أو التعرف على الوجه
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-[1.5rem] bg-[#F8F9FB] border-2 border-dashed border-gray-200">
                          <div className="flex items-center gap-4 text-right">
                            <div className={cn(
                              "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                              user.biometricEnabled ? "bg-primary text-white" : "bg-white text-gray-300"
                            )}>
                              <Fingerprint className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-black text-gray-900">الدخول بالبصمة / الوجه</h3>
                              <p className="text-sm text-gray-500 font-bold">
                                {user.biometricEnabled ? "مفعل على هذا الحساب" : "غير مفعل حالياً"}
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleEnableBiometrics()}
                            variant={user.biometricEnabled ? "outline" : "default"}
                            className="rounded-full px-8 h-12 font-black shadow-lg"
                          >
                            {user.biometricEnabled ? "إعادة ضبط البصمة" : "تفعيل الآن"}
                          </Button>
                        </div>

                        <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
                          <p className="text-xs text-amber-700 font-bold leading-relaxed">
                            ملاحظة: تفعيل السمات الحيوية يعتمد على تقنية WebAuthn وسيعمل فقط على هذا المتصفح/الجهاز الذي تقوم بتفعيله منه حالياً.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm p-8 rounded-[2rem] bg-white border-t-4 border-t-rose-500">
                       <h3 className="text-xl font-black text-rose-600 mb-2">منطقة الخطر</h3>
                       <p className="text-gray-500 font-bold mb-6">حذف الحساب سيؤدي إلى فقدان جميع بياناتك وطلباتك بشكل نهائي.</p>
                       <Button variant="destructive" className="rounded-full px-8 h-12 font-black">حذف الحساب نهائياً</Button>
                    </Card>
                  </div>
               )}

               {/* Change Password Tab */}
               {activeTab === "password" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h2 className="text-2xl font-black text-gray-900">تغيير كلمة السر</h2>
                   <Card className="border-none shadow-sm p-8 rounded-[2rem] bg-white">
                     <Form {...passwordForm}>
                       <form onSubmit={passwordForm.handleSubmit((v) => changePasswordMutation.mutate(v))} className="space-y-6">
                         <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                           <FormItem>
                             <FormLabel className="font-bold pr-2">كلمة السر الحالية</FormLabel>
                             <FormControl>
                               <Input type="password" {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )} />
                         <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                           <FormItem>
                             <FormLabel className="font-bold pr-2">كلمة السر الجديدة</FormLabel>
                             <FormControl>
                               <Input type="password" {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )} />
                         <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                           <FormItem>
                             <FormLabel className="font-bold pr-2">تأكيد كلمة السر</FormLabel>
                             <FormControl>
                               <Input type="password" {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )} />
                         <Button type="submit" className="w-full md:w-auto rounded-full px-12 h-14 font-black text-lg shadow-xl shadow-primary/10" disabled={changePasswordMutation.isPending}>
                           {changePasswordMutation.isPending ? "جاري الحفظ..." : "تغيير كلمة السر"}
                         </Button>
                       </form>
                     </Form>
                   </Card>
                 </div>
               )}

                {/* Cancelled Order History */}
                {activeTab === "orderHistory" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl md:text-2xl font-black text-gray-900">سجل الطلبات الملغية</h2>
                       <HistoryIcon className="h-5 w-5 text-gray-400" />
                    </div>

                    {ordersQuery.isLoading ? (
                      <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="font-bold text-muted-foreground">جاري تحميل سجل المحفوظات...</p></div>
                    ) : (ordersQuery.data || []).filter((order: any) => order.status === "cancelled").length ? (
                      <div className="grid gap-5">
                         {ordersQuery.data?.filter((order: any) => order.status === "cancelled").map((order: any) => {
                            const s = statusData[order.status] || statusData.cancelled;
                            return (
                              <Card key={order.id} className="border-none shadow-sm overflow-hidden rounded-[2rem] bg-white border-r-4 border-r-rose-400">
                                 <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                       <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                                          <XCircle className="h-6 w-6 text-rose-500" />
                                       </div>
                                       <div>
                                          <div className="text-[10px] font-bold text-gray-400">{formatOrderDate(order.createdAt)}</div>
                                          <h3 className="font-black text-gray-900 leading-none">طلب #{order.id.slice(0, 8).toUpperCase()}</h3>
                                          <Badge className={cn("mt-2 px-3 py-0.5 rounded-full border-none font-black text-[10px]", s.color, "text-white")}>{s.label}</Badge>
                                       </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-5 md:pt-0">
                                       {order.hasNewNotification && (
                                         <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full text-rose-500 animate-pulse">
                                           <Bell className="h-3 w-3" />
                                           <span className="text-[10px] font-black">تحديث جديد!</span>
                                         </div>
                                       )}
                                       <div className="text-right shrink-0">
                                          <p className="text-[10px] font-black text-gray-400 mb-0.5">الإجمالي كاش</p>
                                          <p className="text-xl font-black text-primary">{formatPrice(order.total)}</p>
                                       </div>
                                       <Button 
                                          size="sm" 
                                          className="rounded-full font-black px-6 h-12 shadow-lg shadow-primary/10"
                                          onClick={() => handleTrackClick(order)}
                                       >
                                          تتبع الطلب
                                       </Button>
                                    </div>
                                 </div>
                              </Card>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[2rem] p-16 text-center shadow-lg shadow-gray-100/50">
                          <HistoryIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                         <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد طلبات ملغية</h3>
                         <p className="text-gray-500 font-medium">سجلك نظيف جداً! لم تقم بإلغاء أي طلب مؤخراً.</p>
                      </div>
                    )}
                  </div>
                )}

            </div>
         </div>
      </main>

      <Dialog open={isTrackOpen} onOpenChange={setIsTrackOpen}>
         <DialogContent className="rounded-[2rem] md:rounded-[2.5rem] p-0 overflow-hidden border-none w-[95vw] max-w-lg max-h-[90vh] flex flex-col hide-scrollbar">
             {selectedOrder && (
               <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
                  <div className="bg-primary p-6 md:p-8 text-white relative shrink-0">
                     <DialogClose className="absolute top-4 outline-none left-4 md:top-6 md:left-6 text-white/70 hover:text-white"><XCircle className="h-6 w-6 md:h-7 md:w-7" /></DialogClose>
                     <h2 className="text-lg md:text-xl font-black mb-1 md:mb-2 opacity-80 text-right">تتبع طلبك</h2>
                     <h3 className="text-2xl md:text-3xl font-black text-right">#{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                     <div className="flex items-center gap-2 mt-3 md:mt-4 bg-white/10 w-fit px-3 py-1.5 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold capitalize ml-auto">
                        {statusData[selectedOrder.status as keyof typeof statusData]?.icon && React.createElement(statusData[selectedOrder.status as keyof typeof statusData].icon, { className: "h-4 w-4" })} {selectedOrder.status === 'delivered' ? 'وصلت بسلام' : 'قيد المتابعة'}
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 bg-white">
                     <div className="space-y-6 md:space-y-8 relative before:absolute before:inset-y-0 before:right-6 md:before:right-7 before:w-0.5 before:bg-gray-100 pb-2">
                        {(() => {
                           try {
                              const timeline = JSON.parse(selectedOrder.statusTimeline || '[]');
                              if (timeline.length === 0) {
                                 const s = statusData[selectedOrder.status as keyof typeof statusData] || statusData.pending;
                                 return (
                                    <div className="flex items-start gap-4 md:gap-5 relative group">
                                       <div className={cn("z-10 h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-all shadow-lg", s.color)}>
                                          <s.icon className="h-6 w-6 text-white" />
                                       </div>
                                       <div className="pt-1 text-right">
                                          <h4 className="text-base font-black text-gray-900 leading-none mb-1">{s.label}</h4>
                                          <p className="text-[10px] text-muted-foreground font-medium">{formatOrderDate(selectedOrder.createdAt)}</p>
                                       </div>
                                    </div>
                                 );
                              }
                              return timeline.map((event: any, idx: number) => {
                                 const s = statusData[event.status as keyof typeof statusData] || statusData.pending;
                                 return (
                                    <div key={idx} className="flex items-start gap-4 md:gap-5 relative group">
                                       <div className={cn(
                                          "z-10 h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                                          idx === timeline.length - 1 ? `${s.color} text-white` : "bg-gray-100 text-gray-400"
                                       )}>
                                          <s.icon className="h-6 w-6" />
                                       </div>
                                       <div className="pt-1 text-right">
                                          <h4 className={cn("text-base font-black leading-none mb-1", idx === timeline.length - 1 ? "text-gray-900" : "text-gray-400")}>{s.label}</h4>
                                          <p className="text-[10px] text-muted-foreground font-medium">{formatOrderDate(event.time)}</p>
                                       </div>
                                    </div>
                                 );
                              });
                           } catch (e) {
                              return null;
                           }
                        })()}
                     </div>
                     
                     <div className="mt-8 border-t pt-8">
                       <h4 className="text-sm md:text-base font-black text-gray-900 mb-4 text-right">تفاصيل المنتجات:</h4>
                       <div className="space-y-3">
                         {(() => {
                           try {
                             const items = JSON.parse(selectedOrder.items || '[]');
                             return items.map((item: any, idx: number) => (
                               <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                 <div className="text-right">
                                   <p className="text-xs md:text-sm font-bold text-gray-900">{item.name}</p>
                                   <p className="text-[10px] md:text-xs text-muted-foreground mt-1">الكمية: {item.quantity}</p>
                                 </div>
                                 <p className="text-sm md:text-base font-black text-primary shrink-0 mr-2">{formatPrice(item.price)}</p>
                               </div>
                             ));
                           } catch(e) {
                             return <p className="text-gray-500 text-xs md:text-sm">خطأ في عرض تفاصيل المنتجات.</p>;
                           }
                         })()}
                       </div>
                     </div>
                     
                     <div className="bg-[#F8F9FB] rounded-[2rem] p-6">
                        <div className="flex items-center gap-3 mb-4 justify-end">
                           <h4 className="text-sm md:text-base font-black text-gray-900">عنوان التوصيل</h4>
                           <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed text-right">{selectedOrder.address}</p>
                     </div>

                     <Button className="w-full h-14 rounded-full font-black text-lg shadow-xl shadow-primary/20" onClick={() => setIsTrackOpen(false)}>إغلاق التفاصيل</Button>
                  </div>
               </div>

            )}
         </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
