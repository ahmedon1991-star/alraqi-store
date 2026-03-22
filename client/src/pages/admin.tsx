import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Users as UsersIcon,
  Landmark,
  Mail,
  Trash2,
  ShieldCheck,
  Loader2,
  FileText,
  CreditCard,
  ShoppingBag,
  Clock3,
  Package,
  Sparkles,
  PlusCircle,
  Upload,
  GripVertical,
  Pencil,
  Search,
  Eye,
  Layers,
  Boxes,
  ListOrdered,
  Phone,
  Truck,
  Volume2,
} from "lucide-react";
import { Reorder } from "framer-motion";
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
import { apiRequest, clearAdminToken, getAdminToken } from "@/lib/api";
import { cn, formatCategoryLabel, formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminOverview = {
  stats: {
    products: number;
    categories: number;
    orders: number;
    pendingOrders: number;
    messages: number;
    unreadMessages: number;
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
    isArchived: boolean | null;
    updatedAt: string | null;
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
    stock: number;
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
  stock: string;
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
  stock: "0",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "جارٍ التجهيز",
  completed: "تم التوصيل",
  cancelled: "ملغي",
};

const statusClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
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
  const [messageFilter, setMessageFilter] = useState("active");
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
          "x-admin-token": getAdminToken() || "",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "فشل رفع الصورة");
      }
      
      const data = await response.json();
      if (target === "product") {
        setForm(prev => ({ ...prev, image: data.url }));
      } else {
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
    refetchInterval: 10000, // 10 seconds polling for new orders/messages
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

  const archiveMessageMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/messages/${id}/archive`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "تم أرشفة الرسالة" });
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
      shippingFee?: number;
      freeShippingThreshold?: number;
      announcementText?: string;
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

  const prevOrdersCountRef = useRef<number | null>(null);
  const prevMessagesCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initial audio setup
    try {
      audioRef.current = new Audio('/notification.wav');
      audioRef.current.preload = 'auto';
    } catch (err) {
      console.error("Audio init failed:", err);
    }
  }, []);

  const playNotification = useCallback((isTest = false) => {
    // Create new audio instance on user gesture for better mobile support
    try {
      const audio = new Audio('/notification.wav');
      audio.volume = 1.0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Success! Store this for future use if needed, but gestured play is best
            audioRef.current = audio;
            if (isTest) {
              toast({
                title: "🔊 النظام يعمل",
                description: "تم تفعيل التنبيهات الصوتية بنجاح على هذا الجهاز.",
              });
            }
          })
          .catch(e => {
            console.error("Audio play failed logic:", e);
            if (isTest) {
              toast({
                title: "🔇 التنبيهات معطلة",
                description: "المتصفح يمنع تشغيل الصوت. برجاء النقر على \"السماح بالصوت\" في إعدادات المتصفح أو المحاولة مرة أخرى.",
                variant: "destructive",
              });
            }
          });
      }
    } catch (err) {
      console.error("Audio instance error:", err);
    }
  }, [toast]);

  useEffect(() => {
    const stats = overviewQuery.data?.stats;
    if (!stats) return;

    const currentOrdersCount = stats.orders;
    const currentMessagesCount = stats.messages;

    // Handle NEW ORDERS
    if (prevOrdersCountRef.current !== null && currentOrdersCount > prevOrdersCountRef.current) {
      console.log("🔔 New order detected! Playing sound...");
      playNotification();
      toast({
        title: "🔔 طلب جديد وارد",
        description: `تم استلام طلب جديد رقم ${currentOrdersCount} من أحد العملاء.`,
        className: "bg-primary text-white font-bold",
      });
    }
    prevOrdersCountRef.current = currentOrdersCount;

    // Handle NEW MESSAGES
    if (prevMessagesCountRef.current !== null && currentMessagesCount > prevMessagesCountRef.current) {
      console.log("📩 New message detected! Playing sound...");
      playNotification();
      toast({
        title: "📩 رسالة جديدة واردة",
        description: "وصلتك مراجعة أو استفسار جديد من أحد العملاء، يرجى مراجعته.",
        className: "bg-blue-600 text-white font-bold",
      });
    }
    prevMessagesCountRef.current = currentMessagesCount;
    prevOrdersCountRef.current = currentOrdersCount;

  }, [overviewQuery.data?.stats, toast, playNotification]);

  // Persistent reminder for pending orders every 2 minutes
  useEffect(() => {
    const stats = overviewQuery.data?.stats;
    const hasPendingOrders = stats && stats.pendingOrders > 0;
    
    if (!hasPendingOrders) return;

    const intervalId = setInterval(() => {
      const currentStats = overviewQuery.data?.stats;
      if (currentStats && currentStats.pendingOrders > 0) {
        console.log("⏰ Pending order reminder! Playing sound...");
        playNotification();
        toast({
          title: "⏰ تنبيه: طلبات معلقة",
          description: `تنبيه: يوجد عدد (${currentStats.pendingOrders}) طلبات معلقة لم يتم التعامل معها بعد.`,
          className: "bg-orange-600 text-white font-black border-2 border-white/20",
        });
      }
    }, 120000);

    return () => clearInterval(intervalId);
  }, [overviewQuery.data?.stats?.pendingOrders, playNotification, toast]);

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

  const archiveOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest(`/api/admin/orders/${orderId}/archive`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "تم أرشفة الطلب",
        description: "تم نقل الطلب إلى الأرشيف بنجاح.",
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
          stock: Number(form.stock) || 0,
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

  const [revenueFilter, setRevenueFilter] = useState<"today" | "week" | "month" | "all">("all");

  const revenueData = useMemo(() => {
    if (!data?.orders) return { total: 0, chartData: [] };
    
    const now = new Date();
    // Midnight of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Start of current week (assuming Sunday as first day, or 7 days ago if we want rolling week)
    // Rolling 7 days is usually more useful for graphs
    const past7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const filteredTotal = data.orders.reduce((acc, order) => {
      const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      const amount = Number(order.total) || 0;
      
      if (revenueFilter === "today" && orderTime >= startOfToday) return acc + amount;
      if (revenueFilter === "week" && orderTime >= past7Days) return acc + amount;
      if (revenueFilter === "month" && orderTime >= startOfMonth) return acc + amount;
      if (revenueFilter === "all") return acc + amount;
      
      return acc;
    }, 0);

    // Build chart data for the last 7 days regardless of filter
    const chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayTotal = data.orders.reduce((acc, order) => {
          const t = order.createdAt ? new Date(order.createdAt).getTime() : 0;
          if (t >= dayStart && t < dayEnd) return acc + (Number(order.total) || 0);
          return acc;
      }, 0);
      
      return { 
          label: d.toLocaleDateString('ar-EG', { weekday: 'long' }).substring(0, 3), 
          value: dayTotal 
      };
    });

    return { total: filteredTotal, chartData };
  }, [data?.orders, revenueFilter]);

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
        
      const timeReference = order.updatedAt || order.createdAt;
      const isOlderThan24h = timeReference ? new Date().getTime() - new Date(timeReference).getTime() > 24 * 60 * 60 * 1000 : false;
      const isArchived = order.isArchived || (order.status === "completed" && isOlderThan24h);

      if (statusFilter === "archived") {
        return matchesSearch && isArchived;
      }
      
      const matchesStatus = statusFilter === "all" ? true : order.status === statusFilter;
      return matchesSearch && matchesStatus && !isArchived;
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
      stock: String(product.stock || 0),
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

  if (overviewQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-center p-20 gap-8">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-[2rem] shadow-2xl max-w-lg w-full">
                <h2 className="text-3xl font-black text-rose-600 mb-4">تعذر تحميل البيانات</h2>
                <p className="text-rose-800/80 font-medium mb-6">
                    {(overviewQuery.error as any)?.message || "حدث خطأ غير متوقع أثناء الاتصال بسيرفر قاعدة البيانات."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                        size="lg"
                        className="rounded-2xl font-black px-8 bg-rose-600 hover:bg-rose-700" 
                        onClick={() => overviewQuery.refetch()}
                    >
                        إعادة المحاولة
                    </Button>
                    <Button 
                        size="lg"
                        variant="ghost" 
                        className="rounded-2xl font-bold" 
                        onClick={() => (window.location.href = "/admin-login")}
                    >
                        تسجيل الخروج
                    </Button>
                </div>
            </div>
        </div>
        <Footer />
      </div>
    );
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
                  <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-[1.5rem] md:rounded-[2rem] border-primary/10 shadow-2xl backdrop-blur-xl bg-white/95">
                    <div className="p-6 pb-2 border-b border-border/40 bg-white">
                      <DialogHeader className="text-right sm:text-right space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary w-fit">
                          <Package className="h-3.5 w-3.5" />
                          {form.id ? "تعديل بيانات المنتج" : "إضافة منتج للنظام"}
                        </div>
                        <DialogTitle className="text-xl md:text-2xl font-black text-foreground">
                          {form.id ? "تعديل المنتج" : "إضافة منتج جديد"}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                          {form.id ? "عدّل تفاصيل المنتج ثم احفظ التغييرات." : "أضف منتجًا جديدًا ليظهر داخل المتجر ولوحة الإدارة."}
                        </DialogDescription>
                      </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">اسم المنتج</label>
                          <Input
                            placeholder="مثال: عباية سودانية فاخرة"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200 focus:border-primary/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">الاسم بالإنجليزي</label>
                          <Input
                            placeholder="مثال: Sudanese Abaya"
                            value={form.nameEn}
                            onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200 focus:border-primary/30"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">القسم / التصنيف</label>
                          <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                            <SelectTrigger className="text-right h-11 rounded-xl border-gray-200">
                              <SelectValue placeholder="اختر القسم" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {data.topCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-right">
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">السعر (SDG)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={form.price}
                            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">الكمية المتوفرة (المخزون)</label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={form.stock}
                            onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200 focus:border-primary/50"
                          />
                        </div>
                        
                        <div className="md:col-span-2 space-y-3">
                          <label className="text-sm font-bold text-gray-700 block pr-1">صورة المنتج</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                              placeholder="رابط الصورة المباشر"
                              value={form.image}
                              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                              className="text-right h-11 rounded-xl border-gray-200 flex-1"
                              dir="ltr"
                            />
                            <div className="relative shrink-0">
                              <Button 
                                variant="outline" 
                                type="button" 
                                className={`h-11 px-6 gap-2 rounded-xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/30 transition-all ${isUploading ? 'opacity-70' : ''}`} 
                                disabled={isUploading}
                              >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {isUploading ? "جاري الرفع..." : "رفع صوره"}
                              </Button>
                              <input
                                type="file"
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => handleImageUpload(e, "product")}
                                accept="image/*"
                              />
                            </div>
                          </div>
                          {form.image && (
                            <div className="mt-2 relative group w-24 h-24 rounded-2xl overflow-hidden border border-border shadow-sm">
                              <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                              <Button 
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setForm(prev => ({ ...prev, image: "" }))}
                                type="button"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">الأحجام (اختياري)</label>
                          <Input
                            placeholder="مثال: S, M, L"
                            value={form.sizes}
                            onChange={(e) => setForm((prev) => ({ ...prev, sizes: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">المقاسات (اختياري)</label>
                          <Input
                            placeholder="مثال: 50سم X 50سم"
                            value={form.measurements}
                            onChange={(e) => setForm((prev) => ({ ...prev, measurements: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">شارة المنتج (اختياري)</label>
                          <Input
                            placeholder="مثال: خصم 20%، قطعة واحدة، الأكثر مبيعاً"
                            value={form.badge}
                            onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                            className="text-right h-11 rounded-xl border-gray-200"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-bold text-gray-700 block pr-1">وصف المنتج</label>
                          <Textarea
                            placeholder="اكتب تفاصيل المنتج المميزة لجذب المشترين..."
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="min-h-32 text-right rounded-2xl border-gray-200 focus:border-primary/30 py-3"
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-[1.25rem] border border-border/60 bg-primary/5 px-5 py-4 md:col-span-2 shadow-inner">
                          <div className="text-right">
                            <p className="font-black text-foreground">الحالة: متوفر بالمخزون</p>
                            <p className="text-sm text-muted-foreground">سيظهر المنتج للعملاء في المتجر إذا كان مفعلاً.</p>
                          </div>
                          <Switch checked={form.inStock} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, inStock: checked }))} />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-border/40 bg-gray-50/80 backdrop-blur-sm">
                      <DialogFooter className="flex flex-row-reverse sm:justify-start gap-3 w-full">
                        <Button
                          onClick={() => saveProductMutation.mutate()}
                          disabled={saveProductMutation.isPending || !form.name || !form.category || !form.price}
                          className="flex-1 sm:flex-none min-w-[140px] h-12 rounded-xl font-black text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {saveProductMutation.isPending ? (
                            <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ</>
                          ) : (
                            <><ShieldCheck className="ml-2 h-5 w-5" /> {form.id ? "حفظ التعديلات" : "إضافة المنتج الآن"}</>
                          )}
                        </Button>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none h-12 rounded-xl font-bold text-muted-foreground hover:bg-gray-200/50">
                          إلغاء
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-4 md:px-6 font-bold text-sm md:text-base gap-2 border-primary/30 text-primary hover:bg-primary/5" 
                  onClick={() => playNotification(true)}
                >
                  <Volume2 className="h-4 w-4" />
                  اختبار الصوت
                </Button>

                <Button variant="outline" className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-4 md:px-6 font-bold text-sm md:text-base border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => logoutMutation.mutate()}>
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="w-full space-y-6 md:space-y-8">
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0">
            <TabsList className="flex items-center w-max min-w-full md:grid md:grid-cols-9 h-auto p-1 bg-white/60 backdrop-blur-md rounded-2xl gap-1 border border-white/40 shadow-sm">
              <TabsTrigger value="overview" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">الرئيسية</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px] flex items-center justify-center gap-2">
                الطلبات
                {data?.stats?.pendingOrders > 0 && (
                  <span className="h-5 w-5 rounded-full bg-amber-500 text-[10px] flex items-center justify-center text-white border-2 border-white shadow-sm shrink-0">
                    {data.stats.pendingOrders > 9 ? '+9' : data.stats.pendingOrders}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-xl px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-lg font-bold min-w-[90px] md:min-w-[100px]">المنتجات</TabsTrigger>
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
            <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
              <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)] md:col-span-2 xl:col-span-2">
                <CardContent className="p-0 h-full">
                  <div className="rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 p-6 flex flex-col h-full">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/80 p-3 shadow-sm text-orange-700">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-gray-800">إجمالي المبيعات</p>
                      </div>
                      <div className="flex bg-white/60 rounded-lg p-1">
                        {[
                          { id: 'today', label: 'اليوم' },
                          { id: 'week', label: 'الأسبوع' },
                          { id: 'month', label: 'الشهر' },
                          { id: 'all', label: 'الكل' }
                        ].map((f) => (
                           <button 
                             key={f.id} 
                             onClick={() => setRevenueFilter(f.id as any)}
                             className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", revenueFilter === f.id ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                           >
                              {f.label}
                           </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-3xl md:text-4xl font-black tracking-tight text-orange-950 mb-6">{formatPrice(revenueData.total)}</p>
                    
                    <div className="mt-auto flex items-end justify-between gap-2 h-24 pt-4 border-t border-orange-500/10">
                      {revenueData.chartData.map((d, i) => {
                         const maxVal = Math.max(...revenueData.chartData.map(c => c.value), 1);
                         return (
                          <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                              <div className="w-full relative h-[60px] flex items-end justify-center rounded overflow-hidden bg-orange-500/10 transition-all group-hover:bg-orange-500/20">
                                  <div className="w-full bg-orange-500 rounded-t-sm transition-all duration-500 ease-out min-h-[4px]" style={{ height: `${(d.value / maxVal) * 100}%` }}></div>
                                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-1 bg-gray-900 text-white text-[10px] p-1 rounded font-bold whitespace-nowrap z-10 pointer-events-none transition-opacity">{formatPrice(d.value)}</div>
                              </div>
                              <span className="text-[10px] text-gray-600 font-bold">{d.label}</span>
                          </div>
                         );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 */}
              <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
                <CardContent className="p-0 h-full">
                  <div className="rounded-xl bg-gradient-to-br p-6 from-teal-500/15 to-teal-500/5 text-teal-700 h-full flex flex-col justify-between">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <BarChart3 className="h-5 w-5 opacity-40" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-medium text-teal-800/60">الطلبات الكلية</p>
                      <p className="text-3xl font-black tracking-tight text-teal-900">{(data.stats.orders ?? 0).toLocaleString("ar-EG")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 */}
              <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
                <CardContent className="p-0 h-full">
                  <div className="rounded-xl bg-gradient-to-br p-6 from-amber-500/15 to-amber-500/5 text-amber-700 h-full flex flex-col justify-between">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <BarChart3 className="h-5 w-5 opacity-40" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-medium text-amber-800/60">طلبات معلقة</p>
                      <p className="text-3xl font-black tracking-tight text-amber-900">{(data.stats.pendingOrders ?? 0).toLocaleString("ar-EG")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 */}
              <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
                <CardContent className="p-0 h-full">
                  <div className="rounded-xl bg-gradient-to-br p-6 from-sky-500/15 to-sky-500/5 text-sky-700 h-full flex flex-col justify-between">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                        <Package className="h-5 w-5" />
                      </div>
                      <BarChart3 className="h-5 w-5 opacity-40" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-medium text-sky-800/60">إجمالي المنتجات</p>
                      <p className="text-3xl font-black tracking-tight text-sky-900">{(data.stats.products ?? 0).toLocaleString("ar-EG")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

        <section className="grid grid-cols-1 gap-6">
          <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                توزيع التصنيفات
              </CardTitle>
              <CardDescription>عدد المنتجات داخل كل قسم</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topCategories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl overflow-hidden">
                        {category.icon && (category.icon.startsWith("http") || category.icon.startsWith("/uploads")) ? (
                          <img src={category.icon} alt={category.name} className="w-full h-full object-cover p-1.5" />
                        ) : (
                          category.icon || "•"
                        )}
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
        </section>
        </TabsContent>

        <TabsContent value="products" className="space-y-8">
          <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_rgba(69,44,16,0.08)] rounded-[2rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary mb-2">
                    <ListOrdered className="h-3.5 w-3.5" />
                    إدارة المخزون
                  </div>
                  <CardTitle className="text-2xl font-black">قائمة المنتجات</CardTitle>
                  <CardDescription>اسحب وأفلت لترتيب المنتجات في المتجر.</CardDescription>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="بحث في المنتجات..."
                      className="w-full sm:w-64 pr-9 h-12 rounded-2xl border-border/60 bg-background/50"
                    />
                  </div>
                  <Button onClick={openCreateDialog} className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 gap-2 font-black">
                    <PlusCircle className="h-5 w-5" />
                    إضافة منتج
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <Reorder.Group
                axis="y"
                values={filteredProducts}
                onReorder={(newOrder) => {
                   // Optimistic update
                   queryClient.setQueryData(["/api/admin/overview"], (prev: any) => ({
                     ...prev,
                     products: prev.products.map((p: any) => {
                        const newIdx = newOrder.findIndex((np: any) => np.id === p.id);
                        return newIdx !== -1 ? newOrder[newIdx] : p;
                     })
                   }));
                   // Call API
                   apiRequest("/api/admin/products/reorder", {
                     method: "POST",
                     body: JSON.stringify({ ids: newOrder.map(p => p.id) })
                   });
                }}
                className="space-y-4"
              >
                {filteredProducts.map((product) => (
                  <Reorder.Item
                    key={product.id}
                    value={product}
                    className="group rounded-3xl border border-border/40 bg-white/50 backdrop-blur-sm p-4 hover:border-primary/30 transition-all active:scale-[0.99] cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      
                      {product.image && (
                        <div className="h-16 w-16 rounded-2xl overflow-hidden border shrink-0">
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <h3 className="font-black text-sm md:text-base text-foreground truncate max-w-[140px] md:max-w-none">{product.name}</h3>
                          <Badge variant={product.inStock ? "secondary" : "outline"} className="rounded-full text-[9px] h-5 px-2 bg-emerald-50 text-emerald-700 border-emerald-100 font-bold shrink-0">
                            {product.inStock ? "متوفر" : "غير متوفر"}
                          </Badge>
                          <Badge variant="outline" className={cn("rounded-full text-[9px] h-5 px-2 font-black shrink-0", (product.stock || 0) <= 5 ? "border-rose-200 text-rose-600 bg-rose-50" : "border-orange-200 text-orange-600 bg-orange-50")}>
                            المخزون: {product.stock || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-x-2 gap-y-1 text-[10px] md:text-xs text-muted-foreground flex-wrap">
                          <span className="font-bold text-primary/80 bg-primary/5 px-2 rounded-lg">{getCategoryName(product.category)}</span>
                          <span className="font-black text-black/80">{formatPrice(product.price)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl text-primary bg-primary/5 md:bg-transparent hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(product);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                               deleteProductMutation.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {filteredProducts.length === 0 && (
                <div className="py-20 text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">لا يوجد منتجات</h3>
                  <p className="text-muted-foreground">أضف منتجاً جديداً أو جرب البحث بكلمات أخرى.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-8">
          <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_rgba(69,44,16,0.08)] rounded-[2rem] overflow-hidden">
            <CardHeader className="p-6 md:p-8 border-b border-border/40">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary mb-2">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    إدارة الطلبات
                  </div>
                  <CardTitle className="text-2xl font-black">سجل الطلبات</CardTitle>
                  <CardDescription>تابع طلبات العملاء وحالات التوصيل من مكان واحد.</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الهاتف..."
                      className="w-full sm:w-64 pr-9 text-right h-12 rounded-2xl border-border/60 bg-background/50"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 text-right h-12 rounded-2xl border-border/60 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="processing">جارٍ التجهيز</SelectItem>
                      <SelectItem value="completed">تم التوصيل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                      <SelectItem value="archived">مؤرشف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right py-5 pr-8">العميل</TableHead>
                      <TableHead className="text-right py-5">الحالة</TableHead>
                      <TableHead className="text-right py-5">القيمة</TableHead>
                      <TableHead className="text-right py-5">العنوان</TableHead>
                      <TableHead className="text-right py-5">التاريخ</TableHead>
                      <TableHead className="text-right py-5">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="text-right py-4 pr-8">
                          <div className="font-bold text-foreground">{order.name || "بدون اسم"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{order.phone || "لا يوجد هاتف"}</div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClasses[order.status] || "border-slate-200 bg-slate-100 text-slate-700"}`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-4 font-black text-primary">{formatPrice(order.total)}</TableCell>
                        <TableCell className="max-w-xs text-right text-sm text-muted-foreground truncate">{order.address || "غير متوفر"}</TableCell>
                        <TableCell className="text-right py-4 text-xs text-muted-foreground font-medium">{formatAdminDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right py-4 pl-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 px-3 rounded-xl gap-1 text-primary hover:bg-primary/10 font-bold"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsOrderDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              عرض
                            </Button>
                            <Select value={order.isArchived ? "archived" : order.status} onValueChange={(value) => value === "archived" ? archiveOrderMutation.mutate(order.id) : updateOrderMutation.mutate({ orderId: order.id, status: value })}>
                              <SelectTrigger className="h-9 w-32 text-right rounded-xl border-border/40 text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="pending" className="text-xs">قيد الانتظار</SelectItem>
                                <SelectItem value="processing" className="text-xs">جارٍ التجهيز</SelectItem>
                                <SelectItem value="completed" className="text-xs">تم التوصيل</SelectItem>
                                <SelectItem value="cancelled" className="text-xs text-red-500">إلغاء الطلب</SelectItem>
                                <SelectItem value="archived" className="text-xs text-gray-500">أرشفة</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View Cards (Timo Style) */}
              <div className="md:hidden p-4 space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm active:scale-[0.98] transition-transform">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex h-2 w-2 rounded-full ${order.status === 'pending' ? 'bg-amber-500' : order.status === 'processing' ? 'bg-blue-500' : order.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-xs font-black text-muted-foreground uppercase">{statusLabels[order.status]}</span>
                        </div>
                        <h3 className="font-black text-lg text-foreground">{order.name || "عميل بدون اسم"}</h3>
                        <p className="text-xs text-muted-foreground">{formatAdminDate(order.createdAt)}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-primary text-lg">{formatPrice(order.total)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{order.id.split('-')[0]}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{order.phone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Package className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{order.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 rounded-2xl h-11 font-black gap-2 bg-primary/5 text-primary hover:bg-primary/10 border-none"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsOrderDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        التفاصيل
                      </Button>
                      <Select value={order.isArchived ? "archived" : order.status} onValueChange={(value) => value === "archived" ? archiveOrderMutation.mutate(order.id) : updateOrderMutation.mutate({ orderId: order.id, status: value })}>
                        <SelectTrigger className="flex-1 h-11 rounded-2xl border-border/40 text-xs font-bold text-center">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="pending">قيد الانتظار</SelectItem>
                          <SelectItem value="processing">جارٍ التجهيز</SelectItem>
                          <SelectItem value="completed">تم التوصيل</SelectItem>
                          <SelectItem value="cancelled" className="text-red-500">إلغاء</SelectItem>
                          <SelectItem value="archived" className="text-gray-500">أرشفة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {filteredOrders.length === 0 && (
                <div className="p-20 text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">لم يتم العثور على طلبات</h3>
                  <p className="text-muted-foreground">جرب تغيير الفلاتر أو البحث بكلمات أخرى.</p>
                </div>
              )}
            </CardContent>
          </Card>
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
            <CardContent className="p-0 md:p-6">
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
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
                            {customer.phone && <p dir="ltr" className="text-right">{customer.phone}</p>}
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
              </div>

              {/* Mobile View Cards */}
              <div className="md:hidden p-4 space-y-4 bg-background/50">
                {customersQuery.data?.map((customer) => {
                  const isActive = customer.lastActive && new Date().getTime() - new Date(customer.lastActive).getTime() < 10 * 60 * 1000;
                  return (
                    <div key={customer.id} className="rounded-3xl border border-border/40 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                            {(customer.name || customer.username || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-foreground">{customer.name || customer.username || "بدون اسم"}</h3>
                            <p className="text-xs text-muted-foreground">عضو منذ {formatAdminDate(customer.createdAt)}</p>
                          </div>
                        </div>
                        <div>
                          {isActive ? (
                            <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                          ) : (
                            <span className="flex h-3 w-3 rounded-full bg-slate-300"></span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl">
                        {customer.email && (
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                            <span className="truncate flex-1" dir="ltr">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                            <span dir="ltr">{customer.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200/60 mt-2">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" />
                          <span>تاريخ آخر نشاط: {formatAdminDate(customer.lastActive) || "غير معروف"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!customersQuery.data || customersQuery.data.length === 0) && (
                  <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <UsersIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">لا يوجد عملاء مسجلون حالياً</p>
                  </div>
                )}
              </div>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-right">
                  <CardTitle className="flex items-center gap-2 justify-end">
                    <Mail className="h-5 w-5 text-primary" />
                    رسائل العملاء وخدمة العملاء
                  </CardTitle>
                  <CardDescription>هنا تظهر كافة الاستفسارات والرسائل المرسلة من الموقع.</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-2xl border border-border/40 w-full sm:w-auto">
                  <Button 
                    variant={messageFilter === "active" ? "default" : "ghost"} 
                    size="sm" 
                    className={`rounded-xl flex-1 sm:flex-none font-bold ${messageFilter === "active" ? "bg-primary text-white shadow-md" : "text-muted-foreground"}`}
                    onClick={() => setMessageFilter("active")}
                  >
                    النشطة
                  </Button>
                  <Button 
                    variant={messageFilter === "archived" ? "default" : "ghost"} 
                    size="sm" 
                    className={`rounded-xl flex-1 sm:flex-none font-bold ${messageFilter === "archived" ? "bg-primary text-white shadow-md" : "text-muted-foreground"}`}
                    onClick={() => setMessageFilter("archived")}
                  >
                    المؤرشفة
                  </Button>
                </div>
              </div>
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
                  {messagesQuery.data?.filter(msg => {
                    const m = msg as any;
                    const isArchived = m.isArchived || (msg.isRead && (new Date().getTime() - new Date(msg.createdAt).getTime() > 24 * 60 * 60 * 1000));
                    return messageFilter === "archived" ? isArchived : !isArchived;
                  }).map((msg) => (
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary rounded-xl"
                            onClick={() => archiveMessageMutation.mutate(msg.id)}
                            title="أرشفة"
                          >
                            <PlusCircle className="h-4 w-4 rotate-45" />
                          </Button>
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
                      shippingFee: Number(formData.get("shippingFee")) || 0,
                      freeShippingThreshold: Number(formData.get("freeShippingThreshold")) || 0,
                      announcementText: formData.get("announcementText") as string,
                    });
                  }}
                >
                  {/* === Shipping & Promotions Section === */}
                  <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-5 w-5 text-primary" />
                      <h3 className="font-black text-lg text-foreground">إعدادات التوصيل والعروض</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold block text-right">سعر التوصيل (ج.س)</label>
                        <Input
                          name="shippingFee"
                          type="number"
                          min="0"
                          defaultValue={settingsQuery.data?.shippingFee ?? 0}
                          className="text-right h-11 rounded-xl"
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground text-right">اكتب 0 لجعل التوصيل مجانياً دائماً.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold block text-right">توصيل مجاني عند شراء أكثر من (ج.س)</label>
                        <Input
                          name="freeShippingThreshold"
                          type="number"
                          min="0"
                          defaultValue={settingsQuery.data?.freeShippingThreshold ?? 50000}
                          className="text-right h-11 rounded-xl"
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground text-right">اكتب 0 لتعطيل هذا الخيار.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold block text-right">نص الشريط الإعلاني المتحرك</label>
                      <Textarea
                        name="announcementText"
                        defaultValue={settingsQuery.data?.announcementText || "خصم حصري 20% لفترة محدودة على كافة التوابل والبهارات!"}
                        className="text-right rounded-xl min-h-[80px]"
                        placeholder="اكتب نص العرض الذي سيظهر في الشريط العلوي المتحرك..."
                      />
                      <p className="text-xs text-muted-foreground text-right">هذا النص يظهر في الشريط الأسود المتحرك في أعلى الموقع.</p>
                    </div>
                  </div>

                  {/* === General Settings === */}
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
                    {updateSettingsMutation.isPending ? "جارٍ الحفظ..." : "حفظ جميع الإعدادات"}
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
                      <div className="flex items-center gap-3">
                        {category.icon && (category.icon.startsWith("http") || category.icon.startsWith("/uploads")) && (
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-primary/5">
                            <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{category.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{category.id}</p>
                        </div>
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
