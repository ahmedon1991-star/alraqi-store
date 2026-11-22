import { useEffect, useMemo, useState } from "react";
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
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User as UserIcon,
  LogOut,
  ShoppingBag,
  Fingerprint,
  KeyRound,
  Receipt,
  Wallet,
  Phone,
  CalendarDays,
  ChevronLeft,
  BellDot,
  Truck,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { apiRequest } from "../lib/api";
import { useCurrentUser, useLogout } from "../hooks/use-auth";
import { cn, formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OrderItem = { id: string; name: string; price: number; quantity: number; size?: string | null };
type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string | null;
  updatedAt?: string | null;
  address: string | null;
  phone: string | null;
  name: string | null;
  items: string | null;
  paymentMethod?: string;
  statusTimeline?: string | null;
  hasNewNotification?: boolean;
};

const DATE_LOCALE = "ar-EG-u-nu-latn";

function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function parseItems(order: Order): OrderItem[] {
  try {
    const items = JSON.parse(order.items || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function orderNumber(order: Order) {
  return order.id.slice(0, 8).toUpperCase();
}

const STATUS: Record<string, { label: string; icon: any; chip: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25" },
  processing: { label: "قيد التجهيز", icon: Truck, chip: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25" },
  completed: { label: "تم التوصيل", icon: CheckCircle2, chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" },
  cancelled: { label: "ملغي", icon: XCircle, chip: "bg-destructive/10 text-destructive border-destructive/25" },
};

const STEPS = [
  { key: "pending", label: "استلام الطلب", icon: ClipboardCheck },
  { key: "processing", label: "التجهيز", icon: Package },
  { key: "completed", label: "التوصيل", icon: CheckCircle2 },
];

function StatusChip({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", s.chip, className)}>
      <s.icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

/** Three-step progress: استلام ← تجهيز ← توصيل (hidden for cancelled orders). */
function OrderProgress({ status }: { status: string }) {
  const current = STEPS.findIndex((s) => s.key === status);
  if (current === -1) return null;
  return (
    <div className="flex items-center" aria-label={`حالة الطلب: ${STATUS[status]?.label}`}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <div key={step.key} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1">
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
              )}>
                <step.icon className="h-3.5 w-3.5" />
              </span>
              <span className={cn("text-[10px] md:text-xs font-bold whitespace-nowrap", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-1 mb-5 h-0.5 flex-1 rounded-full", i < current ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z.string().trim().min(9, { message: "رقم الهاتف غير صحيح" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "أدخل كلمة السر الحالية" }),
  newPassword: z.string().min(6, { message: "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل" }),
  confirmPassword: z.string().min(1, { message: "أعد كتابة كلمة السر الجديدة" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "كلمة السر الجديدة وتأكيدها غير متطابقين",
});

type Tab = "orders" | "account" | "security";
type OrderFilter = "all" | "active" | "completed" | "cancelled";

const inputClass = "h-12 rounded-xl bg-background text-right";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();

  const [tab, setTab] = useState<Tab>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const ordersQuery = useQuery<Order[]>({
    queryKey: ["/api/orders/me"],
    queryFn: () => apiRequest("/api/orders/me"),
    enabled: !!user,
  });
  const orders = ordersQuery.data || [];

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
    const spent = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + (o.total || 0), 0);
    return { total: orders.length, active, spent };
  }, [orders]);

  const filterCounts = useMemo(() => ({
    all: orders.length,
    active: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }), [orders]);

  const visibleOrders = useMemo(() => orders.filter((o) => {
    if (orderFilter === "active") return o.status === "pending" || o.status === "processing";
    if (orderFilter === "completed") return o.status === "completed";
    if (orderFilter === "cancelled") return o.status === "cancelled";
    return true;
  }), [orders, orderFilter]);

  const hasUpdates = orders.some((o) => o.hasNewNotification);

  // ----- forms -----
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name || "", phone: user.phone || "", email: user.email || "" });
    } else if (!isUserLoading) {
      setLocation("/login");
    }
  }, [user, profileForm, isUserLoading, setLocation]);

  // ----- mutations -----
  const updateProfileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) =>
      apiRequest("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name: values.name, phone: values.phone }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "تم الحفظ", description: "تم تحديث بياناتك بنجاح." });
    },
    onError: (error: any) => toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) =>
      apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      }),
    onSuccess: () => {
      toast({ title: "تم تغيير كلمة السر", description: "تم تسجيل خروج أجهزتك الأخرى للأمان." });
      passwordForm.reset();
    },
    onError: (error: any) => toast({ title: "تعذر تغيير كلمة السر", description: error.message, variant: "destructive" }),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest(`/api/orders/${orderId}/close`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/me"] });
      toast({ title: "تم إلغاء الطلب" });
    },
    onError: (error: any) => toast({ title: "تعذر إلغاء الطلب", description: error.message, variant: "destructive" }),
  });

  const markSeenMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest(`/api/orders/${orderId}/read-notification`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders/me"] }),
  });

  // ----- actions -----
  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    if (order.hasNewNotification) markSeenMutation.mutate(order.id);
  };

  /** Put the same products (and quantities / sizes) back in the cart. */
  const reorder = async (order: Order) => {
    const items = parseItems(order);
    if (items.length === 0) return;
    setReorderingId(order.id);
    let added = 0;
    for (const item of items) {
      try {
        await apiRequest("/api/cart", {
          method: "POST",
          body: JSON.stringify({ productId: item.id, quantity: item.quantity || 1, size: item.size || undefined }),
        });
        added++;
      } catch {
        // product no longer available — skip it
      }
    }
    setReorderingId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    if (added === 0) {
      toast({ title: "المنتجات غير متوفرة حالياً", description: "لم نتمكن من إضافة منتجات هذا الطلب للسلة.", variant: "destructive" });
      return;
    }
    toast({
      title: "أُضيفت المنتجات للسلة",
      description: added < items.length ? `أُضيف ${added} من ${items.length} — بعض المنتجات غير متوفرة حالياً.` : undefined,
    });
    setLocation("/cart");
  };

  const enableBiometrics = async () => {
    if (!user) return;
    if (!window.PublicKeyCredential) {
      toast({ title: "غير مدعوم", description: "جهازك أو متصفحك لا يدعم الدخول بالبصمة.", variant: "destructive" });
      return;
    }
    try {
      setIsBiometricLoading(true);
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "الراقي للمنتجات الغذائية" },
          user: { id: new TextEncoder().encode(user.id), name: user.email || "user", displayName: user.name || "User" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { userVerification: "required", residentKey: "preferred", requireResidentKey: false },
          timeout: 60000,
          attestation: "none",
        },
      });
      if (credential) {
        // The server generates a strong random device secret and stores only its hash
        const result = await apiRequest("/api/auth/biometric/enable", { method: "POST", body: JSON.stringify({}) });
        localStorage.setItem("alraqi_biometric_email", user.email || "");
        localStorage.setItem("alraqi_biometric_token", result.deviceToken);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "تم التفعيل", description: "يمكنك الآن الدخول بالبصمة أو الوجه من هذا الجهاز." });
      }
    } catch (error: any) {
      if (error?.name !== "NotAllowedError" && error?.name !== "AbortError") {
        toast({ title: "تعذر التفعيل", description: error?.message || "تعذر إكمال عملية التحقق", variant: "destructive" });
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  // ----- render -----
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const memberSince = (user as any).createdAt ? formatDate((user as any).createdAt, false) : null;
  const initial = (user.name || user.email || "؟").trim().charAt(0);
  const isGoogle = user.authProvider === "google";

  const tabs: Array<{ id: Tab; label: string; icon: any; dot?: boolean }> = [
    { id: "orders", label: "طلباتي", icon: ShoppingBag, dot: hasUpdates },
    { id: "account", label: "بياناتي", icon: UserIcon },
    { id: "security", label: "الأمان", icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="container mx-auto max-w-4xl flex-1 px-4 py-5 md:py-10 space-y-5 md:space-y-6">
        {/* ---------- Header ---------- */}
        <section className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-2xl md:text-3xl font-black text-primary">
              {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initial}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-black text-foreground truncate">{user.name || "مرحباً بك"}</h1>
              <p className="text-sm text-muted-foreground truncate" dir="ltr" style={{ textAlign: "right" }}>{user.email}</p>
              {memberSince && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  عضو منذ {memberSince}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
            {[
              { label: "الطلبات", value: stats.total.toLocaleString(DATE_LOCALE), icon: Receipt },
              { label: "قيد التنفيذ", value: stats.active.toLocaleString(DATE_LOCALE), icon: Clock },
              { label: "مشترياتك (ج.س)", value: stats.spent.toLocaleString(DATE_LOCALE), icon: Wallet },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-muted/60 px-3 py-3 text-center">
                <s.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="font-mono text-sm md:text-lg font-black text-foreground leading-tight truncate">{s.value}</p>
                <p className="text-[11px] md:text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Tabs ---------- */}
        <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors",
                tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.dot && tab !== t.id && <span className="absolute top-2 left-3 h-2 w-2 rounded-full bg-destructive" />}
            </button>
          ))}
        </nav>

        {/* ---------- Orders ---------- */}
        {tab === "orders" && (
          <section className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {([
                ["all", "الكل"],
                ["active", "الحالية"],
                ["completed", "المكتملة"],
                ["cancelled", "الملغية"],
              ] as Array<[OrderFilter, string]>).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setOrderFilter(id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors",
                    orderFilter === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="mr-1.5 font-mono text-xs opacity-70">{filterCounts[id]}</span>
                </button>
              ))}
            </div>

            {ordersQuery.isLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                جاري تحميل طلباتك...
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-primary/40" />
                <h3 className="text-lg font-black text-foreground">
                  {orders.length === 0 ? "لم تطلب أي شيء بعد" : "لا توجد طلبات هنا"}
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  {orders.length === 0 ? "تصفح منتجاتنا السودانية الأصيلة واطلب ما يعجبك." : "جرّب تصنيفاً آخر من الأعلى."}
                </p>
                {orders.length === 0 && (
                  <Button className="mt-6 rounded-full px-8" onClick={() => setLocation("/shop")}>تسوق الآن</Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((order) => {
                  const items = parseItems(order);
                  const summary = items.slice(0, 2).map((i) => `${i.name} × ${i.quantity}`).join("، ");
                  const more = items.length - 2;
                  return (
                    <article key={order.id} className="rounded-3xl border border-border bg-card p-4 md:p-5 shadow-sm">
                      <header className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-foreground">طلب <span className="font-mono">#{orderNumber(order)}</span></h3>
                            {order.hasNewNotification && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                <BellDot className="h-3 w-3" /> تحديث
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <StatusChip status={order.status} />
                      </header>

                      {order.status !== "cancelled" && (
                        <div className="mt-4"><OrderProgress status={order.status} /></div>
                      )}

                      {items.length > 0 && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-1">
                          {summary}{more > 0 && ` و${more} ${more === 1 ? "منتج آخر" : "منتجات أخرى"}`}
                        </p>
                      )}

                      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <p className="font-mono text-lg font-black text-primary">{formatPrice(order.total)}</p>
                        <div className="flex flex-wrap gap-2">
                          {order.status === "pending" && (
                            <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOrderToCancel(order)}>
                              إلغاء
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="rounded-full gap-1.5" disabled={reorderingId === order.id} onClick={() => reorder(order)}>
                            {reorderingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            اطلبه مجدداً
                          </Button>
                          <Button size="sm" className="rounded-full gap-1" onClick={() => openOrder(order)}>
                            التفاصيل
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ---------- Account ---------- */}
        {tab === "account" && (
          <section className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-sm">
            <h2 className="text-lg font-black text-foreground">بياناتي</h2>
            <p className="mb-5 text-sm text-muted-foreground">تُستخدم لتعبئة طلباتك تلقائياً والتواصل معك بشأن التوصيل.</p>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={profileForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
                      <FormControl><Input {...field} className={inputClass} autoComplete="name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl><Input {...field} className={inputClass} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: "right" }} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={profileForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl><Input {...field} disabled className={cn(inputClass, "opacity-70")} dir="ltr" style={{ textAlign: "right" }} /></FormControl>
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني هو اسم الدخول لحسابك ولا يمكن تغييره من هنا.</p>
                  </FormItem>
                )} />
                <Button type="submit" className="h-11 w-full rounded-xl md:w-auto md:px-10" disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}>
                  {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </form>
            </Form>
          </section>
        )}

        {/* ---------- Security ---------- */}
        {tab === "security" && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                <KeyRound className="h-5 w-5 text-primary" />
                كلمة السر
              </h2>
              {isGoogle ? (
                <p className="mt-2 text-sm text-muted-foreground">حسابك مرتبط بحساب Google، فتسجيل الدخول يتم عبر Google ولا تحتاج كلمة سر للمتجر.</p>
              ) : (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((v) => changePasswordMutation.mutate(v))} className="mt-4 space-y-4">
                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة السر الحالية</FormLabel>
                        <FormControl><Input type="password" {...field} className={inputClass} autoComplete="current-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة السر الجديدة</FormLabel>
                          <FormControl><Input type="password" {...field} className={inputClass} autoComplete="new-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>تأكيد كلمة السر</FormLabel>
                          <FormControl><Input type="password" {...field} className={inputClass} autoComplete="new-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" className="h-11 w-full rounded-xl md:w-auto md:px-10" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? "جاري الحفظ..." : "تغيير كلمة السر"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between md:p-7 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", user.biometricEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <Fingerprint className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">الدخول بالبصمة أو الوجه</h2>
                  <p className="text-sm text-muted-foreground">
                    {user.biometricEnabled ? "مفعّل — يعمل على الجهاز الذي فعّلته منه." : "ادخل بسرعة من هذا الجهاز بدون كتابة كلمة السر."}
                  </p>
                </div>
              </div>
              <Button variant={user.biometricEnabled ? "outline" : "default"} className="h-11 rounded-xl md:px-8" onClick={enableBiometrics} disabled={isBiometricLoading}>
                {isBiometricLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : user.biometricEnabled ? "إعادة الضبط على هذا الجهاز" : "تفعيل"}
              </Button>
            </div>

            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </section>
        )}
      </main>

      {/* ---------- Order details ---------- */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {/* close (X) moved to the left so it does not cover the title in RTL */}
        <DialogContent className="w-[95vw] max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl p-0 [&>button]:left-4 [&>button]:right-auto">
          {selectedOrder && (() => {
            const items = parseItems(selectedOrder);
            const itemsTotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
            const delivery = Math.max(0, (selectedOrder.total || 0) - itemsTotal);
            let timeline: Array<{ status: string; time: string }> = [];
            try { timeline = JSON.parse(selectedOrder.statusTimeline || "[]"); } catch {}
            if (timeline.length === 0) timeline = [{ status: selectedOrder.status, time: selectedOrder.createdAt || "" }];
            return (
              <>
                <DialogHeader className="border-b border-border p-5 text-right">
                  <div className="flex items-center justify-between gap-3 pl-6">
                    <DialogTitle className="text-lg font-black">طلب <span className="font-mono">#{orderNumber(selectedOrder)}</span></DialogTitle>
                    <StatusChip status={selectedOrder.status} />
                  </div>
                  <DialogDescription className="text-right">{formatDate(selectedOrder.createdAt)}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5 p-5">
                  {selectedOrder.status !== "cancelled" && <OrderProgress status={selectedOrder.status} />}

                  {/* Timeline */}
                  <div>
                    <h4 className="mb-3 text-sm font-black text-foreground">سجل الحالة</h4>
                    <ol className="relative space-y-4 border-r-2 border-border pr-5">
                      {timeline.map((event, idx) => {
                        const s = STATUS[event.status] || STATUS.pending;
                        const last = idx === timeline.length - 1;
                        return (
                          <li key={idx} className="relative">
                            <span className={cn("absolute -right-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2", last ? "border-primary bg-primary" : "border-border bg-card")} />
                            <p className={cn("text-sm font-bold", last ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.time)}</p>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="mb-2 text-sm font-black text-foreground">المنتجات</h4>
                    <ul className="divide-y divide-border rounded-2xl border border-border">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">{item.name}{item.size ? ` (${item.size})` : ""}</p>
                            <p className="font-mono text-xs text-muted-foreground">{item.quantity} × {formatPrice(item.price)}</p>
                          </div>
                          <p className="shrink-0 font-mono text-sm font-bold text-foreground">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-1.5 px-1 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>المنتجات</span><span className="font-mono">{formatPrice(itemsTotal)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>التوصيل</span><span className="font-mono">{delivery > 0 ? formatPrice(delivery) : "مجاني"}</span></div>
                      <div className="flex justify-between border-t border-border pt-2 text-base font-black text-foreground"><span>الإجمالي</span><span className="font-mono text-primary">{formatPrice(selectedOrder.total)}</span></div>
                    </div>
                  </div>

                  {/* Delivery & payment */}
                  <div className="space-y-2 rounded-2xl bg-muted/60 p-4 text-sm">
                    <p className="flex items-start gap-2 text-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{selectedOrder.address || "—"}</p>
                    {selectedOrder.phone && <p className="flex items-center gap-2 text-foreground"><Phone className="h-4 w-4 shrink-0 text-primary" /><span dir="ltr">{selectedOrder.phone}</span></p>}
                    <p className="flex items-center gap-2 text-foreground"><Wallet className="h-4 w-4 shrink-0 text-primary" />{selectedOrder.paymentMethod === "bank" ? "تحويل بنكي" : "الدفع عند الاستلام"}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="h-11 flex-1 rounded-xl gap-1.5" disabled={reorderingId === selectedOrder.id} onClick={() => reorder(selectedOrder)}>
                      <RotateCcw className="h-4 w-4" /> اطلبه مجدداً
                    </Button>
                    <Button className="h-11 flex-1 rounded-xl" onClick={() => setSelectedOrder(null)}>تم</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ---------- Cancel confirmation ---------- */}
      <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <AlertDialogContent className="rounded-3xl text-right">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>إلغاء الطلب {orderToCancel ? `#${orderNumber(orderToCancel)}` : ""}؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم إلغاء الطلب ولن يتم تجهيزه. يمكنك طلب المنتجات مرة أخرى في أي وقت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => orderToCancel && cancelOrderMutation.mutate(orderToCancel.id)}
            >
              نعم، ألغِ الطلب
            </AlertDialogAction>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
