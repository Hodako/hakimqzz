"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { QrCode, Calendar, FileText, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getProducts, getSales, type Product } from "@/lib/queries";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import {
  createSaleFn,
  getRestaurantTablesFn,
  upsertRestaurantTableFn,
  deleteRestaurantTableFn,
  getRestaurantFloorsFn,
  upsertRestaurantFloorFn,
  deleteRestaurantFloorFn,
  getRestaurantOrdersFn,
  createRestaurantOrderFn,
  updateRestaurantOrderStatusFn,
  getBillingQueueFn,
  enqueueBillFn,
  updateBillingQueueStatusFn,
} from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Utensils,
  ShoppingBag,
  Truck,
  Users,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Receipt,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Percent,
  Split,
  ChefHat,
  Coffee,
  Pizza,
  Wine,
  Cake,
  DollarSign,
  Grid,
  List,
  Flame,
  ArrowRight,
  ShoppingCart,
  User,
  ChevronDown,
  LogOut,
  Languages,
  Layers,
  LayoutDashboard,
  TrendingUp,
  Armchair,
  Settings2,
  ListOrdered,
  Send,
} from "lucide-react";

// Default Restaurant Menu items with rich food photos (and emoji fallback if offline)
const DEFAULT_RESTAURANT_MENU = [
  { id: "fd-1", name: "Hyderabadi Kacchi Biryani", category: "Biryani & Rice", sell_price: 380, buy_price: 240, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80", emoji: "🍲" },
  { id: "fd-2", name: "Chicken Dum Biryani", category: "Biryani & Rice", sell_price: 280, buy_price: 180, image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80", emoji: "🍗" },
  { id: "fd-3", name: "Beef Tehari", category: "Biryani & Rice", sell_price: 290, buy_price: 190, image: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=80", emoji: "🥩" },
  { id: "fd-4", name: "Crispy Chicken Wings", category: "Starters & Fast Food", sell_price: 250, buy_price: 130, image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80", emoji: "🍗" },
  { id: "fd-5", name: "Classic Beef Burger", category: "Starters & Fast Food", sell_price: 250, buy_price: 150, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80", emoji: "🍔" },
  { id: "fd-6", name: "BBQ Chicken Pizza (10-inch)", category: "Pizza & Pasta", sell_price: 650, buy_price: 380, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80", emoji: "🍕" },
  { id: "fd-7", name: "Creamy White Sauce Pasta", category: "Pizza & Pasta", sell_price: 320, buy_price: 180, image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=400&q=80", emoji: "🍝" },
  { id: "fd-8", name: "Butter Chicken with Naan", category: "Mains & Curries", sell_price: 360, buy_price: 210, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80", emoji: "🥘" },
  { id: "fd-9", name: "Chicken Shank Roast", category: "Mains & Curries", sell_price: 250, buy_price: 145, image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80", emoji: "🍗" },
  { id: "fd-10", name: "Meat Platter Assortment", category: "Mains & Curries", sell_price: 1000, buy_price: 620, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80", emoji: "🍖" },
  { id: "fd-11", name: "Fresh Mint Lemonade", category: "Beverages", sell_price: 120, buy_price: 40, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80", emoji: "🍹" },
  { id: "fd-12", name: "Cold Brew Iced Coffee", category: "Beverages", sell_price: 160, buy_price: 60, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=400&q=80", emoji: "☕" },
  { id: "fd-13", name: "Chocolate Lava Cake", category: "Desserts", sell_price: 220, buy_price: 110, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80", emoji: "🍰" },
];

const MENU_CATEGORIES = [
  "All Dishes",
  "Biryani & Rice",
  "Mains & Curries",
  "Starters & Fast Food",
  "Pizza & Pasta",
  "Beverages",
  "Desserts",
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  buy_price: number;
  qty: number;
  notes?: string;
  spice?: "Mild" | "Medium" | "Hot";
  kotSent?: boolean;
}

interface TableState {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  status: "available" | "occupied" | "billed";
  orderType: "dine_in" | "takeaway" | "delivery";
  guests: number;
  waiter: string;
  items: CartItem[];
  startTime?: string;
}

interface FloorItem {
  id: string;
  name: string;
  sort_order?: number;
}

export default function RestaurantPosPage() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useT();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: dbProducts = [] } = useCachedQuery<Product[]>(["products"], getProducts);
  const { data: dbSales = [] } = useCachedQuery<any[]>(["sales"], getSales);

  const isOwner = user?.role === "owner" || user?.role === "superadmin";

  // Active view: "owner" (Owner ERP Dashboard) vs "tables" (floor plan) vs "order" (menu & billing) vs "kds" (Kitchen Display System) vs "queue" (Cashier Billing Queue)
  const [activeView, setActiveView] = useState<"order" | "tables" | "kds" | "owner" | "queue">("order");
  // Mobile Waiter Phone UI State
  const [mobileTab, setMobileTab] = useState<"menu" | "tables" | "profile">("menu");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [kdsOrders, setKdsOrders] = useState<any[]>([]);
  const [billingQueue, setBillingQueue] = useState<any[]>([]);
  const [floors, setFloors] = useState<FloorItem[]>([
    { id: "floor_ground", name: "Ground Floor", sort_order: 1 },
    { id: "floor_1st", name: "1st Floor", sort_order: 2 },
    { id: "floor_rooftop", name: "Rooftop / VIP", sort_order: 3 },
  ]);
  const [selectedFloor, setSelectedFloor] = useState<string>("All Floors");
  const [newFloorName, setNewFloorName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableFloor, setNewTableFloor] = useState("Ground Floor");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [selectedCategory, setSelectedCategory] = useState("All Dishes");
  const [searchQuery, setSearchQuery] = useState("");

  // Order Details
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [selectedTable, setSelectedTable] = useState<string>("Table 1");
  const [waiterName, setWaiterName] = useState("Staff");
  const [guestCount, setGuestCount] = useState(2);
  const [customerPhone, setCustomerPhone] = useState("");

  // Table Floor Plan (Multi-Floor with Capacity)
  const [tables, setTables] = useState<Record<string, TableState>>(() => {
    const initial: Record<string, TableState> = {};
    for (let i = 1; i <= 8; i++) {
      initial[`Table ${i}`] = {
        id: `Table ${i}`,
        name: `Table ${i}`,
        floor: "Ground Floor",
        capacity: i % 2 === 0 ? 4 : 2,
        status: "available",
        orderType: "dine_in",
        guests: i % 2 === 0 ? 4 : 2,
        waiter: "Staff",
        items: [],
      };
    }
    for (let i = 9; i <= 14; i++) {
      initial[`Table ${i}`] = {
        id: `Table ${i}`,
        name: `Table ${i}`,
        floor: "1st Floor",
        capacity: 4,
        status: "available",
        orderType: "dine_in",
        guests: 4,
        waiter: "Staff",
        items: [],
      };
    }
    initial["VIP 1"] = { id: "VIP 1", name: "VIP 1", floor: "Rooftop / VIP", capacity: 6, status: "available", orderType: "dine_in", guests: 6, waiter: "Staff", items: [] };
    initial["VIP 2"] = { id: "VIP 2", name: "VIP 2", floor: "Rooftop / VIP", capacity: 8, status: "available", orderType: "dine_in", guests: 8, waiter: "Staff", items: [] };
    return initial;
  });

  // Active Cart Items for currently selected table / order
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modifiers & Add-ons modal
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [itemNotes, setItemNotes] = useState("");
  const [itemSpice, setItemSpice] = useState<"Mild" | "Medium" | "Hot">("Medium");

  // Billing & Charges
  const [serviceChargeRate, setServiceChargeRate] = useState(5); // 5%
  const [vatRate, setVatRate] = useState(5); // 5%
  const [discountAmount, setDiscountAmount] = useState(0);
  const [productDiscount, setProductDiscount] = useState(0);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bkash" | "nagad">("cash");
  const [orderSeq, setOrderSeq] = useState<number>(20);
  const [kitchenFilter, setKitchenFilter] = useState<"all" | "kitchen" | "tracked_drinks">("all");
  const [existingSearch, setExistingSearch] = useState("");
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Drafts, Table Reservations & QR Menu Orders
  type DraftOrder = {
    id: string;
    label: string;
    orderType: "dine_in" | "takeaway" | "delivery";
    table: string;
    items: CartItem[];
    productDiscount: number;
    extraDiscount: number;
    couponDiscount: number;
    createdAt: string;
  };
  type TableReservation = {
    id: string;
    guestName: string;
    phone: string;
    guests: number;
    table: string;
    time: string;
    notes: string;
    status: "reserved" | "seated" | "cancelled";
  };
  type QrMenuOrder = {
    id: string;
    table: string;
    customerName: string;
    items: CartItem[];
    total: number;
    time: string;
    status: "incoming" | "accepted";
  };

  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [resGuestName, setResGuestName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resGuests, setResGuests] = useState(4);
  const [resTable, setResTable] = useState("Table 1");
  const [resTime, setResTime] = useState("19:30");
  const [resNotes, setResNotes] = useState("");
  const [qrOrders, setQrOrders] = useState<QrMenuOrder[]>([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSelectedTable, setQrSelectedTable] = useState("Table 1");

  // Modals
  const [kotModalOpen, setKotModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [settledSale, setSettledSale] = useState<any | null>(null);
  const [settlingBusy, setSettlingBusy] = useState(false);
  const pendingAutoPrintRef = useRef(false);

  // Split bill helper
  const [splitCount, setSplitCount] = useState(2);

  // Sync combined discount into base discountAmount used by billing/queue handlers
  useEffect(() => {
    setDiscountAmount(Math.max(0, Number(productDiscount || 0) + Number(extraDiscount || 0) + Number(couponDiscount || 0)));
  }, [productDiscount, extraDiscount, couponDiscount]);

  // Restore saved Drafts, Reservations & QR Orders
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedDrafts = localStorage.getItem("urobili_rest_drafts");
      if (savedDrafts) setDraftOrders(JSON.parse(savedDrafts));
      const savedRes = localStorage.getItem("urobili_rest_reservations");
      if (savedRes) setReservations(JSON.parse(savedRes));
      const savedQr = localStorage.getItem("urobili_rest_qr_orders");
      if (savedQr) setQrOrders(JSON.parse(savedQr));
    } catch (_) {}
  }, []);

  // Auto-trigger 80mm thermal bill print when "Bill & Print" finishes settling
  useEffect(() => {
    if (settledSale && pendingAutoPrintRef.current) {
      pendingAutoPrintRef.current = false;
      printRestaurantBill({
        ...settledSale,
        floor: tables[settledSale.table]?.floor,
      });
      setReceiptModalOpen(false);
    }
  }, [settledSale]);

  // Load persisted Restaurant Floors, Tables & KDS Orders from PostgreSQL
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dbFloors, dbTables, dbOrders, dbQueue] = await Promise.all([
          getRestaurantFloorsFn().catch(() => []),
          getRestaurantTablesFn().catch(() => []),
          getRestaurantOrdersFn().catch(() => []),
          getBillingQueueFn().catch(() => []),
        ]);
        if (!active) return;
        if (Array.isArray(dbQueue)) {
          setBillingQueue(dbQueue);
        }
        if (Array.isArray(dbFloors) && dbFloors.length > 0) {
          setFloors(dbFloors);
          setNewTableFloor(dbFloors[0].name || "Ground Floor");
        }
        if (Array.isArray(dbTables) && dbTables.length > 0) {
          const map: Record<string, TableState> = {};
          dbTables.forEach((t: any) => {
            const key = t.id || t.name;
            if (key) {
              map[key] = {
                ...t,
                floor: t.floor || "Ground Floor",
                capacity: Number(t.capacity) || Number(t.guests) || 4,
              };
            }
          });
          setTables(map);
        }
        if (Array.isArray(dbOrders)) {
          setKdsOrders(dbOrders);
        }
      } catch (_) {}
    })();
    return () => { active = false; };
  }, []);

  // Sync Cart with Selected Table
  useEffect(() => {
    if (orderType === "dine_in" && tables[selectedTable]) {
      setCart(tables[selectedTable].items || []);
    }
  }, [selectedTable, orderType]);

  // Combine DB products with standard restaurant menu
  const menuItems = useMemo(() => {
    const list: any[] = [];
    if (dbProducts && dbProducts.length > 0) {
      dbProducts.forEach((p) => {
        list.push({
          id: p.id,
          name: p.name,
          category: p.category || "General Dishes",
          sell_price: p.sell_price,
          buy_price: p.buy_price || 0,
          image: p.image_url || "🍽️",
          track_stock: p.track_stock === true,
          stock: p.stock ?? 0,
        });
      });
    }
    // Add default menu items if not already present
    DEFAULT_RESTAURANT_MENU.forEach((def) => {
      if (!list.some((it) => it.name.toLowerCase() === def.name.toLowerCase())) {
        list.push({ ...def, track_stock: false, stock: 0 });
      }
    });
    return list;
  }, [dbProducts]);

  // Filtered Menu
  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === "All Dishes" || item.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchKitchen =
        kitchenFilter === "all" ||
        (kitchenFilter === "tracked_drinks" ? item.track_stock === true : item.track_stock !== true);
      return matchCat && matchSearch && matchKitchen;
    });
  }, [menuItems, selectedCategory, searchQuery, kitchenFilter]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [cart]);

  const serviceCharge = useMemo(() => {
    if (orderType !== "dine_in") return 0;
    return Math.round((subtotal * serviceChargeRate) / 100);
  }, [subtotal, serviceChargeRate, orderType]);

  const vatAmount = useMemo(() => {
    return Math.round((subtotal * vatRate) / 100);
  }, [subtotal, vatRate]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + serviceCharge + vatAmount - discountAmount);
  }, [subtotal, serviceCharge, vatAmount, discountAmount]);

  // Add Item to Cart
  function addToCart(item: any, notes = "", spice: "Mild" | "Medium" | "Hot" = "Medium") {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id && i.notes === notes && i.spice === spice);
      let updated: CartItem[];
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx].qty += 1;
      } else {
        updated = [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: Number(item.sell_price) || 0,
            buy_price: Number(item.buy_price) || 0,
            qty: 1,
            notes,
            spice,
            kotSent: false,
          },
        ];
      }
      // Update table state & persist to PostgreSQL
      if (orderType === "dine_in") {
        setTables((tPrev) => {
          const nextTable: TableState = {
            ...tPrev[selectedTable],
            status: "occupied",
            items: updated,
            startTime: tPrev[selectedTable]?.startTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
          return { ...tPrev, [selectedTable]: nextTable };
        });
      }
      return updated;
    });
  }

  function updateQty(index: number, delta: number) {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].qty + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].qty = newQty;
      }
      if (orderType === "dine_in") {
        setTables((tPrev) => {
          const nextTable: TableState = {
            ...tPrev[selectedTable],
            status: updated.length > 0 ? "occupied" : "available",
            items: updated,
          };
          void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
          return { ...tPrev, [selectedTable]: nextTable };
        });
      }
      return updated;
    });
  }

  function removeFromCart(index: number) {
    setCart((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (orderType === "dine_in") {
        setTables((tPrev) => {
          const nextTable: TableState = {
            ...tPrev[selectedTable],
            status: updated.length > 0 ? "occupied" : "available",
            items: updated,
          };
          void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
          return { ...tPrev, [selectedTable]: nextTable };
        });
      }
      return updated;
    });
  }

  function saveCartItemNote(index: number, noteText: string) {
    setCart((prev) => {
      const updated = prev.map((it, idx) => (idx === index ? { ...it, notes: noteText.trim() } : it));
      if (orderType === "dine_in") {
        setTables((tPrev) => {
          const nextTable: TableState = {
            ...tPrev[selectedTable],
            status: updated.length > 0 ? "occupied" : "available",
            items: updated,
          };
          void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
          return { ...tPrev, [selectedTable]: nextTable };
        });
      }
      return updated;
    });
    setEditingNoteIdx(null);
    setEditingNoteText("");
  }

  function persistDrafts(next: DraftOrder[]) {
    setDraftOrders(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("urobili_rest_drafts", JSON.stringify(next));
      } catch (_) {}
    }
  }

  function persistReservations(next: TableReservation[]) {
    setReservations(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("urobili_rest_reservations", JSON.stringify(next));
      } catch (_) {}
    }
  }

  function persistQrOrders(next: QrMenuOrder[]) {
    setQrOrders(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("urobili_rest_qr_orders", JSON.stringify(next));
      } catch (_) {}
    }
  }

  function handleNewOrder() {
    setCart([]);
    setProductDiscount(0);
    setExtraDiscount(0);
    setCouponDiscount(0);
    setOrderSeq((n) => n + 1);
    setActiveView("order");
    toast.success(lang === "bn" ? "নতুন অর্ডার শুরু হয়েছে" : "Started a new POS order");
  }

  function handleSaveDraft() {
    if (cart.length === 0) return;
    const draft: DraftOrder = {
      id: `DRF-${Date.now().toString().slice(-5)}`,
      label: orderType === "dine_in" ? `${selectedTable} (#${orderSeq})` : `${orderType.toUpperCase()} (#${orderSeq})`,
      orderType,
      table: selectedTable,
      items: [...cart],
      productDiscount,
      extraDiscount,
      couponDiscount,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    persistDrafts([draft, ...draftOrders]);
    setCart([]);
    setProductDiscount(0);
    setExtraDiscount(0);
    setCouponDiscount(0);
    setOrderSeq((n) => n + 1);
    toast.success(lang === "bn" ? "ড্রাফট অর্ডার সেভ করা হয়েছে" : `Saved ${draft.label} to Draft List`);
  }

  function handleLoadDraft(draft: DraftOrder) {
    setOrderType(draft.orderType);
    if (draft.orderType === "dine_in") {
      setSelectedTable(draft.table);
    }
    setCart(draft.items || []);
    setProductDiscount(draft.productDiscount || 0);
    setExtraDiscount(draft.extraDiscount || 0);
    setCouponDiscount(draft.couponDiscount || 0);
    persistDrafts(draftOrders.filter((d) => d.id !== draft.id));
    setDraftsModalOpen(false);
    setActiveView("order");
    toast.success(lang === "bn" ? "ড্রাফট লোড করা হয়েছে" : `Loaded ${draft.label}`);
  }

  function handleDeleteDraft(id: string) {
    persistDrafts(draftOrders.filter((d) => d.id !== id));
  }

  async function handleAddReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!resGuestName.trim()) {
      toast.error(lang === "bn" ? "অতিথির নাম লিখুন" : "Enter guest name");
      return;
    }
    const item: TableReservation = {
      id: `RES-${Date.now().toString().slice(-5)}`,
      guestName: resGuestName.trim(),
      phone: resPhone.trim(),
      guests: Math.max(1, Number(resGuests) || 2),
      table: resTable,
      time: resTime || "19:30",
      notes: resNotes.trim(),
      status: "reserved",
    };
    persistReservations([item, ...reservations]);
    const tb = tables[resTable];
    if (tb && tb.status === "available") {
      const nextTable: TableState = { ...tb, status: "reserved", guests: item.guests };
      setTables((prev) => ({ ...prev, [resTable]: nextTable }));
      void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
    }
    setResGuestName("");
    setResPhone("");
    setResNotes("");
    toast.success(lang === "bn" ? `${resTable} রিজার্ভ করা হয়েছে` : `Reserved ${resTable} for ${item.guestName}`);
  }

  function handleSeatReservation(res: TableReservation) {
    setOrderType("dine_in");
    setSelectedTable(res.table);
    setGuestCount(res.guests);
    const tb = tables[res.table];
    if (tb) {
      const nextTable: TableState = {
        ...tb,
        status: "occupied",
        guests: res.guests,
        startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTables((prev) => ({ ...prev, [res.table]: nextTable }));
      void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
    }
    persistReservations(reservations.map((r) => (r.id === res.id ? { ...r, status: "seated" } : r)));
    setReservationsModalOpen(false);
    setActiveView("order");
    toast.success(lang === "bn" ? `${res.guestName} টেবিলে বসেছেন` : `Seated ${res.guestName} at ${res.table}`);
  }

  function handleCancelReservation(resId: string, tableName: string) {
    persistReservations(reservations.filter((r) => r.id !== resId));
    const tb = tables[tableName];
    if (tb && tb.status === "reserved") {
      const nextTable: TableState = { ...tb, status: "available" };
      setTables((prev) => ({ ...prev, [tableName]: nextTable }));
      void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
    }
  }

  function handleSimulateQrOrder() {
    const sampleItems = menuItems.slice(0, 2).map((m) => ({
      id: m.id,
      name: m.name,
      price: Number(m.sell_price) || 150,
      buy_price: Number(m.buy_price) || 0,
      qty: 1,
      notes: "QR Table Order",
      spice: "Medium" as const,
      kotSent: false,
    }));
    const total = sampleItems.reduce((s, it) => s + it.price * it.qty, 0);
    const qrOrder: QrMenuOrder = {
      id: `QR-${Date.now().toString().slice(-4)}`,
      table: qrSelectedTable,
      customerName: lang === "bn" ? "QR অতিথি" : "QR Guest",
      items: sampleItems,
      total,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "incoming",
    };
    persistQrOrders([qrOrder, ...qrOrders]);
    toast.success(lang === "bn" ? "QR মেনু অর্ডার এসেছে" : `QR Menu order received for ${qrSelectedTable}`);
  }

  function handleAcceptQrOrder(qOrder: QrMenuOrder) {
    setOrderType("dine_in");
    setSelectedTable(qOrder.table);
    setCart(qOrder.items);
    const tb = tables[qOrder.table];
    if (tb) {
      const nextTable: TableState = {
        ...tb,
        status: "occupied",
        items: qOrder.items,
        startTime: tb.startTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTables((prev) => ({ ...prev, [qOrder.table]: nextTable }));
      void upsertRestaurantTableFn({ data: nextTable }).catch(() => {});
    }
    persistQrOrders(qrOrders.map((q) => (q.id === qOrder.id ? { ...q, status: "accepted" } : q)));
    setQrModalOpen(false);
    setActiveView("order");
    toast.success(lang === "bn" ? `${qOrder.table} অর্ডার লোড হয়েছে` : `Accepted QR order onto ${qOrder.table}`);
  }

  function handleSelectTable(tName: string) {
    setSelectedTable(tName);
    setOrderType("dine_in");
    setActiveView("order");
  }

  // Waiter & Staff: Toggle whether a table is Free or Occupied
  async function handleToggleTableFree(tableId: string, forceFree = false) {
    const tb = tables[tableId];
    if (!tb) return;
    const nextStatus: TableState["status"] = forceFree || tb.status !== "available" ? "available" : "occupied";
    const nextTable: TableState = {
      ...tb,
      status: nextStatus,
      items: nextStatus === "available" ? [] : tb.items,
      startTime: nextStatus === "available" ? undefined : tb.startTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTables((prev) => ({ ...prev, [tableId]: nextTable }));
    if (selectedTable === tableId && nextStatus === "available") {
      setCart([]);
    }
    try {
      await upsertRestaurantTableFn({ data: nextTable });
      toast.success(
        nextStatus === "available"
          ? `${tb.name} ${lang === "bn" ? "ফ্রি করা হয়েছে" : "marked Free"}`
          : `${tb.name} ${lang === "bn" ? "অকুপাইড করা হয়েছে" : "marked Occupied"}`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update table");
    }
  }

  // Owner: Add Floor
  async function handleAddFloor() {
    if (!isOwner) return;
    const name = newFloorName.trim();
    if (!name) return;
    try {
      const res = await upsertRestaurantFloorFn({ data: { name, sort_order: floors.length + 1 } });
      setFloors((prev) => [...prev, { id: res.id, name, sort_order: prev.length + 1 }]);
      setNewFloorName("");
      toast.success(lang === "bn" ? `ফ্লোর "${name}" যোগ করা হয়েছে` : `Floor "${name}" added`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add floor");
    }
  }

  // Owner: Delete Floor
  async function handleDeleteFloor(floorId: string) {
    if (!isOwner) return;
    try {
      await deleteRestaurantFloorFn({ data: { id: floorId } });
      setFloors((prev) => prev.filter((f) => f.id !== floorId));
      toast.success(lang === "bn" ? "ফ্লোর মুছে ফেলা হয়েছে" : "Floor removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete floor");
    }
  }

  // Owner: Add Table with Capacity & Floor
  async function handleAddTable() {
    if (!isOwner) return;
    const name = newTableName.trim();
    if (!name) {
      toast.error(lang === "bn" ? "টেবিলের নাম লিখুন" : "Enter a table name");
      return;
    }
    const cap = Math.max(1, Number(newTableCapacity) || 4);
    const floor = newTableFloor || floors[0]?.name || "Ground Floor";
    const newTb: TableState = {
      id: name,
      name,
      floor,
      capacity: cap,
      status: "available",
      orderType: "dine_in",
      guests: cap,
      waiter: "Staff",
      items: [],
    };
    try {
      await upsertRestaurantTableFn({ data: { ...newTb, sort_order: Object.keys(tables).length + 1 } });
      setTables((prev) => ({ ...prev, [name]: newTb }));
      setNewTableName("");
      toast.success(lang === "bn" ? `${name} (${cap} সিট) যোগ হয়েছে` : `${name} (${cap} seats) added to ${floor}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add table");
    }
  }

  // Owner: Update Table Capacity
  async function handleUpdateTableCapacity(tableId: string, capacity: number) {
    if (!isOwner) return;
    const tb = tables[tableId];
    if (!tb) return;
    const safeCap = Math.max(1, Math.min(50, Number(capacity) || 1));
    const updated = { ...tb, capacity: safeCap, guests: safeCap };
    setTables((prev) => ({ ...prev, [tableId]: updated }));
    try {
      await upsertRestaurantTableFn({ data: { id: tableId, capacity: safeCap, guests: safeCap } });
      toast.success(`${tb.name} capacity → ${safeCap} seats`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update capacity");
    }
  }

  // Owner: Delete Table
  async function handleDeleteTable(tableId: string) {
    if (!isOwner) return;
    try {
      await deleteRestaurantTableFn({ data: { id: tableId } });
      setTables((prev) => {
        const copy = { ...prev };
        delete copy[tableId];
        return copy;
      });
      toast.success(lang === "bn" ? "টেবিল মুছে ফেলা হয়েছে" : "Table deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete table");
    }
  }

  // Floor & Owner Dashboard Derived Metrics
  const floorNames = useMemo(() => {
    const names = new Set<string>(floors.map((f) => f.name));
    Object.values(tables).forEach((t) => {
      if (t.floor) names.add(t.floor);
    });
    return Array.from(names);
  }, [floors, tables]);

  const filteredTables = useMemo(() => {
    const all = Object.values(tables);
    if (selectedFloor === "All Floors") return all;
    return all.filter((t) => (t.floor || "Ground Floor") === selectedFloor);
  }, [tables, selectedFloor]);

  const restaurantStats = useMemo(() => {
    const allTables = Object.values(tables);
    const totalTables = allTables.length;
    const occupiedTables = allTables.filter((t) => t.status === "occupied").length;
    const totalCapacity = allTables.reduce((s, t) => s + (Number(t.capacity) || 4), 0);
    const occupiedCapacity = allTables
      .filter((t) => t.status === "occupied")
      .reduce((s, t) => s + (Number(t.capacity) || 4), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = (dbSales || []).filter((s: any) => String(s.created_at || "").startsWith(todayStr));
    const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + (Number(s.sell_price) || 0), 0);
    const todayProfit = todaySales.reduce(
      (acc: number, s: any) => acc + ((Number(s.sell_price) || 0) - (Number(s.buy_price) || 0)),
      0
    );
    const activeKds = kdsOrders.filter((o) => o.status === "pending" || o.status === "preparing").length;
    return {
      totalTables,
      occupiedTables,
      freeTables: totalTables - occupiedTables,
      totalCapacity,
      occupiedCapacity,
      todayRevenue,
      todayProfit,
      todayOrdersCount: todaySales.length,
      activeKds,
    };
  }, [tables, dbSales, kdsOrders]);

  // Print KOT (Kitchen Order Ticket) & Push to KDS (PostgreSQL)
  async function handleSendKOT() {
    if (cart.length === 0) {
      toast.error(lang === "bn" ? "অর্ডারে কোনো খাবার নেই" : "No items in order to send to kitchen");
      return;
    }
    setCart((prev) => prev.map((it) => ({ ...it, kotSent: true })));
    setKotModalOpen(true);
    try {
      const created = await createRestaurantOrderFn({
        data: {
          table: orderType === "dine_in" ? selectedTable : orderType.toUpperCase(),
          orderType,
          waiter: waiterName,
          guests: guestCount,
          items: cart,
          status: "pending",
          subtotal,
        },
      });
      if (created?.id) {
        setKdsOrders((prev) => [created, ...prev]);
        toast.success(lang === "bn" ? "KOT কিচেন ডিসপ্লেতে পাঠানো হয়েছে!" : "KOT sent to Kitchen Display (KDS)!");
      }
    } catch (_) {}
  }

  async function handleKdsStatusChange(orderId: string, nextStatus: string) {
    setKdsOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    try {
      await updateRestaurantOrderStatusFn({ data: { id: orderId, status: nextStatus } });
      toast.success(`Order ${orderId} → ${nextStatus.toUpperCase()}`);
    } catch (_) {}
  }

  // Clean 80mm Thermal Print Helper (Modeled after Fashion POS invoice-printer)
  function openThermalPrintWindow(title: string, bodyHtml: string) {
    if (typeof window === "undefined") return;
    const w = window.open("", "_blank", "width=420,height=680");
    if (!w) {
      toast.error(lang === "bn" ? "পপ-আপ ব্লক করা আছে, অনুগ্রহ করে অনুমোদন দিন" : "Pop-up blocked. Please allow pop-ups to print.");
      return;
    }
    w.document.open();
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { width: 72mm; margin: 0 auto; padding: 6px; color: #111; font-size: 12px; line-height: 1.4; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .muted { color: #555; font-size: 10.5px; }
    .divider { border-top: 1px dashed #444; margin: 7px 0; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th, td { text-align: left; padding: 3px 0; font-size: 11.5px; vertical-align: top; }
    th.num, td.num { text-align: right; white-space: nowrap; }
    .total-row { font-size: 14px; font-weight: 800; border-top: 1px solid #111; padding-top: 4px; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 6px; border: 1px solid #111; border-radius: 4px; font-weight: 700; font-size: 11px; margin-bottom: 4px; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 220);
    };
  </script>
</body>
</html>`);
    w.document.close();
  }

  function printRestaurantKot(kot: {
    table: string;
    orderType: string;
    waiter: string;
    items: CartItem[];
    ticketNo?: string;
  }) {
    const rows = (kot.items || [])
      .map(
        (it) => `
      <tr>
        <td class="bold">${it.qty}x</td>
        <td>${it.name}${it.notes ? `<div class="muted">Note: ${it.notes}</div>` : ""}</td>
        <td class="num muted">${it.spice || ""}</td>
      </tr>`
      )
      .join("");
    openThermalPrintWindow(
      "KOT Slip",
      `
      <div class="center">
        <div class="badge">KITCHEN ORDER TICKET</div>
        <div class="bold" style="font-size:15px">${user?.business_name || "Urobili Restaurant"}</div>
        <div class="muted">${kot.orderType.toUpperCase()} • ${kot.table}</div>
      </div>
      <div class="divider"></div>
      <div class="row muted"><span>Waiter: ${kot.waiter}</span><span>#${kot.ticketNo || Date.now().toString().slice(-4)}</span></div>
      <div class="row muted"><span>Time: ${new Date().toLocaleTimeString()}</span><span>${new Date().toLocaleDateString()}</span></div>
      <div class="divider"></div>
      <table>
        <thead><tr><th>Qty</th><th>Item</th><th class="num">Spice</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="divider"></div>
      <div class="center muted">--- Kitchen Copy ---</div>
      `
    );
  }

  function printRestaurantBill(bill: {
    id: string;
    queue_no?: string;
    table: string;
    floor?: string;
    orderType?: string;
    waiter?: string;
    items: CartItem[];
    subtotal: number;
    serviceCharge: number;
    vatAmount: number;
    discount?: number;
    grandTotal: number;
    type?: string;
    paymentMethod?: string;
  }) {
    const rows = (bill.items || [])
      .map(
        (it) => `
      <tr>
        <td>${it.name} <span class="muted">x${it.qty}</span></td>
        <td class="num bold">৳${(Number(it.price) * Number(it.qty)).toFixed(0)}</td>
      </tr>`
      )
      .join("");
    const payMethod = (bill.paymentMethod || bill.type || "cash").toUpperCase();
    openThermalPrintWindow(
      `Bill ${bill.id}`,
      `
      <div class="center">
        <div class="bold" style="font-size:16px">${user?.business_name || "Urobili Restaurant"}</div>
        ${user?.business_address ? `<div class="muted">${user.business_address}</div>` : ""}
        ${user?.business_phone_numbers ? `<div class="muted">Tel: ${user.business_phone_numbers}</div>` : ""}
        <div class="muted">${user?.tagline || "Thank you for dining with us!"}</div>
      </div>
      <div class="divider"></div>
      <div class="row muted"><span>Bill #: ${bill.id}</span><span>${bill.queue_no ? `Queue: ${bill.queue_no}` : ""}</span></div>
      <div class="row muted"><span>${bill.table}${bill.floor ? ` (${bill.floor})` : ""}</span><span>Waiter: ${bill.waiter || "Staff"}</span></div>
      <div class="row muted"><span>Date: ${new Date().toLocaleDateString()}</span><span>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div class="divider"></div>
      <table>
        <thead><tr><th>Item</th><th class="num">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>৳${Number(bill.subtotal || 0).toFixed(0)}</span></div>
      ${bill.serviceCharge > 0 ? `<div class="row"><span>Service Charge</span><span>৳${Number(bill.serviceCharge).toFixed(0)}</span></div>` : ""}
      ${bill.vatAmount > 0 ? `<div class="row"><span>VAT</span><span>৳${Number(bill.vatAmount).toFixed(0)}</span></div>` : ""}
      ${Number(bill.discount) > 0 ? `<div class="row"><span>Discount</span><span>-৳${Number(bill.discount).toFixed(0)}</span></div>` : ""}
      <div class="row total-row"><span>TOTAL (${payMethod})</span><span>৳${Number(bill.grandTotal || 0).toFixed(0)}</span></div>
      <div class="divider"></div>
      <div class="center muted">${user?.invoice_terms || "Powered by Urobili POS & ERP"}</div>
      `
    );
  }

  // Send Current Order to Cashier Billing Queue
  async function handleSendToCashierQueue() {
    if (cart.length === 0) {
      toast.error(lang === "bn" ? "কিউতে পাঠানোর জন্য খাবার যোগ করুন" : "Add items before sending to bill queue");
      return;
    }
    try {
      const tb = tables[selectedTable];
      const queued = await enqueueBillFn({
        data: {
          table: orderType === "dine_in" ? selectedTable : orderType.toUpperCase(),
          floor: tb?.floor || "Ground Floor",
          orderType,
          waiter: waiterName,
          guests: guestCount,
          items: cart,
          subtotal,
          serviceCharge,
          vatAmount,
          discount: discountAmount,
          grandTotal,
          paymentMethod,
        },
      });
      if (queued?.id) {
        setBillingQueue((prev) => [queued, ...prev]);
        toast.success(
          lang === "bn"
            ? `ক্যাশিয়ার বিলের কিউতে পাঠানো হয়েছে (${queued.queue_no})`
            : `Sent to Cashier Bill Queue (${queued.queue_no})!`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to enqueue bill");
    }
  }

  async function handlePrintQueuedBill(qBill: any) {
    printRestaurantBill(qBill);
    if (qBill.status === "queued") {
      setBillingQueue((prev) => prev.map((b) => (b.id === qBill.id ? { ...b, status: "printed" } : b)));
      try {
        await updateBillingQueueStatusFn({ data: { id: qBill.id, status: "printed" } });
      } catch (_) {}
    }
  }

  async function handlePassQueuedBill(qBill: any) {
    try {
      const saleId = qBill.id || `REST-${Date.now().toString().slice(-6)}`;
      const qItems = Array.isArray(qBill.items) ? qBill.items : [];
      await createSaleFn({
        data: {
          id: saleId,
          product_name: `${(qBill.orderType || "dine_in").toUpperCase()} - ${qBill.table} (${qItems.length} items)`,
          qty: qItems.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0),
          sell_price: Number(qBill.grandTotal) || 0,
          buy_price: qItems.reduce((acc: number, it: any) => acc + (Number(it.buy_price) || 0) * (Number(it.qty) || 1), 0),
          paid_amount: Number(qBill.grandTotal) || 0,
          due_amount: 0,
          type: qBill.paymentMethod || "cash",
          discount: Number(qBill.discount) || 0,
          notes: `Restaurant Queue [${qBill.queue_no || saleId}] Table: ${qBill.table}, Waiter: ${qBill.waiter}`,
          items: qItems,
          created_at: new Date().toISOString(),
        },
      });

      await updateBillingQueueStatusFn({
        data: { id: qBill.id, status: "passed", paymentMethod: qBill.paymentMethod || "cash" },
      });

      setBillingQueue((prev) => prev.map((b) => (b.id === qBill.id ? { ...b, status: "passed" } : b)));

      // Free the table if dine-in
      if (qBill.orderType === "dine_in" && qBill.table && tables[qBill.table]) {
        const cleared: TableState = {
          ...tables[qBill.table],
          status: "available",
          items: [],
          startTime: undefined,
        };
        setTables((prev) => ({ ...prev, [qBill.table]: cleared }));
        void upsertRestaurantTableFn({ data: cleared }).catch(() => {});
        if (selectedTable === qBill.table) setCart([]);
      }

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cashbox"] });
      toast.success(
        lang === "bn"
          ? `বিল ${qBill.queue_no || qBill.id} পাস ও সম্পন্ন হয়েছে!`
          : `Bill ${qBill.queue_no || qBill.id} passed & settled!`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to pass bill");
    }
  }

  async function handleCancelQueuedBill(qBillId: string) {
    setBillingQueue((prev) => prev.map((b) => (b.id === qBillId ? { ...b, status: "cancelled" } : b)));
    try {
      await updateBillingQueueStatusFn({ data: { id: qBillId, status: "cancelled" } });
      toast.success(lang === "bn" ? "বিল কিউ বাতিল হয়েছে" : "Queue ticket cancelled");
    } catch (_) {}
  }

  const pendingQueueCount = useMemo(
    () => billingQueue.filter((b) => b.status === "queued" || b.status === "printed").length,
    [billingQueue]
  );

  // Complete & Settle Bill
  async function handleSettleBill() {
    if (cart.length === 0) {
      toast.error(lang === "bn" ? "বিল করার জন্য খাবার যোগ করুন" : "Add items to complete bill");
      return;
    }

    setSettlingBusy(true);
    try {
      const saleId = `REST-${Date.now().toString().slice(-6)}`;
      const payload = {
        id: saleId,
        product_name: `${orderType.toUpperCase()} - ${orderType === "dine_in" ? selectedTable : "Counter"} (${cart.length} items)`,
        qty: cart.reduce((acc, it) => acc + it.qty, 0),
        sell_price: grandTotal,
        buy_price: cart.reduce((acc, it) => acc + (it.buy_price || 0) * it.qty, 0),
        paid_amount: grandTotal,
        due_amount: 0,
        type: paymentMethod,
        discount: discountAmount,
        notes: `Restaurant POS [${orderType.toUpperCase()}] Table: ${selectedTable}, Waiter: ${waiterName}, Guests: ${guestCount}`,
        items: cart,
        created_at: new Date().toISOString(),
      };

      await createSaleFn({ data: payload });

      // Free the table & persist to PostgreSQL
      if (orderType === "dine_in") {
        setTables((prev) => {
          const cleared: TableState = {
            ...prev[selectedTable],
            status: "available",
            items: [],
            startTime: undefined,
          };
          void upsertRestaurantTableFn({ data: cleared }).catch(() => {});
          return { ...prev, [selectedTable]: cleared };
        });
      }

      setSettledSale({
        ...payload,
        subtotal,
        serviceCharge,
        vatAmount,
        grandTotal,
        table: selectedTable,
        orderType,
        waiterName,
      });

      setCart([]);
      setReceiptModalOpen(true);
      toast.success(lang === "bn" ? "অর্ডার বিল সম্পন্ন ও পেমেন্ট গৃহীত হয়েছে!" : "Order settled successfully!");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cashbox"] });
    } catch (err: any) {
      toast.error(err?.message || "Settlement failed");
    } finally {
      setSettlingBusy(false);
    }
  }

  const totalCartCount = cart.reduce((acc, it) => acc + it.qty, 0);

  return (
    <div className="w-full min-h-[100dvh] md:min-h-[calc(100vh-64px)] flex flex-col bg-[#F9F9FB] md:bg-[#F8F6F0] dark:bg-zinc-950 select-none pb-20 md:pb-6">
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* MOBILE WAITER PHONE UI (Matches Restaurant Waiter App Mockup)            */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col flex-1 w-full">
        {/* Vibrant Orange Top Header (#FF9100) */}
        <header className="sticky top-0 z-40 w-full h-14 bg-[#FF9100] text-white px-4 flex items-center justify-between shadow-sm">
          <button
            type="button"
            onClick={() => setMobileTab("tables")}
            className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer"
          >
            <span>{orderType === "dine_in" ? selectedTable : orderType.toUpperCase()}</span>
          </button>

          <h1 className="text-lg font-bold tracking-tight">
            {mobileTab === "menu"
              ? (lang === "bn" ? "মেনু" : "Menu")
              : mobileTab === "tables"
                ? (lang === "bn" ? "টেবিল" : "Tables")
                : (lang === "bn" ? "প্রোফাইল" : "Profile")}
          </h1>

          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="relative p-1.5 rounded-full hover:bg-white/15 cursor-pointer"
            aria-label="Open Order Cart"
          >
            <ShoppingCart className="size-6 text-white" />
            {totalCartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#FF9100] text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {totalCartCount}
              </span>
            )}
          </button>
        </header>

        {/* PHONE TAB 1: MENU (Food Menu Boxes + Top Categories) */}
        {mobileTab === "menu" && (
          <div className="p-3.5 space-y-3.5 flex-1">
            {/* Search & Category Dropdown Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "bn" ? "খাবার খুঁজুন..." : "Search items..."}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9100]"
                />
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileCatOpen((prev) => !prev)}
                  className="h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center justify-between gap-2 min-w-[82px] cursor-pointer hover:border-[#FF9100]"
                >
                  <span>{selectedCategory === "All Dishes" ? "All" : selectedCategory.split(" ")[0]}</span>
                  <ChevronDown className={`size-3.5 text-slate-500 transition-transform ${mobileCatOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileCatOpen && (
                  <div className="absolute right-0 top-12 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg py-1">
                    {MENU_CATEGORIES.map((c) => {
                      const label = c === "All Dishes" ? "All" : c.split(" ")[0];
                      const active = selectedCategory === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c);
                            setMobileCatOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-orange-50 text-[#FF9100] dark:bg-orange-950/30"
                              : "text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Scrollable Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MENU_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const shortLabel = cat === "All Dishes" ? "All" : cat.split(" ")[0];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#FF9100] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>

            {/* 2-Column Food Menu Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredMenu.map((item) => {
                const inCartQty = cart.filter((c) => c.id === item.id).reduce((s, c) => s + c.qty, 0);
                const isImgUrl = typeof item.image === "string" && item.image.startsWith("http");
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm p-2.5 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 mb-2 flex items-center justify-center">
                        <span className="text-3xl select-none">{item.emoji || "🍽️"}</span>
                        {isImgUrl && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <h3 className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 line-clamp-2 min-h-[2.25rem] leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.category}
                      </p>
                      <div className="text-sm font-bold text-[#FF9100] mt-1">
                        ৳{Number(item.sell_price).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        addToCart(item);
                        toast.success(`${item.name} +1`, { duration: 1000 });
                      }}
                      className="w-full h-9 rounded-xl bg-[#FF9100] hover:bg-[#E67E00] active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="size-4 stroke-[2.5]" />
                      {inCartQty > 0 && <span className="text-xs font-extrabold">({inCartQty})</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHONE TAB 2: TABLES (Multi-Floor + Waiter Free/Occupy Controls) */}
        {mobileTab === "tables" && (
          <div className="p-3.5 space-y-3 flex-1">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-zinc-100 block">
                  {lang === "bn" ? "মাল্টি-ফ্লোর টেবিল নির্বাচন" : "Multi-Floor Table Manager"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {restaurantStats.freeTables} {lang === "bn" ? "ফ্রি" : "Free"} • {restaurantStats.occupiedTables}{" "}
                  {lang === "bn" ? "ব্যস্ত" : "Occupied"}
                </span>
              </div>
              <span className="text-[#FF9100] font-bold">{selectedTable}</span>
            </div>

            {/* Multi-Floor Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {["All Floors", ...floorNames].map((fl) => {
                const active = selectedFloor === fl;
                return (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-[#FF9100] text-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <Layers className="size-3.5" />
                    <span>{fl === "All Floors" && lang === "bn" ? "সব ফ্লোর" : fl}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredTables.map((tb) => {
                const isOccupied = tb.status === "occupied";
                const isSelected = selectedTable === tb.id && orderType === "dine_in";
                const tTotal = (tb.items || []).reduce((acc, it) => acc + it.price * it.qty, 0);
                return (
                  <div
                    key={tb.id}
                    onClick={() => {
                      setSelectedTable(tb.id);
                      setOrderType("dine_in");
                      setMobileTab("menu");
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[128px] cursor-pointer ${
                      isSelected
                        ? "border-[#FF9100] bg-[#FF9100]/10 ring-2 ring-[#FF9100]/30"
                        : isOccupied
                          ? "border-rose-200 bg-rose-50/70 dark:bg-rose-950/20"
                          : "border-slate-200 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">{tb.name}</span>
                        <span className={`size-2.5 rounded-full ${isOccupied ? "bg-rose-500" : "bg-emerald-500"}`} />
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {tb.floor || "Ground Floor"} • {tb.capacity || tb.guests} {lang === "bn" ? "সিট" : "Seats"}
                      </div>
                    </div>

                    {isOccupied ? (
                      <div className="text-xs font-bold text-rose-600 mt-1.5">
                        ৳ {tTotal} • {tb.items.length} items
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-600 mt-1.5">
                        {lang === "bn" ? "ফ্রি আছে" : "Free / Available"}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleTableFree(tb.id);
                      }}
                      className={`mt-2 w-full py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        isOccupied
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-rose-100 hover:text-rose-700"
                      }`}
                    >
                      {isOccupied
                        ? lang === "bn"
                          ? "✓ ফ্রি করুন"
                          : "✓ Mark Free"
                        : lang === "bn"
                          ? "অকুপাই করুন"
                          : "Mark Occupied"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHONE TAB 3: WAITER PROFILE */}
        {mobileTab === "profile" && (
          <div className="p-4 space-y-4 flex-1">
            <Card className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-[#FF9100]/15 text-[#FF9100] flex items-center justify-center font-bold text-lg">
                  {(user?.full_name || "W")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-base text-slate-900 dark:text-zinc-100">{user?.full_name || "Waiter / Staff"}</div>
                  <div className="text-xs text-slate-500">{user?.business_name || "Urobili Restaurant"} • {user?.role?.toUpperCase()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800">
                  <div className="text-[10px] text-slate-400">Active Table</div>
                  <div className="font-bold text-[#FF9100]">{selectedTable}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800">
                  <div className="text-[10px] text-slate-400">Kitchen Tickets</div>
                  <div className="font-bold text-slate-800 dark:text-zinc-100">{kdsOrders.length} KOTs</div>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                className="w-full h-11 rounded-xl justify-between px-4 text-xs font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Languages className="size-4 text-[#FF9100]" />
                  <span>{lang === "bn" ? "ভাষা পরিবর্তন (English)" : "Switch Language (বাংলা)"}</span>
                </span>
                <span className="uppercase font-bold text-[#FF9100]">{lang}</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await logout();
                  router.replace("/auth");
                }}
                className="w-full h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>{lang === "bn" ? "লগ আউট" : "Sign Out"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Fixed 3-Tab Waiter Bottom Navigation Bar (Menu | Tables | Profile) */}
        <nav className="fixed bottom-0 inset-x-0 z-50 h-16 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-3 shadow-lg">
          <button
            type="button"
            onClick={() => setMobileTab("menu")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
              mobileTab === "menu" ? "text-[#FF9100]" : "text-slate-400"
            }`}
          >
            <Utensils className="size-5" />
            <span>{lang === "bn" ? "মেনু" : "Menu"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("tables")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
              mobileTab === "tables" ? "text-[#FF9100]" : "text-slate-400"
            }`}
          >
            <Grid className="size-5" />
            <span>{lang === "bn" ? "টেবিল" : "Tables"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
              mobileTab === "profile" ? "text-[#FF9100]" : "text-slate-400"
            }`}
          >
            <User className="size-5" />
            <span>{lang === "bn" ? "প্রোফাইল" : "Profile"}</span>
          </button>
        </nav>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP RESTAURANT ERP VIEW                                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col flex-1">
      {/* ─── Top Control Header ─────────────────────────────────────────────────── */}
      <div className="w-full bg-white dark:bg-zinc-900 border-b border-[#E8DFD3] dark:border-zinc-800 p-3 sm:p-4 px-4 sm:px-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand / Title & Floor Plan Toggle */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#55A61D]/15 text-[#55A61D] flex items-center justify-center font-bold">
            <Utensils className="size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-serif text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
              <span>{lang === "bn" ? "রেস্তোরাঁ পিওএস ও ডাইনিং" : "Restaurant POS & Dining"}</span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-[#55A61D]/15 text-[#55A61D] font-bold uppercase tracking-wider">
                {lang === "bn" ? "লাইভ" : "Live"}
              </span>
            </h1>
            <p className="text-xs text-[#7A6F66] dark:text-zinc-400">
              {user?.business_name || "Urobili"} • {user?.tagline || "Smart Dining & Billing"}
            </p>
          </div>
        </div>

        {/* Center: Order Type Switcher (Dine-In, Takeaway, Delivery) */}
        <div className="flex items-center gap-1 bg-[#F2ECE4] dark:bg-zinc-800 p-1 rounded-2xl border border-[#E8DFD3] dark:border-zinc-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setOrderType("dine_in")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              orderType === "dine_in"
                ? "bg-white dark:bg-zinc-900 text-[#55A61D] font-bold shadow-xs border border-[#55A61D]/30"
                : "text-[#65594F] dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <Utensils className="size-3.5" />
            <span>{lang === "bn" ? "ডাইন-ইন" : "Dine-In"}</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("takeaway")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              orderType === "takeaway"
                ? "bg-white dark:bg-zinc-900 text-[#55A61D] font-bold shadow-xs border border-[#55A61D]/30"
                : "text-[#65594F] dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>{lang === "bn" ? "টেকঅ্যাওয়ে" : "Takeaway"}</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("delivery")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              orderType === "delivery"
                ? "bg-white dark:bg-zinc-900 text-[#55A61D] font-bold shadow-xs border border-[#55A61D]/30"
                : "text-[#65594F] dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <Truck className="size-3.5" />
            <span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
          </button>
        </div>

        {/* Right: View Switcher (Owner Dashboard vs Menu vs Tables vs KDS) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveView(activeView === "owner" ? "order" : "owner")}
              className={`h-10 px-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                activeView === "owner"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-zinc-800 border-[#E8DFD3] dark:border-zinc-700 text-[#2C241E] dark:text-zinc-200 hover:bg-[#FAF7F2]"
              }`}
            >
              <LayoutDashboard className={`size-4 ${activeView === "owner" ? "text-white" : "text-emerald-600"}`} />
              <span>{lang === "bn" ? "মালিক ড্যাশবোর্ড" : "Owner Dashboard"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveView(activeView === "queue" ? "order" : "queue")}
            className={`h-10 px-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              activeView === "queue"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-zinc-800 border-[#E8DFD3] dark:border-zinc-700 text-[#2C241E] dark:text-zinc-200 hover:bg-[#FAF7F2]"
            }`}
          >
            <ListOrdered className={`size-4 ${activeView === "queue" ? "text-white" : "text-indigo-600"}`} />
            <span>{lang === "bn" ? "বিল কিউ" : "Bill Queue"}</span>
            {pendingQueueCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeView === "queue" ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
              }`}>
                {pendingQueueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView(activeView === "kds" ? "order" : "kds")}
            className={`h-10 px-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              activeView === "kds"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-zinc-800 border-[#E8DFD3] dark:border-zinc-700 text-[#2C241E] dark:text-zinc-200 hover:bg-[#FAF7F2]"
            }`}
          >
            <ChefHat className={`size-4 ${activeView === "kds" ? "text-white" : "text-amber-500"}`} />
            <span>{lang === "bn" ? "কিচেন ডিসপ্লে" : "Kitchen Display"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView(activeView === "tables" ? "order" : "tables")}
            className={`h-10 px-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              activeView === "tables"
                ? "bg-[#55A61D] text-white border-[#55A61D]"
                : "bg-white dark:bg-zinc-800 border-[#E8DFD3] dark:border-zinc-700 text-[#2C241E] dark:text-zinc-200 hover:bg-[#FAF7F2]"
            }`}
          >
            {activeView === "tables" ? (
              <>
                <List className="size-4 text-white" />
                <span>{lang === "bn" ? "মেনু অর্ডারে যান" : "Back to Menu"}</span>
              </>
            ) : (
              <>
                <Grid className="size-4 text-[#55A61D]" />
                <span>
                  {lang === "bn"
                    ? `টেবিল ম্যাপ (${restaurantStats.totalTables})`
                    : `Floors & Tables (${restaurantStats.totalTables})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Main Content Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5">
        {activeView === "owner" && isOwner ? (
          <div className="col-span-12 space-y-5">
            {/* Owner Dashboard Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-[#E8DFD3] dark:border-zinc-800 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                  <LayoutDashboard className="size-5 text-emerald-600" />
                  <span>{lang === "bn" ? "রেস্তোরাঁ ইআরপি মালিক ড্যাশবোর্ড" : "Restaurant ERP Owner Dashboard"}</span>
                </h2>
                <p className="text-xs text-[#7A6F66] dark:text-zinc-400">
                  {lang === "bn"
                    ? "সকল ফ্লোর, টেবিল ক্যাপাসিটি, লাইভ বিক্রয় এবং কিচেন অপারেশন নিয়ন্ত্রণ করুন"
                    : "Manage multi-floor layout, set table seat capacities, and monitor live revenue & kitchen orders"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/employees")} className="rounded-xl text-xs gap-1.5 cursor-pointer">
                  <Users className="size-3.5" />
                  <span>{lang === "bn" ? "ওয়েটার ও স্টাফ" : "Staff & Waiters"}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/reports")} className="rounded-xl text-xs gap-1.5 cursor-pointer">
                  <TrendingUp className="size-3.5" />
                  <span>{lang === "bn" ? "রিপোর্ট" : "Reports"}</span>
                </Button>
                <Button size="sm" onClick={() => setActiveView("order")} className="rounded-xl text-xs bg-[#55A61D] hover:bg-[#489117] text-white cursor-pointer">
                  {lang === "bn" ? "POS মেনুতে যান" : "Open POS Menu"}
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-1 shadow-xs">
                <div className="text-xs font-semibold text-[#7A6F66] flex items-center justify-between">
                  <span>{lang === "bn" ? "আজকের বিক্রয়" : "Today's Revenue"}</span>
                  <DollarSign className="size-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-[#2C241E] dark:text-zinc-100">
                  ৳{restaurantStats.todayRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">
                  {restaurantStats.todayOrdersCount} {lang === "bn" ? "টি বিল সম্পন্ন" : "settled orders"}
                </div>
              </Card>

              <Card className="p-4 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-1 shadow-xs">
                <div className="text-xs font-semibold text-[#7A6F66] flex items-center justify-between">
                  <span>{lang === "bn" ? "আজকের নিট লাভ" : "Today's Est. Profit"}</span>
                  <TrendingUp className="size-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  ৳{restaurantStats.todayProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#7A6F66]">
                  {lang === "bn" ? "খাবার খরচ বাদে" : "After food cost"}
                </div>
              </Card>

              <Card className="p-4 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-1 shadow-xs">
                <div className="text-xs font-semibold text-[#7A6F66] flex items-center justify-between">
                  <span>{lang === "bn" ? "টেবিল অকুপেন্সি" : "Table Occupancy"}</span>
                  <Armchair className="size-4 text-orange-500" />
                </div>
                <div className="text-2xl font-black text-[#2C241E] dark:text-zinc-100">
                  {restaurantStats.occupiedTables} / {restaurantStats.totalTables}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">
                  {restaurantStats.freeTables} {lang === "bn" ? "টি টেবিল ফ্রি" : "tables free"} • {restaurantStats.totalCapacity} {lang === "bn" ? "মোট সিট" : "total seats"}
                </div>
              </Card>

              <Card className="p-4 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-1 shadow-xs">
                <div className="text-xs font-semibold text-[#7A6F66] flex items-center justify-between">
                  <span>{lang === "bn" ? "চলমান কিচেন KOT" : "Active Kitchen KOT"}</span>
                  <ChefHat className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600">
                  {restaurantStats.activeKds}
                </div>
                <div className="text-[11px] text-[#7A6F66]">
                  {floorNames.length} {lang === "bn" ? "টি ফ্লোর সক্রিয়" : "active floors"}
                </div>
              </Card>
            </div>

            {/* Floor Management + Add Table with Capacity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Floors Manager */}
              <Card className="lg:col-span-5 p-5 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600" />
                    <span>{lang === "bn" ? "ফ্লোর ম্যানেজমেন্ট (মাল্টি-ফ্লোর)" : "Floor Management (Multi-Floor)"}</span>
                  </h3>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                    placeholder={lang === "bn" ? "নতুন ফ্লোর (যেমন: 2nd Floor)" : "New floor name (e.g. 2nd Floor)"}
                    className="h-10 rounded-xl text-xs"
                  />
                  <Button onClick={handleAddFloor} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                    <Plus className="size-4 mr-1" />
                    {lang === "bn" ? "যোগ" : "Add"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {floors.map((fl) => {
                    const flTables = Object.values(tables).filter((t) => (t.floor || "Ground Floor") === fl.name);
                    const flOcc = flTables.filter((t) => t.status === "occupied").length;
                    const flCap = flTables.reduce((s, t) => s + (Number(t.capacity) || 4), 0);
                    return (
                      <div key={fl.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] dark:bg-zinc-800/60 border border-[#E8DFD3] dark:border-zinc-700">
                        <div>
                          <div className="font-bold text-xs text-[#2C241E] dark:text-zinc-100">{fl.name}</div>
                          <div className="text-[11px] text-[#7A6F66]">
                            {flTables.length} {lang === "bn" ? "টেবিল" : "tables"} ({flOcc} {lang === "bn" ? "ব্যস্ত" : "occupied"}) • {flCap} {lang === "bn" ? "সিট" : "seats"}
                          </div>
                        </div>
                        {floors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFloor(fl.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete Floor"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Right: Owner Table & Capacity Configurator */}
              <Card className="lg:col-span-7 p-5 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-bold text-sm text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                    <Settings2 className="size-4 text-orange-500" />
                    <span>{lang === "bn" ? "টেবিল ও সিট ক্যাপাসিটি সেটআপ" : "Tables & Seat Capacity Setup"}</span>
                  </h3>
                  <span className="text-[11px] text-[#7A6F66]">
                    {lang === "bn" ? "শুধুমাত্র মালিক ক্যাপাসিটি পরিবর্তন করতে পারবেন" : "Owner sets table seat capacities"}
                  </span>
                </div>

                {/* Add New Table Form */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-2xl bg-[#FAF7F2] dark:bg-zinc-800/60 border border-[#E8DFD3] dark:border-zinc-700">
                  <Input
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder={lang === "bn" ? "টেবিল নাম (যেমন: Table 15)" : "Table name (e.g. Table 15)"}
                    className="sm:col-span-4 h-9 rounded-xl text-xs bg-white dark:bg-zinc-900"
                  />
                  <select
                    value={newTableFloor}
                    onChange={(e) => setNewTableFloor(e.target.value)}
                    className="sm:col-span-4 h-9 px-2.5 rounded-xl border border-[#E8DFD3] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold"
                  >
                    {floorNames.map((fn) => (
                      <option key={fn} value={fn}>
                        {fn}
                      </option>
                    ))}
                  </select>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(Number(e.target.value) || 1)}
                      className="h-9 rounded-xl text-xs bg-white dark:bg-zinc-900"
                      title="Seat Capacity"
                    />
                  </div>
                  <Button
                    onClick={handleAddTable}
                    className="sm:col-span-2 h-9 rounded-xl bg-[#55A61D] hover:bg-[#489117] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" />
                    {lang === "bn" ? "যোগ" : "Add"}
                  </Button>
                </div>

                {/* Tables Capacity List */}
                <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                  {Object.values(tables).map((tb) => (
                    <div
                      key={tb.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-[#EFE7DE] dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`size-2.5 rounded-full shrink-0 ${tb.status === "occupied" ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <div className="truncate">
                          <span className="font-bold text-[#2C241E] dark:text-zinc-100">{tb.name}</span>
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {tb.floor || "Ground Floor"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#7A6F66]">{lang === "bn" ? "সিট:" : "Capacity:"}</span>
                        <div className="flex items-center border border-[#E8DFD3] dark:border-zinc-700 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateTableCapacity(tb.id, (tb.capacity || 4) - 1)}
                            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-1 font-bold text-[#2C241E] dark:text-zinc-100 min-w-[28px] text-center">
                            {tb.capacity || 4}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateTableCapacity(tb.id, (tb.capacity || 4) + 1)}
                            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTable(tb.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Table"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        ) : activeView === "queue" ? (
          <div className="col-span-12 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-[#E8DFD3] dark:border-zinc-800 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                  <ListOrdered className="size-5 text-indigo-600" />
                  <span>{lang === "bn" ? "ক্যাশিয়ার বিলিং কিউ সিস্টেম" : "Cashier Billing Queue"}</span>
                </h2>
                <p className="text-xs text-[#7A6F66] dark:text-zinc-400">
                  {lang === "bn"
                    ? "ওয়েটার বা ক্যাশিয়ারের পাঠানো বিলের অর্ডার প্রিন্ট ও পাস করে নিষ্পত্তি করুন"
                    : "Print restaurant bills and pass queued orders to complete payment and free tables"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveView("order")} className="rounded-xl text-xs cursor-pointer">
                {lang === "bn" ? "মেনুতে ফিরুন" : "Back to POS"}
              </Button>
            </div>

            {billingQueue.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 text-xs text-muted-foreground">
                {lang === "bn"
                  ? "এখনো কোনো বিল কিউতে পাঠানো হয়নি। অর্ডার থেকে 'বিল কিউতে পাঠান' বাটনে ক্লিক করুন।"
                  : "No bills in queue yet. Click 'Send to Queue' on any order to queue it for the cashier."}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {billingQueue.map((qb) => {
                  const isDone = qb.status === "passed" || qb.status === "cancelled";
                  return (
                    <Card
                      key={qb.id}
                      className={`p-4 rounded-3xl border space-y-3 flex flex-col justify-between shadow-sm ${
                        qb.status === "passed"
                          ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 opacity-75"
                          : qb.status === "cancelled"
                            ? "border-zinc-200 bg-zinc-50 dark:bg-zinc-900 opacity-60"
                            : "border-[#E8DFD3] bg-white dark:bg-zinc-900"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-extrabold text-xs">
                              {qb.queue_no || "Q"}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-[#2C241E] dark:text-zinc-100">
                                {qb.table} {qb.floor ? `• ${qb.floor}` : ""}
                              </div>
                              <div className="text-[10px] text-[#8C8074]">
                                {qb.id} • {qb.waiter || "Staff"}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              qb.status === "passed"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : qb.status === "printed"
                                  ? "bg-amber-500/15 text-amber-700"
                                  : qb.status === "cancelled"
                                    ? "bg-zinc-200 text-zinc-600"
                                    : "bg-indigo-500/15 text-indigo-700"
                            }`}
                          >
                            {qb.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                          {(qb.items || []).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                <span className="font-bold mr-1">{it.qty}x</span>
                                {it.name}
                              </span>
                              <span className="font-semibold">৳{Number(it.price) * Number(it.qty)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-dashed border-[#E8DFD3] flex items-center justify-between text-xs font-bold">
                          <span>{lang === "bn" ? "সর্বমোট বিল" : "Grand Total"}</span>
                          <span className="text-base text-[#55A61D]">৳{Number(qb.grandTotal || 0).toFixed(0)}</span>
                        </div>
                      </div>

                      {!isDone && (
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#EFE7DE]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintQueuedBill(qb)}
                            className="h-9 text-[11px] rounded-xl font-bold gap-1 cursor-pointer"
                          >
                            <Printer className="size-3.5" />
                            <span>{lang === "bn" ? "প্রিন্ট" : "Print"}</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePassQueuedBill(qb)}
                            className="h-9 text-[11px] rounded-xl font-bold bg-[#55A61D] hover:bg-[#489117] text-white gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>{lang === "bn" ? "পাস ও বিল" : "Pass Bill"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelQueuedBill(qb.id)}
                            className="h-9 text-[11px] rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            {lang === "bn" ? "বাতিল" : "Cancel"}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeView === "kds" ? (
          <div className="col-span-12 space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-[#E8DFD3] dark:border-zinc-800 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                  <ChefHat className="size-5 text-amber-500" />
                  <span>{lang === "bn" ? "লাইভ কিচেন ডিসপ্লে সিস্টেম (KDS)" : "Live Kitchen Display System (KDS)"}</span>
                </h2>
                <p className="text-xs text-[#7A6F66] dark:text-zinc-400">
                  {lang === "bn" ? "অর্ডারের অবস্থা পরিবর্তন করুন: পেন্ডিং → রান্না হচ্ছে → প্রস্তুত → পরিবেশিত" : "Track and advance live kitchen tickets from Pending → Preparing → Ready → Served"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveView("order")} className="rounded-xl text-xs">
                {lang === "bn" ? "মেনুতে ফিরুন" : "Back to Menu"}
              </Button>
            </div>

            {kdsOrders.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 text-xs text-muted-foreground">
                {lang === "bn" ? "এখনো কোনো কিচেন অর্ডার (KOT) পাঠানো হয়নি।" : "No active Kitchen Order Tickets (KOT) yet. Send an order from the menu to see it here."}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {kdsOrders.map((ord) => (
                  <Card key={ord.id} className="p-4 rounded-3xl border-[#E8DFD3] bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between shadow-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
                        <div>
                          <div className="font-bold text-sm text-[#2C241E] dark:text-zinc-100">{ord.table}</div>
                          <div className="text-[10px] text-[#8C8074]">{ord.id} • {ord.waiter}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.status === "ready" ? "bg-emerald-500/15 text-emerald-600" :
                          ord.status === "preparing" ? "bg-amber-500/15 text-amber-600" :
                          ord.status === "served" ? "bg-zinc-200 text-zinc-600" :
                          "bg-rose-500/15 text-rose-600"
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {(ord.items || []).map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-start">
                            <div>
                              <span className="font-bold mr-1.5">{it.qty}x</span>
                              <span>{it.name}</span>
                              {it.notes && <div className="text-[10px] text-amber-600 italic">Note: {it.notes}</div>}
                            </div>
                            <span className="text-[10px] text-zinc-500">{it.spice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#EFE7DE]">
                      <Button size="sm" variant="outline" onClick={() => handleKdsStatusChange(ord.id, "preparing")} className="h-8 text-[10px] rounded-xl cursor-pointer">
                        Cook
                      </Button>
                      <Button size="sm" onClick={() => handleKdsStatusChange(ord.id, "ready")} className="h-8 text-[10px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer">
                        Ready
                      </Button>
                      <Button size="sm" onClick={() => handleKdsStatusChange(ord.id, "served")} className="h-8 text-[10px] rounded-xl bg-[#55A61D] hover:bg-[#489117] text-white cursor-pointer">
                        Served
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : activeView === "tables" ? (
          <div className="col-span-12 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-[#E8DFD3] dark:border-zinc-800 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-[#2C241E] dark:text-zinc-100 flex items-center gap-2">
                  <Grid className="size-5 text-[#55A61D]" />
                  <span>{lang === "bn" ? "মাল্টি-ফ্লোর টেবিল অবস্থা" : "Multi-Floor Plan & Table Status"}</span>
                </h2>
                <p className="text-xs text-[#7A6F66] dark:text-zinc-400">
                  {lang === "bn"
                    ? "টেবিল নির্বাচন করে অর্ডার নিন অথবা ওয়েটার হিসেবে টেবিল ফ্রি করুন"
                    : "Select any table to take orders or mark tables Free / Occupied"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {["All Floors", ...floorNames].map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedFloor === fl
                        ? "bg-[#55A61D] text-white shadow-xs"
                        : "bg-[#FAF7F2] dark:bg-zinc-800 text-[#65594F] dark:text-zinc-300 border border-[#E8DFD3] dark:border-zinc-700"
                    }`}
                  >
                    <Layers className="size-3.5" />
                    <span>{fl === "All Floors" && lang === "bn" ? "সব ফ্লোর" : fl}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="size-3 rounded-full bg-emerald-500" />
                  <span>{lang === "bn" ? "ফ্রি টেবিল" : "Free"} ({restaurantStats.freeTables})</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                  <span className="size-3 rounded-full bg-rose-500 animate-pulse" />
                  <span>{lang === "bn" ? "ব্যস্ত" : "Occupied"} ({restaurantStats.occupiedTables})</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredTables.map((t) => {
                const isOccupied = t.status === "occupied";
                const isCurrent = selectedTable === t.id && orderType === "dine_in";
                const tableTotal = (t.items || []).reduce((acc, it) => acc + it.price * it.qty, 0);

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTable(t.id)}
                    className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[160px] shadow-sm relative overflow-hidden group ${
                      isCurrent
                        ? "ring-2 ring-[#55A61D] border-[#55A61D] bg-[#55A61D]/5"
                        : isOccupied
                          ? "bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-400"
                          : "bg-white dark:bg-zinc-900 border-[#E8DFD3] dark:border-zinc-800 hover:border-[#55A61D]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-serif font-bold text-base text-[#2C241E] dark:text-zinc-100">
                          {t.name}
                        </span>
                        <span
                          className={`size-2.5 rounded-full ${
                            isOccupied ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                      <div className="text-[10px] text-[#8C8074] font-medium mt-0.5">
                        {t.floor || "Ground Floor"}
                      </div>
                    </div>

                    <div className="my-auto py-2">
                      {isOccupied ? (
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            ৳ {tableTotal}
                          </div>
                          <div className="text-[11px] text-[#7A6F66] dark:text-zinc-400 flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{t.startTime || "Running"}</span>
                          </div>
                          <div className="text-[10px] text-[#8C8074]">
                            {t.items.length} items ordered
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {lang === "bn" ? "ফ্রি রয়েছে" : "Free / Available"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#E8DFD3]/60 dark:border-zinc-800">
                      <div className="text-[10px] text-[#8C8074] flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          <span>{t.capacity || t.guests} Seats</span>
                        </span>
                        <span className="text-[#55A61D] font-bold group-hover:underline">
                          Order →
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleTableFree(t.id);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                          isOccupied
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-rose-100 hover:text-rose-700"
                        }`}
                      >
                        {isOccupied
                          ? lang === "bn"
                            ? "✓ টেবিল ফ্রি করুন"
                            : "✓ Mark Table Free"
                          : lang === "bn"
                            ? "অকুপাই করুন"
                            : "Mark Occupied"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════ */
          /* VIEW B: FOOD MENU & LIVE ORDERING                                   */
          /* ══════════════════════════════════════════════════════════════════════ */
          <>
            {/* Left 7-8 Cols: Menu Grid */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Search & Table Info Pill */}
              <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-3xl border border-[#E8DFD3] dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="size-4 text-[#A4988E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === "bn" ? "খাবারের নাম বা কোড লিখুন..." : "Search menu items..."}
                    className="w-full h-10 pl-10 pr-4 rounded-2xl bg-[#F8F6F0] dark:bg-zinc-800 border-none text-xs sm:text-sm text-[#2C241E] dark:text-zinc-100 placeholder:text-[#A4988E] focus:outline-none focus:ring-2 focus:ring-[#55A61D]"
                  />
                </div>

                {orderType === "dine_in" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#65594F] dark:text-zinc-400">
                      {lang === "bn" ? "টেবিল:" : "Table:"}
                    </span>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="h-10 px-3 rounded-xl bg-[#F2ECE4] dark:bg-zinc-800 font-bold text-[#2C241E] dark:text-zinc-100 border border-[#E8DFD3] text-xs focus:outline-none"
                    >
                      {Object.keys(tables).map((tKey) => (
                        <option key={tKey} value={tKey}>
                          {tKey} {tables[tKey].status === "occupied" ? "• (Dining)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {MENU_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#FF6B00] text-white shadow-sm font-bold"
                          : "bg-white dark:bg-zinc-900 border border-[#E8DFD3] dark:border-zinc-800 text-[#65594F] dark:text-zinc-400 hover:border-[#55A61D]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* RestroBit Action Bar & Stock Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleNewOrder}
                    className="h-8 px-3 rounded-xl bg-[#FF6B00] hover:bg-[#E55F00] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>{lang === "bn" ? "নতুন অর্ডার" : "New"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="h-8 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-orange-50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="size-3.5 text-[#FF6B00]" />
                    <span>{lang === "bn" ? "কিউআর অর্ডার" : "QR Menu Orders"}</span>
                    {qrOrders.filter((q) => q.status === "incoming").length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#FF6B00] text-white text-[10px] font-bold">
                        {qrOrders.filter((q) => q.status === "incoming").length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftsModalOpen(true)}
                    className="h-8 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-orange-50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="size-3.5 text-slate-500" />
                    <span>{lang === "bn" ? "ড্রাফট তালিকা" : "Draft List"}</span>
                    {draftOrders.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                        {draftOrders.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReservationsModalOpen(true)}
                    className="h-8 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-orange-50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="size-3.5 text-emerald-600" />
                    <span>{lang === "bn" ? "রিজার্ভেশন" : "Reservations"}</span>
                    {reservations.filter((r) => r.status === "reserved").length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        {reservations.filter((r) => r.status === "reserved").length}
                      </span>
                    )}
                  </button>
                </div>

                <select
                  value={kitchenFilter}
                  onChange={(e) => setKitchenFilter(e.target.value as any)}
                  className="h-8 px-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="all">{lang === "bn" ? "সব আইটেম" : "All Menu Items"}</option>
                  <option value="kitchen">{lang === "bn" ? "তাজা খাবার (স্টকবিহীন)" : "Fresh Kitchen Dishes"}</option>
                  <option value="tracked_drinks">{lang === "bn" ? "প্যাকেট পানীয় (স্টকসহ)" : "Stock-Tracked Drinks"}</option>
                </select>
              </div>

              {/* Menu Item Cards Grid (RestroBit 4-Col Crisp Card Layout) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredMenu.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-[#FF6B00]/60 transition-all flex flex-col justify-between gap-2.5 group cursor-pointer"
                    >
                      <div className="relative h-24 w-full rounded-xl bg-orange-50/60 dark:bg-zinc-800/80 flex items-center justify-center overflow-hidden">
                        {typeof item.image === "string" && item.image.startsWith("http") ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-3xl">{item.image || "🍽️"}</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomizingItem(item);
                            setItemNotes("");
                            setItemSpice("Medium");
                          }}
                          title={lang === "bn" ? "নোট বা ঝাল ঠিক করুন" : "Customize spice & notes"}
                          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-slate-200/70 text-[10px] font-semibold text-slate-600 hover:text-[#FF6B00] flex items-center gap-0.5 cursor-pointer"
                        >
                          <Flame className="size-2.5 text-amber-500" />
                          <span>{lang === "bn" ? "নোট" : "Custom"}</span>
                        </button>
                        {item.track_stock === true && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg bg-sky-600/90 text-white text-[10px] font-bold shadow-xs">
                            {item.stock ?? 0} {lang === "bn" ? "টি" : "pcs"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 line-clamp-1 leading-tight">
                          {item.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-sm text-[#FF6B00]">
                          ৳ {item.sell_price}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          aria-label={`Add ${item.name}`}
                          className="size-7 rounded-full bg-[#FF6B00] hover:bg-[#E55F00] active:scale-95 text-white font-bold transition-all flex items-center justify-center shadow-xs cursor-pointer"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4-5 Cols: RestroBit Order #XX Panel & Instant Billing */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4">
              <div className="sticky top-20 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-lg p-4 space-y-3.5">
                {/* Search in existing order */}
                <div className="relative">
                  <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={existingSearch}
                    onChange={(e) => setExistingSearch(e.target.value)}
                    placeholder={lang === "bn" ? "অর্ডার আইটেম খুঁজুন..." : "Search in Existing order"}
                    className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs outline-none focus:border-[#FF6B00]"
                  />
                </div>

                {/* Dining Mode & Table Selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="dine_in">{lang === "bn" ? "ডাইন-ইন" : "Dine-In"}</option>
                    <option value="takeaway">{lang === "bn" ? "টেকঅ্যাওয়ে" : "Takeaway"}</option>
                    <option value="delivery">{lang === "bn" ? "ডেলিভারি" : "Delivery"}</option>
                  </select>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    disabled={orderType !== "dine_in"}
                    className="h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 disabled:opacity-50 cursor-pointer"
                  >
                    {Object.values(tables).map((tb) => (
                      <option key={tb.id} value={tb.id}>
                        {tb.name} ({tb.capacity} seats • {tb.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cart Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#FF6B00] flex items-center justify-center">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        {lang === "bn" ? `অর্ডার #${orderSeq}` : `Order #${orderSeq}`}
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        {orderType === "dine_in" ? selectedTable : orderType.toUpperCase()} • {cart.length}{" "}
                        {lang === "bn" ? "আইটেম" : "items"}
                      </span>
                    </div>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleNewOrder}
                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      {lang === "bn" ? "সব মুছুন" : "Clear"}
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div className="max-h-[290px] overflow-y-auto space-y-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                      <Utensils className="size-8 mx-auto opacity-30 text-[#FF6B00]" />
                      <p>{lang === "bn" ? "কোনো খাবার যোগ করা হয়নি" : "No items added to this order"}</p>
                    </div>
                  ) : (
                    cart
                      .map((item, idx) => ({ item, idx }))
                      .filter(
                        ({ item }) =>
                          !existingSearch.trim() ||
                          item.name.toLowerCase().includes(existingSearch.trim().toLowerCase())
                      )
                      .map(({ item, idx }) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">
                                {item.name}
                              </h4>
                              <div className="text-[11px] font-semibold text-[#FF6B00] mt-0.5">
                                ৳ {item.price} × {item.qty} ={" "}
                                <span className="text-slate-900 dark:text-zinc-100 font-bold">
                                  ৳ {item.price * item.qty}
                                </span>
                                {item.spice && item.spice !== "Medium" && (
                                  <span className="ml-1.5 text-[10px] text-amber-600">({item.spice})</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(idx)}
                              className="size-6 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {/* Qty Stepper */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 rounded-lg px-1.5 py-0.5 border border-slate-200 dark:border-zinc-700">
                              <button
                                type="button"
                                onClick={() => updateQty(idx, -1)}
                                className="size-5 rounded-md bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-rose-100 text-slate-700 dark:text-zinc-200 cursor-pointer"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="font-bold text-xs px-1 min-w-[16px] text-center">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(idx, 1)}
                                className="size-5 rounded-full bg-[#FF6B00] text-white flex items-center justify-center hover:bg-[#E55F00] cursor-pointer"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (editingNoteIdx === idx) {
                                  setEditingNoteIdx(null);
                                } else {
                                  setEditingNoteIdx(idx);
                                  setEditingNoteText(item.notes || "");
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 hover:border-[#FF6B00] flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="size-3 text-slate-400" />
                              <span>
                                {item.notes
                                  ? item.notes
                                  : lang === "bn"
                                    ? "নোট যোগ"
                                    : "Add Notes"}
                              </span>
                            </button>
                          </div>

                          {editingNoteIdx === idx && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                placeholder={lang === "bn" ? "রান্নার নির্দেশ লিখুন..." : "Kitchen note (e.g. Less spicy)"}
                                className="flex-1 h-7 px-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveCartItemNote(idx, editingNoteText)}
                                className="h-7 px-2.5 rounded-lg bg-[#FF6B00] text-white text-[11px] font-bold cursor-pointer"
                              >
                                {lang === "bn" ? "সেভ" : "Save"}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

                {/* Editable Discounts Strip (Product / Extra / Coupon) */}
                {cart.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px]">
                    <label className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-1.5 border border-slate-100 dark:border-zinc-700/60">
                      <span className="block text-[10px] text-slate-400">
                        {lang === "bn" ? "আইটেম ছাড়" : "Product Disc."}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={productDiscount || ""}
                        onChange={(e) => setProductDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full bg-transparent font-bold text-slate-800 dark:text-zinc-100 outline-none text-xs"
                      />
                    </label>
                    <label className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-1.5 border border-slate-100 dark:border-zinc-700/60">
                      <span className="block text-[10px] text-slate-400">
                        {lang === "bn" ? "অতিরিক্ত ছাড়" : "Extra Disc."}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={extraDiscount || ""}
                        onChange={(e) => setExtraDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full bg-transparent font-bold text-slate-800 dark:text-zinc-100 outline-none text-xs"
                      />
                    </label>
                    <label className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-1.5 border border-slate-100 dark:border-zinc-700/60">
                      <span className="block text-[10px] text-slate-400">
                        {lang === "bn" ? "কুপন ছাড়" : "Coupon Disc."}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={couponDiscount || ""}
                        onChange={(e) => setCouponDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full bg-transparent font-bold text-slate-800 dark:text-zinc-100 outline-none text-xs"
                      />
                    </label>
                  </div>
                )}

                {/* Bill Summary */}
                {cart.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-[#E8DFD3] dark:border-zinc-800 text-xs text-[#65594F] dark:text-zinc-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[#2C241E] dark:text-zinc-100">৳ {subtotal}</span>
                    </div>

                    {orderType === "dine_in" && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <span>Service Charge</span>
                          <span className="text-[10px] text-[#8C8074]">({serviceChargeRate}%)</span>
                        </span>
                        <span className="font-semibold text-[#2C241E] dark:text-zinc-100">৳ {serviceCharge}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <span>VAT / Tax</span>
                        <span className="text-[10px] text-[#8C8074]">({vatRate}%)</span>
                      </span>
                      <span className="font-semibold text-[#2C241E] dark:text-zinc-100">৳ {vatAmount}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Discount</span>
                        <span>- ৳ {discountAmount}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-zinc-800 text-base font-bold text-slate-900 dark:text-zinc-100">
                      <span>Grand Total</span>
                      <span className="text-[#FF6B00]">৳ {grandTotal}</span>
                    </div>
                  </div>
                )}

                {/* Payment Method Selector */}
                {cart.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {(["cash", "card", "bkash", "nagad"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 rounded-xl border text-[11px] font-bold capitalize transition-all cursor-pointer ${
                          paymentMethod === method
                            ? "bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs"
                            : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-[#FF6B00]"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                )}

                {/* Bottom Action Buttons (RestroBit 4-Button Workflow: KOT & Print, Draft, Bill & Queue, Bill & Print) */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        void handleSendKOT();
                        if (cart.length > 0) {
                          printRestaurantKot({
                            table: selectedTable,
                            orderType,
                            waiter: waiterName,
                            items: cart,
                          });
                        }
                      }}
                      disabled={cart.length === 0}
                      className="col-span-2 h-10 rounded-xl bg-[#111827] hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                    >
                      <ChefHat className="size-4" />
                      <span>{lang === "bn" ? "কেওটি ও প্রিন্ট" : "KOT & Print"}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={cart.length === 0}
                      className="col-span-1 h-10 rounded-xl border-slate-200 dark:border-zinc-700 font-bold text-xs gap-1 cursor-pointer"
                    >
                      <FileText className="size-3.5" />
                      <span>{lang === "bn" ? "ড্রাফট" : "Draft"}</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={handleSendToCashierQueue}
                      disabled={cart.length === 0}
                      className="h-10 rounded-xl bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>{lang === "bn" ? "বিল ও কিউ" : "Bill & Queue"}</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        pendingAutoPrintRef.current = true;
                        void handleSettleBill();
                      }}
                      disabled={cart.length === 0 || settlingBusy}
                      className="h-10 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-1.5 shadow-md cursor-pointer"
                    >
                      {settlingBusy ? <RefreshCw className="size-4 animate-spin" /> : <Printer className="size-4" />}
                      <span>{lang === "bn" ? "বিল ও প্রিন্ট" : "Bill & Print"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      </div>

      {/* ─── MOBILE WAITER CART & KOT DIALOG ───────────────────────────────────── */}
      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between pr-8">
              <span>{orderType === "dine_in" ? selectedTable : "Takeaway Order"}</span>
              <span className="text-[#FF9100]">৳ {grandTotal}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-[45vh] overflow-y-auto my-2">
            {cart.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No items added yet.</p>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="text-[11px] text-[#FF9100] font-semibold">৳ {item.price} × {item.qty}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => updateQty(idx, -1)} className="size-7 rounded-lg bg-white border flex items-center justify-center">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="font-bold w-5 text-center">{item.qty}</span>
                    <button type="button" onClick={() => updateQty(idx, 1)} className="size-7 rounded-lg bg-[#FF9100] text-white flex items-center justify-center">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-2 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between"><span>Subtotal</span><span>৳ {subtotal}</span></div>
              {orderType === "dine_in" && <div className="flex justify-between"><span>Service Charge ({serviceChargeRate}%)</span><span>৳ {serviceCharge}</span></div>}
              <div className="flex justify-between"><span>VAT ({vatRate}%)</span><span>৳ {vatAmount}</span></div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t"><span>Total</span><span className="text-[#FF9100]">৳ {grandTotal}</span></div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-3 gap-2 pt-2">
            <Button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                setMobileCartOpen(false);
                void handleSendKOT();
              }}
              className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2"
            >
              <ChefHat className="size-3.5 mr-1" />
              {lang === "bn" ? "কেওটি" : "KOT"}
            </Button>
            <Button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                setMobileCartOpen(false);
                void handleSendToCashierQueue();
              }}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2"
            >
              <Send className="size-3.5 mr-1" />
              {lang === "bn" ? "কিউতে দিন" : "To Queue"}
            </Button>
            <Button
              type="button"
              disabled={cart.length === 0 || settlingBusy}
              onClick={() => {
                setMobileCartOpen(false);
                void handleSettleBill();
              }}
              className="h-10 rounded-xl bg-[#FF9100] hover:bg-[#E67E00] text-white font-bold text-xs px-2"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              {lang === "bn" ? "বিল করুন" : "Settle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── KITCHEN ORDER TICKET (KOT) MODAL ──────────────────────────────────── */}
      <Dialog open={kotModalOpen} onOpenChange={setKotModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white text-zinc-900 border border-zinc-200">
          <DialogHeader className="text-center space-y-1">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center font-bold">
              <ChefHat className="size-6" />
            </div>
            <DialogTitle className="text-lg font-bold font-serif">KITCHEN ORDER TICKET (KOT)</DialogTitle>
            <p className="text-xs text-zinc-500">
              {orderType.toUpperCase()} • {selectedTable} • Waiter: {waiterName}
            </p>
          </DialogHeader>

          <div className="border-t border-dashed border-zinc-300 py-3 my-2 space-y-2 text-xs">
            <div className="text-[11px] text-zinc-400 flex justify-between">
              <span>Time: {new Date().toLocaleTimeString()}</span>
              <span>Ticket #: {Date.now().toString().slice(-4)}</span>
            </div>
            <div className="space-y-2 pt-2">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between items-start font-medium text-xs">
                  <div>
                    <span className="font-bold text-sm text-zinc-900 mr-2">{item.qty}x</span>
                    <span>{item.name}</span>
                    {item.notes && <div className="text-[10px] text-amber-700 italic">Note: {item.notes}</div>}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500">{item.spice}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setKotModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                printRestaurantKot({
                  table: selectedTable,
                  orderType,
                  waiter: waiterName,
                  items: cart,
                });
                setKotModalOpen(false);
              }}
              className="flex-1 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <Printer className="size-4 mr-1" />
              <span>{lang === "bn" ? "কেওটি প্রিন্ট" : "Print Slip"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SETTLED BILL RECEIPT MODAL ────────────────────────────────────────── */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white text-zinc-900 border border-zinc-200">
          <DialogHeader className="text-center space-y-1">
            <div className="size-11 rounded-2xl bg-[#55A61D]/15 text-[#55A61D] mx-auto flex items-center justify-center font-bold">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-lg font-bold font-serif text-[#2C241E]">
              {user?.business_name || "Urobili Restaurant"}
            </DialogTitle>
            <p className="text-xs text-zinc-500">
              {user?.tagline || "Thank you for dining with us!"}
            </p>
          </DialogHeader>

          {settledSale && (
            <div className="border-t border-b border-dashed border-zinc-300 py-3 my-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px] text-zinc-500 pb-1 border-b border-zinc-100">
                <span>Table: {settledSale.table}</span>
                <span>Bill #: {settledSale.id}</span>
              </div>
              <div className="space-y-1 pt-1">
                {settledSale.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{it.qty}x {it.name}</span>
                    <span className="font-semibold">৳ {it.price * it.qty}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span>৳ {settledSale.subtotal}</span>
                </div>
                {settledSale.serviceCharge > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Service Charge (5%):</span>
                    <span>৳ {settledSale.serviceCharge}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>VAT (5%):</span>
                  <span>৳ {settledSale.vatAmount}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#55A61D] pt-1 border-t">
                  <span>Total Paid ({settledSale.type?.toUpperCase()}):</span>
                  <span>৳ {settledSale.grandTotal}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceiptModalOpen(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Done
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (settledSale) {
                  printRestaurantBill({
                    ...settledSale,
                    floor: tables[settledSale.table]?.floor,
                  });
                }
                setReceiptModalOpen(false);
              }}
              className="flex-1 rounded-xl text-xs font-bold bg-[#55A61D] hover:bg-[#489117] text-white cursor-pointer"
            >
              <Printer className="size-4 mr-1" />
              <span>{lang === "bn" ? "বিল প্রিন্ট" : "Print Bill"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CUSTOMIZE ITEM & ADD-ONS MODAL ────────────────────────────────────── */}
      <Dialog open={!!customizingItem} onOpenChange={() => setCustomizingItem(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-5 sm:p-6 bg-white text-zinc-900 border border-zinc-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold font-serif">
              Customize: {customizingItem?.name}
            </DialogTitle>
            <p className="text-xs text-zinc-500">Add cooking instructions or spice preference</p>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 block">Spice Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Mild", "Medium", "Hot"] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setItemSpice(sp)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      itemSpice === sp
                        ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600"
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 block">Special Kitchen Notes</label>
              <Input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="e.g. Less oil, no onion, extra crispy"
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomizingItem(null)}
              className="flex-1 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (customizingItem) {
                  addToCart(customizingItem, itemNotes, itemSpice);
                  setCustomizingItem(null);
                }
              }}
              className="flex-1 rounded-xl text-xs font-bold bg-[#FF6B00] hover:bg-[#E55F00] text-white"
            >
              Add with Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DRAFT ORDERS LIST MODAL ───────────────────────────────────────────── */}
      <Dialog open={draftsModalOpen} onOpenChange={setDraftsModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-[#FF6B00]" />
              <span>{lang === "bn" ? "ড্রাফট অর্ডার তালিকা" : "Saved Draft Orders"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto py-2">
            {draftOrders.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                {lang === "bn" ? "কোনো ড্রাফট সেভ করা নেই।" : "No draft bills saved yet."}
              </p>
            ) : (
              draftOrders.map((d) => {
                const dTotal = d.items.reduce((s, it) => s + it.price * it.qty, 0);
                return (
                  <div key={d.id} className="p-3 rounded-2xl border border-border bg-muted/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs">{d.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.items.length} items • ৳ {dTotal} • Saved at {d.createdAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" onClick={() => handleLoadDraft(d)} className="h-8 rounded-xl bg-[#FF6B00] hover:bg-[#E55F00] text-white text-xs font-bold cursor-pointer">
                        {lang === "bn" ? "লোড করুন" : "Resume"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(d.id)}
                        className="size-8 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── QR MENU ORDERS MODAL ──────────────────────────────────────────────── */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="size-4 text-[#FF6B00]" />
              <span>{lang === "bn" ? "কিউআর মেনু অর্ডার" : "QR Menu Orders & Table Link"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1 text-xs">
            <div className="p-3 rounded-2xl bg-orange-50/70 dark:bg-zinc-800 border border-orange-200/70 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-zinc-100">
                  {lang === "bn" ? "টেবিল কিউআর লিংক ও ডেমো" : "Table QR Link & Quick Test"}
                </span>
                <select
                  value={qrSelectedTable}
                  onChange={(e) => setQrSelectedTable(e.target.value)}
                  className="h-8 px-2 rounded-xl border bg-white dark:bg-zinc-900 text-xs font-semibold"
                >
                  {Object.values(tables).map((tb) => (
                    <option key={tb.id} value={tb.id}>{tb.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/restaurant?table=${encodeURIComponent(qrSelectedTable)}&qr=1` : `/restaurant?table=${encodeURIComponent(qrSelectedTable)}`}
                  className="h-8 rounded-xl text-[11px] bg-white dark:bg-zinc-900"
                />
                <Button size="sm" onClick={handleSimulateQrOrder} className="h-8 rounded-xl bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold text-[11px] shrink-0 cursor-pointer">
                  {lang === "bn" ? "+ ডেমো অর্ডার" : "+ Incoming Test"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[42vh] overflow-y-auto">
              {qrOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  {lang === "bn" ? "এখনো কোনো QR অর্ডার আসেনি।" : "No incoming QR orders right now."}
                </p>
              ) : (
                qrOrders.map((q) => (
                  <div key={q.id} className="p-3 rounded-2xl border border-border flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{q.id} • {q.table}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${q.status === "incoming" ? "bg-[#FF6B00]/15 text-[#FF6B00]" : "bg-emerald-500/15 text-emerald-600"}`}>
                          {q.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {q.items.map((i) => `${i.qty}x ${i.name}`).join(", ")} • ৳ {q.total} ({q.time})
                      </div>
                    </div>
                    {q.status === "incoming" && (
                      <Button size="sm" onClick={() => handleAcceptQrOrder(q)} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                        {lang === "bn" ? "গ্রহণ করুন" : "Accept"}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── TABLE RESERVATIONS MODAL ──────────────────────────────────────────── */}
      <Dialog open={reservationsModalOpen} onOpenChange={setReservationsModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" />
              <span>{lang === "bn" ? "টেবিল রিজার্ভেশন" : "Table Reservations"}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddReservation} className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border border-border text-xs">
            <Input required value={resGuestName} onChange={(e) => setResGuestName(e.target.value)} placeholder={lang === "bn" ? "অতিথির নাম *" : "Guest Name *"} className="h-9 rounded-xl text-xs" />
            <Input value={resPhone} onChange={(e) => setResPhone(e.target.value)} placeholder={lang === "bn" ? "মোবাইল নম্বর" : "Phone"} className="h-9 rounded-xl text-xs" />
            <select value={resTable} onChange={(e) => setResTable(e.target.value)} className="h-9 px-2 rounded-xl border bg-background text-xs font-semibold">
              {Object.values(tables).map((tb) => (
                <option key={tb.id} value={tb.id}>{tb.name} ({tb.capacity}p)</option>
              ))}
            </select>
            <Input type="number" min={1} value={resGuests} onChange={(e) => setResGuests(Number(e.target.value) || 2)} placeholder="Guests" className="h-9 rounded-xl text-xs" />
            <Input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)} className="h-9 rounded-xl text-xs" />
            <Button type="submit" className="h-9 rounded-xl bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold text-xs cursor-pointer">
              {lang === "bn" ? "+ রিজার্ভ করুন" : "+ Book Table"}
            </Button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto py-1 text-xs">
            {reservations.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                {lang === "bn" ? "কোনো টেবিল রিজার্ভেশন নেই।" : "No table reservations scheduled."}
              </p>
            ) : (
              reservations.map((r) => (
                <div key={r.id} className="p-3 rounded-2xl border border-border flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>{r.guestName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-bold">
                        {r.table} • {r.guests} guests @ {r.time}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.phone || "No phone"} • Status: {r.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === "reserved" && (
                      <Button size="sm" onClick={() => handleSeatReservation(r)} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                        {lang === "bn" ? "সিট দিন" : "Seat & Order"}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancelReservation(r.id, r.table)}
                      className="size-8 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
