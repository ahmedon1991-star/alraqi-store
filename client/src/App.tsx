import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetails from "@/pages/product-details";
import Cart from "@/pages/cart";
import AuthPage from "@/pages/auth";

function Router() {
  return (
    <div className="min-h-screen w-full font-sans" dir="rtl">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/product/:id" component={ProductDetails} />
        <Route path="/cart" component={Cart} />
        <Route path="/login" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
