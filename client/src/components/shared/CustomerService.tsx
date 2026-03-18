import { useState, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, Phone, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-auth";
import { Link } from "wouter";

export function CustomerService() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name || user.username || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/messages", { 
      method: "POST", 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      toast({
        title: "تم إرسال رسالتك",
        description: "سنقوم بالرد عليك في أقرب وقت ممكن.",
      });
      setMessage("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: error.status === 429 ? "عذراً، وصلنا للحد الأقصى" : "خطأ في الإرسال",
        description: error.message || "يرجى المحاولة مرة أخرى لاحقاً.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول", description: "يجب تسجيل الدخول لإرسال الرسائل.", variant: "destructive" });
      setIsOpen(false);
      return;
    }
    sendMessageMutation.mutate({ name, email, phone, message });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-12 w-12 md:h-16 md:w-16 rounded-full shadow-2xl z-40 hover:scale-110 transition-transform bg-[#f97316] hover:bg-[#ea580c] text-white group border-4 border-white"
        size="icon"
      >
        <Send className="h-6 w-6 md:h-8 md:w-8 -mr-1" />
      </Button>

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-3rem)] z-50 animate-in slide-in-from-bottom-5 duration-300">
          <Card className="border-white/60 bg-white/95 shadow-2xl backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-primary p-4 flex flex-row items-center justify-between text-primary-foreground">
              <div>
                <CardTitle className="text-lg font-bold">تواصل معنا</CardTitle>
                <p className="text-xs opacity-90">فريق خدمة العملاء جاهز لمساعدتك</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 bg-gray-50/50">
              {!user ? (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <LogIn className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-800">سجل دخولك أولاً</h3>
                    <p className="text-sm text-gray-500 px-4">
                      إرسال الرسائل متاح فقط للمشتركين المسجلين في الموقع لضمان أفضل خدمة.
                    </p>
                  </div>
                  <Link href="/login">
                    <Button 
                      className="w-full mt-4 font-bold" 
                      onClick={() => setIsOpen(false)}
                    >
                      تسجيل الدخول / حساب جديد
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Input
                      placeholder="الاسم الكامل"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white text-right"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="email"
                      placeholder="البريد الإلكتروني"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white text-right"
                      dir="ltr"
                    />
                    <Input
                      type="tel"
                      placeholder="رقم الهاتف"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white text-right"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <Textarea
                      placeholder="كيف يمكننا مساعدتك؟"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      className="min-h-[100px] bg-white text-right resize-none"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gap-2 font-bold h-11"
                    disabled={sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    إرسال الرسالة
                  </Button>
                </form>
              )}
              
              <div className="pt-4 mt-4 border-t flex items-center justify-center gap-6 text-muted-foreground">
                <a href="tel:249900000000" className="hover:text-primary transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
                <a href="mailto:info@alraqi.com" className="hover:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
