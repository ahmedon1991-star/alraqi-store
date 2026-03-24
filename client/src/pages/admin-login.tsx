import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LockKeyhole, Shield } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest, setAdminToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال اسم المستخدم وكلمة المرور.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const data = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setAdminToken(data.token);
      toast({
        title: "أهلاً بك أيها المدير!",
        description: "تم الدخول بنجاح إلى النظام.",
      });
      setLocation("/admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تسجيل الدخول";
      toast({
        title: "خطأ في الدخول",
        description: "بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] selection:bg-primary/20">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        {/* Abstract Premium Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1B705C 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative w-full max-w-[480px] animate-in fade-in zoom-in duration-700">
          <Card className="border-white/40 bg-white/70 shadow-[0_40px_100px_-20px_rgba(27,112,92,0.12)] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <CardHeader className="space-y-6 pt-12 pb-8 text-center relative">
              <div className="mx-auto relative group">
                <div className="absolute -inset-4 bg-primary/5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 blur-xl" />
                <img src="/logo.png" alt="الراقي" className="h-28 w-auto object-contain relative transition-transform duration-500 group-hover:scale-105" />
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold mb-2">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  دخول محمي بالكامل
                </div>
                <CardTitle className="text-4xl font-black tracking-tight text-foreground">بوابة الإدارة</CardTitle>
                <CardDescription className="text-base font-medium text-muted-foreground/80 max-w-[280px] mx-auto">
                  قم بتسجيل الدخول للتحكم في كافة عمليات متجر الراقي
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-12">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2.5">
                  <label className="text-sm font-bold text-foreground/80 pr-1 flex items-center justify-between">
                    <span>اسم المستخدم</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-14 border-primary/10 bg-white/50 px-5 text-right font-medium transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 rounded-2xl"
                      placeholder="أدخل اسم المستخدم"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-bold text-foreground/80 pr-1 flex items-center justify-between">
                    <span>كلمة المرور</span>
                  </label>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="h-14 border-primary/10 bg-white/50 px-5 text-right font-medium transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 rounded-2xl"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="h-14 w-full text-lg font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] group" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        دخول لوحة التحكم
                        <Shield className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  © {new Date().getFullYear()} متجر الراقي الغذائي. جميع الحقوق محفوظة.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
