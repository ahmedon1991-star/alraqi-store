import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  Clock3,
  CreditCard,
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
  FileText,
  Upload,
  Eye,
  Users as UsersIcon,
  Landmark,
  Mail,
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
    items: string | null;
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
    sizes: string | null;
    measurements: string | null;
  }>;
  topCategories: Array<{
    id: string;
    name: string;
    icon: string | null;
    productCount: number;
  }>;
};

type Bank = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

type Customer = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  lastActive: string;
  authProvider: string;
};

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
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
  sizes: string;
  measurements: string;
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
  sizes: "",
  measurements: "",
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

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "product" | "category") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-token": localStorage.getItem("admin_token") || "",
        },
        body: formData,
      });

      if (!response.ok) throw new Error("فشل رفع الصورة");
      
      const data = await response.json();
      if (target === "product") {
        setForm(prev => ({ ...prev, image: data.url }));
      } else {
        // Handle category icon upload if needed, here we'll just return the URL
        return data.url;
      }
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ في الرفع", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

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

  const banksQuery = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
    queryFn: () => apiRequest("/api/banks"),
    enabled: authQuery.isSuccess,
  });

  const customersQuery = useQuery<Customer[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("/api/admin/users"),
    enabled: authQuery.isSuccess,
  });

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["/api/admin/messages"],
    queryFn: () => apiRequest("/api/admin/messages"),
    enabled: authQuery.isSuccess,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/messages/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
    },
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

  const createBankMutation = useMutation({
    mutationFn: (bankData: Partial<Bank>) =>
      apiRequest("/api/admin/banks", {
        method: "POST",
        body: JSON.stringify(bankData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
      toast({ title: "تم إضافة البنك بنجاح" });
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/banks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
      toast({ title: "تم حذف البنك" });
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
          sizes: form.sizes,
          measurements: form.measurements,
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

  const getCategoryName = (id: string) => {
    return data?.topCategories.find((c) => c.id === id)?.name || id;
  };

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
        getCategoryName(product.category).toLowerCase().includes(productSearch.toLowerCase())
      );
    });
  }, [data?.products, data?.topCategories, productSearch]);

  function openCreateDialog() {
    setForm(initialForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(product: any) {
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
      sizes: product.sizes || "",
      measurements: product.measurements || "",
    });
    setIsDialogOpen(true);
  }

  if (authQuery.isLoading || overviewQuery.isLoading || settingsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <img src="/logo.png" alt="الراقي" className="h-24 w-auto animate-pulse object-contain" />
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg font-bold text-muted-foreground">جاري تحميل لوحة التحكم...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (authQuery.isError) {
    return null; // The useEffect will handle redirect
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-center p-20">
        <Navbar />
        <h2 className="text-2xl font-bold text-rose-600">تعذر تحميل البيانات</h2>
        <p className="mt-4">يرجى التحقق من اتصال قاعدة البيانات أو إعادة تسجيل الدخول.</p>
        <Button className="mt-6 mx-auto w-fit" onClick={() => (window.location.href = "/admin-login")}>
          العودة للتسجيل
        </Button>
        <Footer />
      </div>
    );
  }

  const summaryCards = [
    {
      title: "إجمالي المبيعات",
      value: formatPrice(data?.stats?.revenue || 0),
      icon: CreditCard,
      tone: "from-orange-500/15 to-orange-500/5 text-orange-700",
    },
    {
      title: "الطلبات",
      value: (data?.stats?.orders ?? 0).toLocaleString("ar-EG"),
      icon: ShoppingBag,
      tone: "from-teal-500/15 to-teal-500/5 text-teal-700",
    },
    {
      title: "طلبات معلقة",
      value: (data?.stats?.pendingOrders ?? 0).toLocaleString("ar-EG"),
      icon: Clock3,
      tone: "from-amber-500/15 to-amber-500/5 text-amber-700",
    },
    {
      title: "المنتجات",
      value: (data?.stats?.products ?? 0).toLocaleString("ar-EG"),
      icon: Package,
      tone: "from-sky-500/15 to-sky-500/5 text-sky-700",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,244,238,1))]">
      {/* Branded Background Background */}
      <div className="absolute inset-0 -z-10">
        <img src="/images/hero-main.png" alt="الخلفية" className="w-full h-full object-cover opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-white" />
      </div>

      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-6 md:py-10 relative z-10">
        <section className="mb-6 md:mb-10 overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border border-white/60 bg-white/40 p-4 md:p-8 shadow-[0_20px_80px_rgba(69,44,16,0.06)] backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl flex flex-col md:flex-row items-center md:items-start text-center md:text-right gap-4 md:gap-6">
              <img src="/logo.png" alt="الراقي" className="h-20 md:h-24 w-auto object-contain drop-shadow-md" />
              <div>
                <div className="mb-2 md:mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-bold text-primary">
                  <Sparkles className="h-4 w-4" />
                  لوحة تحكم الإدارة
                </div>
                <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground md:text-5xl leading-tight">
                  إدارة المتجر من شاشة واحدة
                </h1>
                <p className="text-sm md:text-lg leading-relaxed text-muted-foreground">
                  دخول محمي، متابعة الطلبات، وتحرير المنتجات مباشرة من لوحة تشغيل مصممة للاستخدام اليومي.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <div className="grid grid-cols-2 gap-3 md:gap-4 rounded-2xl md:rounded-3xl border border-border/60 bg-background/80 p-4 md:p-5">
                <div className="text-center md:text-right">
                  <p className="text-xs md:text-sm text-muted-foreground">التصنيفات</p>
                  <p className="mt-1 text-lg md:text-2xl font-black">{(data?.stats?.categories ?? 0).toLocaleString("ar-EG")}</p>
                </div>
                <div className="text-center md:text-right border-r md:border-r-0 border-border/40">
                  <p className="text-xs md:text-sm text-muted-foreground">نسبة المعلق</p>
                  <p className="mt-1 text-lg md:text-2xl font-black">
                    {data.stats.orders === 0 ? "0%" : `${Math.round((data.stats.pendingOrders / data.stats.orders) * 100)}%`}
                  </p>
                </div>
              </div>

              <div className="flex flex-row gap-2 md:gap-3 w-full sm:w-auto">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreateDialog} className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-4 md:px-6 text-sm md:text-base font-bold shadow-lg shadow-primary/20">
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
                      <div className="flex gap-2 md:col-span-2">
                        <Input
                          placeholder="رابط الصورة"
                          value={form.image}
                          onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                          className="text-right flex-1"
                        />
                        <div className="relative">
                          <Button variant="outline" className="gap-2" disabled={isUploading}>
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            رفع صوره
                          </Button>
                          <input
                            type="file"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            onChange={(e) => handleImageUpload(e, "product")}
                            accept="image/*"
                          />
                        </div>
                      </div>
                      <Input
                        placeholder="الأحجام المتوفرة (مثال: S, M, L)"
                        value={form.sizes}
                        onChange={(e) => setForm((prev) => ({ ...prev, sizes: e.target.value }))}
                        className="text-right"
                      />
                      <Input
                        placeholder="المقاسات / الأوزان (مثال: 1كجم، 50سم)"
                        value={form.measurements}
                        onChange={(e) => setForm((prev) => ({ ...prev, measurements: e.target.value }))}
                        className="text-right"
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

                <Button variant="outline" className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-4 md:px-6 font-bold text-sm md:text-base" onClick={() => logoutMutation.mutate()}>
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="w-full space-y-6 md:space-y-8">
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0">
            <TabsList className="flex items-center w-max min-w-full md:grid md:grid-cols-7 h-auto p-1 bg-white/60 backdrop-blur-md rounded-2xl gap-1 border border-white/40 shadow-sm">
              <TabsTrigger value="overview" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">الرئيسية</TabsTrigger>
              <TabsTrigger value="customers" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">العملاء</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">الأقسام</TabsTrigger>
              <TabsTrigger value="messages" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px] flex items-center justify-center gap-2">
                الرسائل
                {messagesQuery.data?.some(m => !m.isRead) && (
                  <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-green-500 animate-pulse border-2 border-white shadow-sm shrink-0" />
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[100px] md:min-w-[110px]">طرق الدفع</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[100px] md:min-w-[110px]">الإعدادات</TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">الأمان</TabsTrigger>
            </TabsList>
          </div>

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
                    <TableHead className="text-right">التفاصيل</TableHead>
                    <TableHead className="text-right">تعديل الحالة</TableHead>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-primary hover:bg-primary/5"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          عرض المحتوى
                        </Button>
                      </TableCell>
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
                        {(category.productCount ?? 0).toLocaleString("ar-EG")}
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
                        <p className="text-sm text-muted-foreground">{getCategoryName(product.category)}</p>
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

        <TabsContent value="customers" className="space-y-8">
          <Card className="border-white/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                قائمة العملاء
              </CardTitle>
              <CardDescription>عرض كافة العملاء المسجلين وتاريخ انضمامهم ونشاطهم.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التواصل</TableHead>
                    <TableHead className="text-right">تاريخ الانضمام</TableHead>
                    <TableHead className="text-right">آخر نشاط</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersQuery.data?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-bold">{customer.name || customer.username}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {customer.email && <p>{customer.email}</p>}
                          {customer.phone && <p>{customer.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatAdminDate(customer.createdAt)}</TableCell>
                      <TableCell className="text-xs">{formatAdminDate(customer.lastActive)}</TableCell>
                      <TableCell>
                        {customer.lastActive && new Date().getTime() - new Date(customer.lastActive).getTime() < 10 * 60 * 1000 ? (
                          <Badge className="bg-emerald-500">نشط الآن</Badge>
                        ) : (
                          <Badge variant="outline">غير متصل</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customersQuery.data || customersQuery.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        لا يوجد عملاء مسجلون حالياً
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-white/60 bg-white/90 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  إدارة الحسابات البنكية
                </CardTitle>
                <CardDescription>أضف الحسابات التي يمكن للعملاء التحويل إليها.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createBankMutation.mutate({
                      bankName: formData.get("bankName") as string,
                      accountName: formData.get("accountName") as string,
                      accountNumber: formData.get("accountNumber") as string,
                    });
                    (e.target as HTMLFormElement).reset();
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">اسم البنك</label>
                    <Input name="bankName" placeholder="مثال: بنك الخرطوم" required className="text-right" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">اسم صاحب الحساب</label>
                    <Input name="accountName" placeholder="الاسم الكامل" required className="text-right" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block text-right">رقم الحساب</label>
                    <Input name="accountNumber" placeholder="رقم الحساب أو IBAN" required className="text-right" />
                  </div>
                  <Button type="submit" className="w-full" disabled={createBankMutation.isPending}>
                    {createBankMutation.isPending ? "جارٍ الإضافة..." : "إضافة حساب جديد"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/90 shadow-xl">
              <CardHeader>
                <CardTitle>الحسابات المضافة</CardTitle>
                <CardDescription>قائمة الحسابات البنكية المتاحة للعملاء.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {banksQuery.data?.map((bank) => (
                    <div key={bank.id} className="flex items-center justify-between rounded-xl border p-4">
                      <div className="text-right">
                        <p className="font-bold">{bank.bankName}</p>
                        <p className="text-sm text-muted-foreground">{bank.accountName}</p>
                        <p className="font-mono text-sm">{bank.accountNumber}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteBankMutation.mutate(bank.id)}
                        disabled={deleteBankMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!banksQuery.data || banksQuery.data.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                      لا يوجد حسابات مضافة
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-8">
          <Card className="border-white/60 bg-white/90 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                رسائل العملاء وخدمة العملاء
              </CardTitle>
              <CardDescription>هنا تظهر كافة الاستفسارات والرسائل المرسلة من الموقع.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right">حالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">التواصل</TableHead>
                    <TableHead className="text-right">الرسالة</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messagesQuery.data?.map((msg) => (
                    <TableRow key={msg.id} className={msg.isRead ? "opacity-70" : "bg-green-50/30"}>
                      <TableCell className="text-right">
                        {!msg.isRead ? (
                          <Badge className="bg-green-500 hover:bg-green-600">جديد</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">مقروء</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {new Date(msg.createdAt).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-right font-bold">{msg.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col text-xs">
                          <span>{msg.email}</span>
                          <span className="text-muted-foreground">{msg.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right max-w-xs truncate">
                        {msg.message}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => !msg.isRead && markReadMutation.mutate(msg.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>رسالة من: {msg.name}</DialogTitle>
                                <DialogDescription>بتاريخ: {new Date(msg.createdAt).toLocaleString("ar-EG")}</DialogDescription>
                              </DialogHeader>
                              <div className="mt-4 space-y-4">
                                <div className="rounded-xl bg-muted p-4 text-right whitespace-pre-wrap leading-relaxed">
                                  {msg.message}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">البريد</p>
                                    <p className="font-medium text-sm">{msg.email}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">الجوال</p>
                                    <p className="font-medium text-sm">{msg.phone || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!messagesQuery.data || messagesQuery.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                        لا توجد رسائل حالياً
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                    <label className="text-sm font-bold block text-right">رمز القسم أو صوره</label>
                    <div className="flex gap-2">
                      <Input name="icon" id="cat-icon-input" placeholder="Sparkles أو رابط صوره" className="text-right flex-1" dir="ltr" />
                      <div className="relative">
                        <Button type="button" variant="outline" size="icon" disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                        <input
                          type="file"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          onChange={async (e) => {
                            const url = await handleImageUpload(e, "category");
                            if (url) {
                              const input = document.getElementById('cat-icon-input') as HTMLInputElement;
                              if (input) input.value = url;
                            }
                          }}
                          accept="image/*"
                        />
                      </div>
                    </div>
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

      {/* Detailed Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 justify-end">
              <FileText className="h-5 w-5 text-primary" />
              تفاصيل الطلب: {selectedOrder?.name}
            </DialogTitle>
            <DialogDescription className="text-right">
              رقم الطلب: {selectedOrder?.id?.split('-')[0]} - بتاريخ {formatAdminDate(selectedOrder?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto max-h-[60vh] py-4 px-2 scrollbar-thin scrollbar-thumb-primary/20">
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">بيانات العميل</p>
                <p className="font-bold">{selectedOrder?.name}</p>
                <p className="text-sm">{selectedOrder?.phone}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">مكان التوصيل</p>
                <p className="text-sm leading-relaxed">{selectedOrder?.address}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead className="text-right font-bold">المنتج</TableHead>
                    <TableHead className="text-center font-bold">الكمية</TableHead>
                    <TableHead className="text-left font-bold">السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    try {
                      const items = JSON.parse(selectedOrder?.items || '[]');
                      if (!items || items.length === 0) return <TableRow><TableCell colSpan={3} className="text-center py-4">لا يوجد تفاصيل للمنتجات</TableCell></TableRow>;
                      return items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="text-right">
                            <span className="font-medium text-foreground">{item.name}</span>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-left font-bold">{formatPrice(item.price)}</TableCell>
                        </TableRow>
                      ));
                    } catch (e) {
                      return <TableRow><TableCell colSpan={3} className="text-center py-4">خطأ في قراءة بيانات المنتجات</TableCell></TableRow>;
                    }
                  })()}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-primary/5 p-4 text-right">
              <div className="space-y-1 mb-4 border-b pb-4">
                <p className="text-sm font-bold">طريقة الدفع:</p>
                <p className="text-primary font-black">
                  {selectedOrder?.paymentMethod === "bank" ? "تحويل بنكي" : "الدفع عند الاستلام"}
                </p>
                {selectedOrder?.paymentMethod === "bank" && selectedOrder?.bankId && (
                  <p className="text-xs text-muted-foreground italic">تم اختيار التحويل البنكي</p>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black text-primary">{formatPrice(selectedOrder?.total)}</span>
                <span className="text-muted-foreground font-bold">إجمالي الفاتورة:</span>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button onClick={() => setIsOrderDialogOpen(false)} className="w-full h-12 text-lg font-bold">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
