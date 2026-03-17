import { useState } from "react";
import { MessageCircle, Send, X, Loader2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function CustomerService() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

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
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإرسال",
        description: error.message || "يرجى المحاولة مرة أخرى لاحقاً.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate({ name, email, phone, message });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-10 w-10 md:h-14 md:w-14 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform bg-primary text-primary-foreground group"
        size="icon"
      >
        <MessageCircle className="h-5 w-5 md:h-7 md:w-7 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
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
                
                <div className="pt-4 border-t flex items-center justify-center gap-6 text-muted-foreground">
                  <a href="tel:249900000000" className="hover:text-primary transition-colors">
                    <Phone className="h-5 w-5" />
                  </a>
                  <a href="mailto:info@alraqi.com" className="hover:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
