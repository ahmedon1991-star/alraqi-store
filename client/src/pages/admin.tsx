import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  Clock3,
  CreditCard,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Layers,
  Loader2,
  Package,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, clearAdminToken } from "@/lib/api";
import { formatCategoryLabel, formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminOverview = {
  stats: {
    products: number;
    categories: number;
    orders: number;
    pendingOrders: number;
    revenue: number;
  };
  orders: Array<{
    id: string;
    name: string | null;
    total: number;
    status: string;
    createdAt: string | null;
    phone: string | null;
    address: string | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    nameEn: string | null;
    category: string;
    price: number;
    inStock: boolean | null;
    badge: string | null;
    image: string | null;
    description: string | null;
  }>;
  topCategories: Array<{
    id: string;
    name: string;
    icon: string | null;
    productCount: number;
  }>;
};

type ProductFormState = {
  id?: string;
  name: string;
  nameEn: string;
  category: string;
  price: string;
  image: string;
  badge: string;
  description: string;
  inStock: boolean;
};

const initialForm: ProductFormState = {
  name: "",
  nameEn: "",
  category: "",
  price: "",
  image: "",
  badge: "",
  description: "",
  inStock: true,
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

function formatAdminDate(value: string | null) {
  if (!value) {
    return "غير متوفر";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const authQuery = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: () => apiRequest("/api/admin/me"),
    retry: false,
  });

  const overviewQuery = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: () => apiRequest("/api/admin/overview"),
    enabled: authQuery.isSuccess,
  });

  const settingsQuery = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("/api/admin/settings"),
    enabled: authQuery.isSuccess,
  });

  const categoriesQuery = useQuery<Array<{ id: string; name: string; icon: string | null }>>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settingsData: { 
      email: string; 
      phone: string;
      address?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
    }) =>
      apiRequest("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(settingsData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تحديث إعدادات الإدارة بنجاح.",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (categoryData: { id: string; name: string; icon?: string }) =>
      apiRequest("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify(categoryData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "تمت إضافة القسم",
        description: "أصبح القسم الجديد متاحاً الآن.",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "تم حذف القسم",
        description: "تمت إزالة القسم بنجاح.",
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (securityData: { username?: string; password?: string; currentPassword?: string }) =>
      apiRequest("/api/admin/security", {
        method: "POST",
        body: JSON.stringify(securityData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "تم تحديث بيانات الأمان",
        description: "تمت العملية بنجاح. يرجى استخدام البيانات الجديدة في المرة القادمة.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (authQuery.error) {
      clearAdminToken();
      setLocation("/admin-login");
    }
  }, [authQuery.error, setLocation]);

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiRequest(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "تم تحديث الطلب",
        description: "تم حفظ حالة الطلب الجديدة.",
      });
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: () =>
      apiRequest(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          nameEn: form.nameEn,
          category: form.category,
          price: Number(form.price),
          image: form.image,
          badge: form.badge,
          description: form.description,
          inStock: form.inStock,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setIsDialogOpen(false);
      setForm(initialForm);
      toast({
        title: form.id ? "تم تحديث المنتج" : "تمت إضافة المنتج",
        description: form.id ? "تم حفظ التعديلات بنجاح." : "أصبح المنتج متاحًا داخل المتجر.",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest(`/api/admin/products/${productId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "تم حذف المنتج",
        description: "أزيل المنتج من لوحة الإدارة والمتجر.",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      clearAdminToken();
      setLocation("/admin-login");
    },
  });

  const data = overviewQuery.data;

  const filteredOrders = useMemo(() => {
    const orders = data?.orders || [];
    return orders.filter((order) => {
      const matchesSearch =
        !orderSearch ||
        order.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.phone?.includes(orderSearch) ||
        order.address?.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.orders, orderSearch, statusFilter]);

  const filteredProducts = useMemo(() => {
    const products = data?.products || [];
    return products.filter((product) => {
      if (!productSearch) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.nameEn?.toLowerCase().includes(productSearch.toLowerCase()) ||
        formatCategoryLabel(product.category).toLowerCase().includes(productSearch.toLowerCase())
      );
    });
  }, [data?.products, productSearch]);

  function openCreateDialog() {
    setForm(initialForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(product: AdminOverview["products"][number]) {
    setForm({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn || "",
      category: product.category,
      price: String(product.price),
      image: product.image || "",
      badge: product.badge || "",
      description: product.description || "",
      inStock: Boolean(product.inStock),
    });
    setIsDialogOpen(true);
  }

  if (authQuery.isLoading || overviewQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summaryCards = [
    {
      title: "إجمالي المبيعات",
      value: formatPrice(data.stats.revenue),
      icon: CreditCard,
      tone: "from-orange-500/15 to-orange-500/5 text-orange-700",
    },
    {
      title: "الطلبات",
      value: data.stats.orders.toLocaleString("ar-EG"),
      icon: ShoppingBag,
      tone: "from-teal-500/15 to-teal-500/5 text-teal-700",
    },
    {
      title: "طلبات معلقة",
      value: data.stats.pendingOrders.toLocaleString("ar-EG"),
      icon: Clock3,
      tone: "from-amber-500/15 to-amber-500/5 text-amber-700",
    },
    {
      title: "المنتجات",
      value: data.stats.products.toLocaleString("ar-EG"),
      icon: Package,
      tone: "from-sky-500/15 to-sky-500/5 text-sky-700",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,139,130,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,244,238,0.96))]">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-10">
        <section className="mb-10 overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(69,44,16,0.08)] backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                لوحة تحكم الإدارة
              </div>
              <h1 className="mb-3 text-4xl font-black tracking-tight text-foreground md:text-5xl">
                إدارة المتجر من شاشة واحدة
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                دخول محمي، متابعة الطلبات، وتحرير المنتجات مباشرة من لوحة تشغيل مصممة للاستخدام اليومي.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <div className="grid min-w-[280px] grid-cols-2 gap-4 rounded-3xl border border-border/60 bg-background/80 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">التصنيفات</p>
                  <p className="mt-1 text-2xl font-black">{data.stats.categories.toLocaleString("ar-EG")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نسبة المعلق</p>
                  <p className="mt-1 text-2xl font-black">
                    {data.stats.orders === 0 ? "0%" : `${Math.round((data.stats.pendingOrders / data.stats.orders) * 100)}%`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateDialog} className="h-12 rounded-full px-6 text-base font-bold shadow-lg shadow-primary/20">
                      <PlusCircle className="h-4 w-4" />
                      إضافة منتج
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader className="text-right sm:text-right">
                      <DialogTitle>{form.id ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
                      <DialogDescription>
                        {form.id ? "عدّل تفاصيل المنتج ثم احفظ التغييرات." : "أضف منتجًا جديدًا ليظهر داخل المتجر ولوحة الإدارة."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input
                        placeholder="اسم المنتج"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="text-right"
                      />
                      <Input
                        placeholder="الاسم بالإنجليزية"
                        value={form.nameEn}
                        onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                        className="text-right"
                      />
                      <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.topCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="السعر"
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                        className="text-right"
                      />
                      <Input
                        placeholder="رابط الصورة"
                        value={form.image}
                        onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                        className="text-right md:col-span-2"
                      />
                      <Input
                        placeholder="شارة المنتج"
                        value={form.badge}
                        onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                        className="text-right md:col-span-2"
                      />
                      <Textarea
                        placeholder="وصف المنتج"
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="min-h-32 text-right md:col-span-2"
                      />
                      <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 md:col-span-2">
                        <div className="text-right">
                          <p className="font-bold text-foreground">التوفر في المخزون</p>
                          <p className="text-sm text-muted-foreground">تحكم سريع في حالة توفر المنتج.</p>
                        </div>
                        <Switch checked={form.inStock} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, inStock: checked }))} />
                      </div>
                    </div>

                    <DialogFooter className="sm:justify-start sm:space-x-reverse">
                      <Button
                        onClick={() => saveProductMutation.mutate()}
                        disabled={saveProductMutation.isPending || !form.name || !form.category || !form.price}
                        className="min-w-32"
                      >
                        {saveProductMutation.isPending ? "جارٍ الحفظ..." : form.id ? "حفظ التعديل" : "حفظ المنتج"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        إلغاء
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="h-12 rounded-full px-6 font-bold" onClick={() => logoutMutation.mutate()}>
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="w-full space-y-8">
          <TabsList className="grid w-full grid-cols-4 rounded-xl h-14 bg-white/60 p-1 mb-8">
            <TabsTrigger value="overview" className="rounded-lg text-lg font-bold">الرئيسية</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg text-lg font-bold">الأقسام</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-lg font-bold">الإعدادات</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg text-lg font-bold">الأمان</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
                <CardContent className="p-0">
                  <div className={`rounded-xl bg-gradient-to-br p-6 ${item.tone}`}>
                    <div className="mb-8 flex items-center justify-between">
                      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <BarChart3 className="h-5 w-5 opacity-40" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">{item.title}</p>
                    <p className="text-3xl font-black tracking-tight text-foreground">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>إدارة الطلبات</CardTitle>
                  <CardDescription>بحث وفلاتر سريعة مع تحديث الحالة من الجدول.</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="ابحث بالعميل أو الهاتف"
                      className="w-64 pr-9 text-right"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44 text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">القيمة</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-right">
                        <div className="font-semibold text-foreground">{order.name || "بدون اسم"}</div>
                        <div className="text-xs text-muted-foreground">{order.phone || "لا يوجد هاتف"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[order.status] || "border-slate-200 bg-slate-100 text-slate-700"}`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatPrice(order.total)}</TableCell>
                      <TableCell className="max-w-40 text-right text-sm text-muted-foreground">{order.address || "غير متوفر"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatAdminDate(order.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Select value={order.status} onValueChange={(value) => updateOrderMutation.mutate({ orderId: order.id, status: value })}>
                          <SelectTrigger className="w-36 text-right">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  توزيع التصنيفات
                </CardTitle>
                <CardDescription>عدد المنتجات داخل كل قسم</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.topCategories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl">
                          {category.icon || "•"}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.id}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {category.productCount.toLocaleString("ar-EG")}
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${data.stats.products === 0 ? 0 : Math.max((category.productCount / data.stats.products) * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div>
                    <CardTitle>إدارة المنتجات</CardTitle>
                    <CardDescription>بحث سريع مع تعديل أو حذف مباشر.</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="ابحث باسم المنتج أو القسم"
                      className="pr-9 text-right"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCategoryLabel(product.category)}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{formatPrice(product.price)}</p>
                      </div>
                      <Badge variant={product.inStock ? "secondary" : "outline"} className="rounded-full">
                        {product.inStock ? "متوفر" : "غير متوفر"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => deleteProductMutation.mutate(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
        </TabsContent>

          <TabsContent value="settings" className="space-y-8">
            <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)] max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>إعدادات الحساب والإشعارات</CardTitle>
                <CardDescription>
                  يمكنك تعديل إيميل الدخول ورقم الواتساب الذي ستصلك عليه الإشعارات عند وجود طلبات جديدة.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateSettingsMutation.mutate({
                      email: formData.get("email") as string,
                      phone: formData.get("phone") as string,
                      address: formData.get("address") as string,
                      facebook: formData.get("facebook") as string,
                      instagram: formData.get("instagram") as string,
                      twitter: formData.get("twitter") as string,
                    });
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">البريد الإلكتروني للإشعارات</label>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={settingsQuery.data?.email || "admin@example.com"}
                      required
                      className="text-right"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">رقم الواتساب (لإشعارات الطلبات المكتملة)</label>
                    <Input
                      name="phone"
                      type="tel"
                      defaultValue={settingsQuery.data?.phone || "249912345678"}
                      required
                      className="text-right"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      يُفضل كتابة الرقم بصيغة كود الدولة (مثال: 249 أو 20).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">عنوان المتجر</label>
                    <Input
                      name="address"
                      defaultValue={settingsQuery.data?.address || "الخرطوم، السودان - شارع النيل"}
                      required
                      className="text-right"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">فيسبوك</label>
                      <Input
                        name="facebook"
                        defaultValue={settingsQuery.data?.facebook || "https://facebook.com"}
                        className="text-right"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">انستقرام</label>
                      <Input
                        name="instagram"
                        defaultValue={settingsQuery.data?.instagram || "https://instagram.com"}
                        className="text-right"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">تويتر / X</label>
                      <Input
                        name="twitter"
                        defaultValue={settingsQuery.data?.twitter || "https://twitter.com"}
                        className="text-right"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full text-lg font-bold h-12"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  إدارة الأقسام
                </CardTitle>
                <CardDescription>أضف أقساماً جديدة للمنتجات لتسهيل تصفح المتجر.</CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end mb-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createCategoryMutation.mutate({
                      id: formData.get("id") as string,
                      name: formData.get("name") as string,
                      icon: (formData.get("icon") as string) || undefined,
                    });
                    e.currentTarget.reset();
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">معرف القسم (إنجليزي)</label>
                    <Input name="id" placeholder="honey-products" required className="text-right" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">اسم القسم بالعربي</label>
                    <Input name="name" placeholder="عسل ومنتجاته" required className="text-right" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">رمز القسم (Icon)</label>
                    <Input name="icon" placeholder="Sparkles" className="text-right" dir="ltr" />
                  </div>
                  <Button type="submit" className="h-11 font-bold" disabled={createCategoryMutation.isPending}>
                    {createCategoryMutation.isPending ? "جارٍ الإضافة..." : "إضافة القسم"}
                  </Button>
                </form>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoriesQuery.data?.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-bold">{category.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{category.id}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا القسم؟")) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {categoriesQuery.isLoading && <div className="col-span-full py-8 text-center text-muted-foreground">جارٍ تحميل الأقسام...</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-8">
            <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)] max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <CardTitle>تعديل بيانات الدخول والأمان</CardTitle>
                <CardDescription>
                  تغيير اسم المستخدم أو كلمة المرور الخاصة بلوحة الإدارة. 
                  <span className="block mt-1 font-bold text-rose-600">تنبيه: ستحتاج لتسجيل الدخول بالبيانات الجديدة فوراً.</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newPass = formData.get("new_password") as string;
                    const confirmPass = formData.get("confirm_password") as string;

                    if (newPass && newPass !== confirmPass) {
                      toast({
                        title: "خطأ في التأكيد",
                        description: "كلمتا المرور الجديدتان غير متطابقتين.",
                        variant: "destructive",
                      });
                      return;
                    }

                    updateSecurityMutation.mutate({
                      username: (formData.get("username") as string) || undefined,
                      password: newPass || undefined,
                      currentPassword: formData.get("current_password") as string,
                    });
                    
                    e.currentTarget.reset();
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">اسم المستخدم الجديد</label>
                    <Input
                      name="username"
                      placeholder={settingsQuery.data?.username || "admin"}
                      className="text-right"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">كلمة المرور الجديدة</label>
                      <Input
                        name="new_password"
                        type="password"
                        placeholder="••••••••"
                        className="text-right"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">تأكيد كلمة المرور</label>
                      <Input
                        name="confirm_password"
                        type="password"
                        placeholder="••••••••"
                        className="text-right"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="border-t border-dashed pt-4">
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="text-sm font-black block text-right text-primary">كلمة المرور الحالية (مطلوب للتأكيد)</label>
                      <Input
                        name="current_password"
                        type="password"
                        required
                        className="text-right border-primary/30"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-base font-black h-12 shadow-lg shadow-primary/20"
                    disabled={updateSecurityMutation.isPending}
                  >
                    {updateSecurityMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ التحديث المشفر...
                      </div>
                    ) : "تحديث بيانات الأمان والقفل"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
