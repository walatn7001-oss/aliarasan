/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Tag, 
  BadgeCheck, 
  UserCheck, 
  CheckCircle,
  Clock,
  Briefcase,
  Search
} from "lucide-react";
import { DatabaseState, Order, OrderItem, OrderStatus, Product } from "../types";

interface ShopTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
  activeCustomerId?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
}

export default function ShopTab({ db, saveDb, addNotification, isDark, activeCustomerId }: ShopTabProps) {
  // Cart, customer selected and catalog states
  const [cart, setCart] = useState<CartItem[]>([]);
  const selectedCustomerId = activeCustomerId || db.customers[0]?.id || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [orderCompleteData, setOrderCompleteData] = useState<string | null>(null); // holds placed order.id

  // Payment Options States
  const [paymentMethod, setPaymentMethod] = useState<"havale" | "cc_taksit">("havale");
  const [selectedBank, setSelectedBank] = useState("İş Bankası (TR56 0006 2000 1234 5678 9012 34)");
  const [selectedInstallment, setSelectedInstallment] = useState("1");
  
  // Card input states
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [lastPlacedOrder, setLastPlacedOrder] = useState<any | null>(null);

  const getWhatsAppOrderUrl = (order: any) => {
    if (!order) return "";
    const itemLines = order.items.map((it: any) => `• ${it.productTitle} (${it.quantity} adet) - ${(it.price).toLocaleString("tr-TR")} ₺`).join("\n");
    const text = `Merhaba Dal Grup, ben *${order.customerName}*.\n` +
      `Sistem üzerinden sipariş oluşturdum:\n\n` +
      `📦 *Sipariş Kodu:* ${order.id}\n` +
      `📅 *Tarih:* ${new Date(order.date).toLocaleDateString("tr-TR")}\n\n` +
      `📋 *Malzemeler:*\n${itemLines}\n\n` +
      `💰 *Toplam Tutar:* ${order.total.toLocaleString("tr-TR")} ₺\n` +
      `💳 *Ödeme Tercihi:* ${order.notes}\n\n` +
      `Siparişimi onaylar mısınız? Teşekkürler!`;
    return `https://wa.me/905528847647?text=${encodeURIComponent(text)}`;
  };

  // Multi-tier discount codes (Simulated Dealer Campaigns matching Bayi Sistem)
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  // Filter products based on real-time search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return db.products;
    return db.products.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [db.products, searchQuery]);

  // Active customer context
  const activeCustomer = useMemo(() => {
    return db.customers.find(c => c.id === selectedCustomerId) || null;
  }, [db.customers, selectedCustomerId]);

  // Apply special dealer discounts automatically on selection based on category!
  const autoTierDiscount = useMemo(() => {
    if (!activeCustomer) return 0;
    if (activeCustomer.category === "Bayi") return 10; // Automatic 10% discount for regular dealers
    if (activeCustomer.category === "Özel Bayi") return 15; // Automatic 15% discount for premium distributors
    return 0;
  }, [activeCustomer]);

  // Add item to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      addNotification(`${product.title} tükendiği için sepete eklenemez.`, "warning");
      return;
    }

    // Check if limit exceeded
    const existing = cart.find(item => item.product.id === product.id);
    if (existing && existing.quantity >= product.stock) {
      addNotification(`Stok limiti sıfırlandı: Bu üründen en fazla ${product.stock} adet sipariş edebilirsiniz.`, "warning");
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { 
        product, 
        quantity: 1, 
        selectedColor: product.color || "Standart", 
        selectedSize: product.size || "Mevcut boy"
      }]);
    }
    
    addNotification(`${product.title} sepete eklendi.`, "success");
  };

  // Modify quantities
  const handleUpdateQuantity = (productId: string, diff: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + diff;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.product.id !== productId));
      addNotification("Ürün sepetten çıkarıldı.", "info");
      return;
    }

    // Check inventory
    if (newQty > item.product.stock) {
      addNotification("Depodaki stok limitini aşamazsınız.", "warning");
      return;
    }

    setCart(cart.map(i => 
      i.product.id === productId ? { ...i, quantity: newQty } : i
    ));
  };

  // Delete Cart item
  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(i => i.product.id !== id));
    addNotification("Ürün sepetinizden kaldırıldı.", "info");
  };

  // Apply manual coupon code (e.g. TR2026, KAMPANYA)
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === "TR2026") {
      setDiscountPercent(20);
      addNotification("%20 Toptan indirim kuponu başarıyla uygulandı!", "success");
    } else if (code === "YILSONU") {
      setDiscountPercent(25);
      addNotification("%25 Dev kampanya kodu uygulandı!", "success");
    } else {
      addNotification("Geçersiz kampanya kodu.", "warning");
    }
    setCouponCode("");
  };

  // Calculate cart costs
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;

    cart.forEach(item => {
      const itemSub = item.product.price * item.quantity;
      subtotal += itemSub;
      // KDV calculation inclusion
      const baseVal = itemSub / (1 + item.product.kdv / 100);
      taxTotal += itemSub - baseVal;
    });

    const activeDiscount = Math.max(autoTierDiscount, discountPercent);
    const discountAmount = subtotal * (activeDiscount / 100);
    const finalTotal = subtotal - discountAmount;

    return {
      subtotal,
      discountAmount,
      taxTotal,
      finalTotal,
      appliedDiscountPercent: activeDiscount
    };
  }, [cart, autoTierDiscount, discountPercent]);

  // Place official E-Commerce Order
  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      addNotification("Kayıtlı sipariş başlatmak için sepet boş olamaz.", "warning");
      return;
    }
    if (!activeCustomer) {
      addNotification("Lütfen sipariş faturasının atanacağı mükellef carisini seçin.", "warning");
      return;
    }

    const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNum = `EXP-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      productTitle: item.product.title,
      quantity: item.quantity,
      price: item.product.price * (1 - totals.appliedDiscountPercent / 100)
    }));

    let paymentDetailNotes = "Toptan Sipariş";
    let finalOrderTotal = totals.finalTotal;

    if (paymentMethod === "havale") {
      paymentDetailNotes = `Banka Havalesi / EFT (${selectedBank})`;
    } else {
      const calcInstallments = selectedInstallment;
      if (calcInstallments === "1") {
        paymentDetailNotes = `Kredi Kartı Tek Çekim`;
      } else {
        const coef = calcInstallments === "3" ? 1 : calcInstallments === "6" ? 1 : calcInstallments === "9" ? 1.045 : 1.08;
        finalOrderTotal = totals.finalTotal * coef;
        paymentDetailNotes = `Kredi Kartı Taksit (${calcInstallments} Taksit, %${calcInstallments === "3" || calcInstallments === "6" ? "0" : calcInstallments === "9" ? "4.5" : "8"} Vade Farkı)`;
      }
      if (cardNumber) {
        paymentDetailNotes += ` (Kart: **** **** **** ${cardNumber.slice(-4)})`;
      }
    }

    const newOrder: Order = {
      id: orderId,
      customerId: activeCustomer.id,
      customerName: `${activeCustomer.name} (${activeCustomer.companyName})`,
      customerCategory: activeCustomer.category,
      items: orderItems,
      total: finalOrderTotal,
      status: OrderStatus.BEKLEMEDE,
      date: new Date().toISOString(),
      trackingNumber: trackingNum,
      notes: paymentDetailNotes
    };

    // Subtraction process for product stocks in real time
    const updatedProducts = db.products.map(p => {
      const cartMatched = cart.find(item => item.product.id === p.id);
      if (cartMatched) {
        return { ...p, stock: Math.max(0, p.stock - cartMatched.quantity) };
      }
      return p;
    });

    // Append to transactions as pending receivable or general sales revenue if paid
    const updatedOrders = [newOrder, ...db.orders];

    saveDb({
      ...db,
      products: updatedProducts,
      orders: updatedOrders
    });

    // Notify instantly to the top header
    addNotification(`[E-TİCARET KAPISI] ${activeCustomer.companyName} firmasından yeni sipariş geldi! (${finalOrderTotal.toLocaleString("tr-TR")} ₺)`, "success");
    setOrderCompleteData(orderId);
    setLastPlacedOrder(newOrder);
    setCart([]);
    setDiscountPercent(0);
    // Clear card keys
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardCvc("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* LEFT AREA: Product Shopping Catalog - Grid Cards layout */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Product Search Box */}
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 fiery-option-glow ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center gap-2.5 text-xs">
            <Search className="w-5 h-5 text-amber-500 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Hızlı Ürün Arama</span>
              <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Ürün adı, marka, açıklama veya kod yazın, eşleşenler otomatik listelensin
              </span>
            </div>
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <input
              type="text"
              placeholder="Ürün adı, kod veya marka..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-colors placeholder-slate-600"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-slate-500 hover:text-white text-xs cursor-pointer bg-transparent border-none outline-none"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Dealer Discount notification banner */}
        {totals.appliedDiscountPercent > 0 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <BadgeCheck className="w-4 h-4" />
              Sınıf Tanımlı Özel Bayi İndirimi Aktif:
            </span>
            <span className="font-bold font-mono">%{totals.appliedDiscountPercent} Ek Toptan İndirim</span>
          </div>
        )}

        {/* Success complete banner overlay if order just succeeded */}
        {orderCompleteData && (
          <div className="p-6 bg-gradient-to-r from-emerald-950/40 to-slate-900/40 border-2 border-dashed border-emerald-500/50 rounded-2xl text-center space-y-4 animate-fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-md text-emerald-400">Tebrikler! Siparişiniz Alındı</h4>
            <p className="text-xs text-slate-350">
              Sipariş numaranız: <b className="text-white font-mono">{orderCompleteData}</b>. Depo yetkililerine anlık paketleme talimatı ve finans fişi gönderildi.
            </p>
            {lastPlacedOrder && (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-left space-y-1 max-w-sm mx-auto text-xs">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">SIPARIŞ DETAYI</span>
                <span className="block text-slate-300 font-semibold">{lastPlacedOrder.notes}</span>
                <span className="block text-amber-500 font-bold text-sm">{lastPlacedOrder.total.toLocaleString("tr-TR")} ₺</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setOrderCompleteData(null);
                  setLastPlacedOrder(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition"
              >
                Alışverişe Devam Et
              </button>
              {lastPlacedOrder && (
                <a
                  href={getWhatsAppOrderUrl(lastPlacedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-transform"
                >
                  <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.022-.008-.115-.062-.272-.14-.158-.077-.915-.452-1.07-.51-.153-.059-.26-.086-.37.078-.11.164-.425.534-.52.642-.097.108-.194.12-.35.043-.158-.079-.665-.245-1.27-.783-.469-.42-1.127-1.144-1.27-1.393-.14-.24-.015-.369.106-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.163.04-.302-.02-.418-.06-.115-.53-1.282-.727-1.758-.19-.46-.388-.397-.53-.404-.139-.007-.3-.008-.46-.008s-.42.06-.64.29c-.22.24-.84.82-.84 2.008s.86 2.33 1.04 2.53c.18.2 1.69 2.58 4.1 3.626.57.25 1.02.4 1.37.5.572.18 1.093.15 1.504.09.46-.07 1.41-.577 1.61-1.135.2-.558.2-1.037.14-1.135-.06-.1-.22-.16-.407-.241"/>
                    <path d="M12.003 21c-1.65 0-3.26-.43-4.67-1.25l-.34-.2-3.48.91.93-3.39-.22-.35C3.4 15.3 2.78 13.56 2.78 11.77 2.78 6.7 6.85 2.61 11.93 2.61c2.45 0 4.76.96 6.5 2.68a9.23 9.23 0 0 1 2.62 6.5C21.05 16.85 16.98 21 12.003 21M12 0c-6.627 0-12 5.372-12 12 0 2.115.547 4.188 1.603 6.012L0 24l6.197-1.631c1.78.98 3.792 1.498 5.803 1.498 6.627 0 12-5.372 12-12 0-3.2-1.25-6.21-3.51-8.47C18.23 1.25 15.21 0 12 0"/>
                  </svg>
                  WhatsApp'tan Sipariş İlet
                </a>
              )}
            </div>
          </div>
        )}

        {/* Shopping Catalog List */}
        {filteredProducts.length === 0 ? (
          <div className={`p-10 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center space-y-2 ${
            isDark ? "bg-slate-900/40 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-500 shadow-xs"
          }`}>
            <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
              <Search className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <h5 className={`text-xs font-bold ${isDark ? "text-slate-350" : "text-slate-700"}`}>Arama Sonucu Bulunamadı</h5>
            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
              "<span className="text-amber-500 font-bold">{searchQuery}</span>" aramasıyla eşleşen herhangi bir tescilli ürünümüz bulunamadı. Lütfen kelimeleri kontrol edin veya başka bir ürün aratın.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all font-bold cursor-pointer border border-amber-500/20"
            >
              Aramayı Sıfırla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const hasStock = p.stock > 0;
              const discountedPrice = p.price * (1 - totals.appliedDiscountPercent / 100);

              return (
                <div 
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark ? "bg-slate-900/60 border-slate-800 hover:border-slate-700/80" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="relative">
                      <img 
                        src={p.images[0]} 
                        alt={p.title} 
                        className="w-full h-36 object-cover rounded-xl border border-slate-850"
                      />
                      {!hasStock && (
                        <span className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center font-bold text-xs text-rose-500 uppercase tracking-widest font-mono">
                          Stokta Yok
                        </span>
                      )}
                      {hasStock && p.stock <= p.minStock && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-bold rounded-md font-mono">
                          Son {p.stock} Adet!
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] text-slate-550 font-mono block">{p.code} • {p.brand}</span>
                      <h4 className={`text-xs font-bold mt-1 line-clamp-2 ${isDark ? "text-slate-200" : "text-slate-800"}`} title={p.title}>
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2">{p.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
                    <div>
                      {totals.appliedDiscountPercent > 0 ? (
                        <div>
                          <span className="text-[10px] text-slate-500 line-through block font-mono">{p.price.toLocaleString("tr-TR")} ₺</span>
                          <span className="text-sm font-bold font-mono text-amber-500">{discountedPrice.toLocaleString("tr-TR")} ₺</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold font-mono text-amber-500">{p.price.toLocaleString("tr-TR")} ₺</span>
                      )}
                      <span className="text-[8.5px] text-slate-500 block">KDV Dahil (%{p.kdv})</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      disabled={!hasStock}
                      className={`p-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        hasStock 
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer" 
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Seç</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* RIGHT SIDE: Cart Summary Sheet & Checkout Process */}
      <div className="space-y-6">
        
        {/* Cart Listing frosted panel */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
        }`}>
          <h3 className={`text-sm font-bold mb-4 flex items-center justify-between ${isDark ? "text-white" : "text-slate-950"}`}>
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Toptan Sipariş Sepeti
            </span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-mono text-xs rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Ürün
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-sans">
              Sepet boş. Lütfen sol taraftan seçeceğiniz stokları sepete ekleyin.
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Product item repeaters */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.product.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center justify-between text-xs">
                    <div className="max-w-[60%]">
                      <p className={`font-bold truncate ${isDark ? "text-slate-300" : "text-slate-800"}`}>{item.product.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Fiyat: {item.product.price} ₺ • KDV %{item.product.kdv}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold font-mono text-xs">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2 pt-2 border-t border-slate-850">
                <input
                  type="text"
                  placeholder="Kupon Kodu (TR2026)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white max-w-[150px] outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-800 text-xs hover:bg-slate-705 font-bold rounded-xl flex items-center gap-1 text-slate-400 hover:text-white"
                >
                  <Tag className="w-3.5 h-3.5" /> Uygula
                </button>
              </form>

              {/* Bill Details */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-2 text-xs font-sans">
                <div className="flex justify-between text-slate-455">
                  <span>Sepet Toplamı:</span>
                  <span className="font-mono">{totals.subtotal.toLocaleString("tr-TR")} ₺</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Kampanya / Bayi İndirimi ({totals.appliedDiscountPercent}%):</span>
                    <span className="font-mono">-{totals.discountAmount.toLocaleString("tr-TR")} ₺</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-455">
                  <span>Dahil Vergi (KDV):</span>
                  <span className="font-mono text-[11px]">{totals.taxTotal.toLocaleString("tr-TR")} ₺</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                  <span>Genel TOPLAM:</span>
                  <span className="font-mono text-amber-500">{totals.finalTotal.toLocaleString("tr-TR")} ₺</span>
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  💳 ÖDEME SEÇENEĞİ
                </span>
                
                {/* Method selector tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("havale")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      paymentMethod === "havale"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Banka Havalesi / EFT
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cc_taksit")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      paymentMethod === "cc_taksit"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Kredi Kartı / Taksit
                  </button>
                </div>

                {/* Sub-form based on selection */}
                {paymentMethod === "havale" ? (
                  <div className="space-y-2 text-slate-300">
                    <label className="block text-[10px] font-bold text-slate-400">
                      Ödemenin Yapılacağı Banka Hesabı
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none font-bold"
                    >
                      <option value="İş Bankası (TR56 0006 2000 1234 5678 9012 34)">İş Bankası (TR56...9012 34)</option>
                      <option value="Ziraat Bankası (TR12 0001 0000 9876 5432 1012 34)">Ziraat Bankası (TR12...1012 34)</option>
                      <option value="Garanti BBVA (TR34 0006 2000 5555 4444 3322 11)">Garanti BBVA (TR34...3322 11)</option>
                    </select>
                    <div className="p-2 border border-blue-500/10 bg-blue-500/5 text-blue-400 text-[10px] rounded-lg leading-relaxed">
                      💡 Siparişinizi kaydettikten sonra lütfen havale açıklama kısmına sipariş kodunu belirtmeyi unutmayınız.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Simulated card forms */}
                    <div className="space-y-2 text-slate-400 text-xs">
                      <input
                        type="text"
                        placeholder="Kart Sahibi Ad Soyad"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Kart Numarası (4444 5555 6666 7777)"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "");
                          const matches = clean.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || "";
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          if (parts.length > 0) {
                            setCardNumber(parts.join(" "));
                          } else {
                            setCardNumber(clean);
                          }
                        }}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="AA/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none text-center"
                        />
                        <input
                          type="password"
                          placeholder="CVC"
                          maxLength={3}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none text-center"
                        />
                      </div>
                    </div>

                    {/* Taksit seçenekleri */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400">
                        Taksit / Vade Seçenekleri
                      </label>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 font-sans text-xs">
                        {[
                          { id: "1", title: "Tek Çekim", rate: 0, desc: "Vade Farksız" },
                          { id: "3", title: "3 Taksit", rate: 0, desc: "%0 Faiz" },
                          { id: "6", title: "6 Taksit", rate: 0, desc: "%0 Faiz" },
                          { id: "9", title: "9 Taksit", rate: 0.045, desc: "%4.5 Vade Farkı" },
                          { id: "12", title: "12 Taksit", rate: 0.08, desc: "%8 Vade Farkı" }
                        ].map(opt => {
                          const totalVal = totals.finalTotal * (1 + opt.rate);
                          const perMonth = totalVal / parseInt(opt.id);
                          const isSelected = selectedInstallment === opt.id;
                          return (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setSelectedInstallment(opt.id)}
                              className={`w-full p-2 rounded-xl text-left border flex justify-between items-center transition ${
                                isSelected
                                  ? "bg-amber-500/10 border-amber-500 text-amber-550"
                                  : "bg-slate-950 border-slate-850 hover:bg-slate-900/40 text-slate-300"
                              }`}
                            >
                              <div>
                                <span className="font-extrabold block text-[11px]">{opt.title}</span>
                                <span className="text-[9px] text-slate-500 block">{opt.desc}</span>
                              </div>
                              <div className="text-right font-mono text-[10px]">
                                <span className="font-bold text-white block">
                                  {perMonth.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺ / ay
                                </span>
                                <span className="text-[9px] text-slate-400 block font-normal">
                                  Toplam: {totalVal.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Place Order CTA Button */}
              <button
                onClick={handlePlaceOrder}
                className="w-full py-3 bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition-transform active:scale-95"
              >
                <CreditCard className="w-5 h-5 fill-slate-950 stroke-none" />
                Siparişi Kes ve Kaydet
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
