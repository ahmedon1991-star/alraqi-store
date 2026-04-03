import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// حدث مخصص لمزامنة الحالة بين المكونات المختلفة
// Sync update trigger
const WISHLIST_UPDATED = "wishlist-updated";

export function useWishlist() {
    const { toast } = useToast();
    const [items, setItems] = useState<string[]>([]);

    // تحميل البيانات الأولية
    useEffect(() => {
        const saved = localStorage.getItem("wishlist");
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse wishlist", e);
            }
        }
    }, []);

    // الاستماع للتغييرات (لمزامنة الأيقونات في الصفحة والنافكار)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem("wishlist");
            try {
                setItems(saved ? JSON.parse(saved) : []);
            } catch (e) {
                setItems([]);
            }
        };

        window.addEventListener(WISHLIST_UPDATED, handleStorageChange);
        window.addEventListener("storage", handleStorageChange); // Also listen to cross-tab changes
        return () => {
            window.removeEventListener(WISHLIST_UPDATED, handleStorageChange);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const saveItems = (newItems: string[]) => {
        setItems(newItems);
        localStorage.setItem("wishlist", JSON.stringify(newItems));
        window.dispatchEvent(new Event(WISHLIST_UPDATED));
    };

    const addItem = useCallback((id: string, name?: string) => {
        const current = JSON.parse(localStorage.getItem("wishlist") || "[]");
        if (!current.includes(id)) {
            const updated = [...current, id];
            saveItems(updated);
            toast({ description: name ? `تم إضافة ${name} للمفضلة` : "تمت الإضافة للمفضلة" });
        }
    }, [toast]);

    const removeItem = useCallback((id: string, name?: string) => {
        const current = JSON.parse(localStorage.getItem("wishlist") || "[]");
        const updated = current.filter((item: string) => item !== id);
        saveItems(updated);
        toast({ description: name ? `تم إزالة ${name} من المفضلة` : "تمت الإزالة من المفضلة" });
    }, [toast]);

    const toggleItem = useCallback((id: string, name?: string) => {
        if (!id) return;
        const saved = localStorage.getItem("wishlist");
        const current = saved ? JSON.parse(saved) : [];
        if (current.includes(id)) {
            removeItem(id, name);
        } else {
            addItem(id, name);
        }
    }, [addItem, removeItem]);

    const isInWishlist = useCallback((id: string) => {
        return items.includes(id);
    }, [items]);

    return { items, count: items.length, addItem, removeItem, toggleItem, isInWishlist };
}
