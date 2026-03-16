import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LockKeyhole } from "lucide-react";
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        {/* Modern Background Decorations */}
        <div className="absolute inset-0 -z-10">
          <img src="/images/hero-main.png" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        </div>
        
        <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-[0_32px_120px_rgba(27,112,92,0.1)] backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-8 text-center">
            <div className="mx-auto flex flex-col items-center gap-4">
              <img src="/logo.png" alt="الراقي" className="h-24 w-auto object-contain drop-shadow-sm mb-2" />
              <div className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner hidden">
                <LockKeyhole className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-4xl font-black tracking-tight text-primary">دخول الإدارة</CardTitle>
              <CardDescription className="text-base font-bold">
                مساحة آمنة لإدارة متجر الراقي
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground mr-1">اسم المستخدم</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 border-primary/20 bg-white/50 text-right focus:bg-white"
                  placeholder="admin"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground mr-1">كلمة المرور</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-12 border-primary/20 bg-white/50 text-right focus:bg-white"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              <Button 
                type="submit" 
                className="h-12 w-full text-lg font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جارٍ الدخول الآمن...
                  </>
                ) : (
                  "دخول لوحة التحكم"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
