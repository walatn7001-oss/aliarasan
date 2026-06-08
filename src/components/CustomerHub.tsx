import React, { useState, useEffect } from "react";
import { 
  Building2, 
  User, 
  ShoppingCart, 
  ClipboardList, 
  ShieldAlert, 
  LogOut, 
  DollarSign, 
  Phone, 
  Mail, 
  Calendar, 
  RefreshCw, 
  Lock,
  CheckCircle,
  TrendingDown,
  UserCheck,
  Menu,
  X
} from "lucide-react";
import { DatabaseState, Order } from "../types";
import ShopTab from "./ShopTab";
import FieryCursor from "./FieryCursor";

interface CustomerHubProps {
  currentUser: any;
  db: DatabaseState;
  saveDb: (nextState: DatabaseState) => Promise<void>;
  isDark: boolean;
  addNotification: (message: string, type?: "info" | "warning" | "success") => void;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: any) => void;
}

export default function CustomerHub({ 
  currentUser, 
  db, 
  saveDb, 
  isDark, 
  addNotification, 
  onLogout,
  onProfileUpdate 
}: CustomerHubProps) {
  // Navigation: "dashboard" | "shop" | "orders" | "profile"
  const [activeTab, setActiveTab] = useState<"dashboard" | "shop" | "orders" | "profile">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theme Sync Management
  const [themeMode, setThemeMode] = useState<"magma" | "cosmic" | "emerald" | "gold">(() => {
    return (localStorage.getItem("dal_erp_theme") as any) || "magma";
  });

  useEffect(() => {
    document.documentElement.classList.remove("theme-magma", "theme-cosmic", "theme-emerald", "theme-gold", "theme-light-mode");
    document.documentElement.classList.add(`theme-${themeMode}`);
    if (!isDark) {
      document.documentElement.classList.add("theme-light-mode");
    }
    localStorage.setItem("dal_erp_theme", themeMode);
  }, [themeMode, isDark]);

  // Profile fields
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || "Belirtilmedi");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // We find corresponding Customer CRM account dynamically
  const matchingCustomer = db.customers.find(c => c.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
  
  // Filter only THIS customer's orders
  const myOrders = db.orders.filter(o => 
    o.customerId === currentUser.id || 
    o.customerId === (matchingCustomer?.id || "") ||
    o.customerName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          name: profileName, 
          phone: profilePhone, 
          password: newPassword || undefined 
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Güncelleme başarısız.");

      addNotification("Profil ve iletişim ayarlarınız başarıyla kaydedildi.", "success");
      onProfileUpdate(data.user);
      setNewPassword("");
    } catch (err: any) {
      addNotification(err.message, "warning");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col lg:flex-row transition-colors duration-300 relative overflow-x-hidden ${
      isDark ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-800"
    }`}>
      
      <FieryCursor />

      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* LEFT SIDEBAR NAVIGATION FOR CUSTOMER */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col justify-between flex-shrink-0 transition-all duration-300 transform lg:static lg:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${
        isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200"
      }`}>
        <div>
          {/* Brand header */}
          <div className="p-6 pb-4 flex items-center justify-between border-b border-dashed border-slate-800">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-500 animate-spin-slow" />
              <div>
                <h1 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-1 fiery-title-glow">
                  DAL GRUP
                  <span className="text-[8px] bg-emerald-500 text-slate-950 px-1 py-0.5 rounded font-mono">BAYİ</span>
                </h1>
                <span className="text-[10px] text-slate-500 block">Müşteri Alışveriş Portalı</span>
              </div>
            </div>

            {/* Mobile close sidebar trigger */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5 text-emerald-500" />
            </button>
          </div>

          {/* Quick Active user identity */}
          <div className="mx-4 my-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-sans text-xs border border-emerald-555/20">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <span className="block text-[11px] font-bold text-white truncate leading-relaxed">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <UserCheck className="w-2.5 h-2.5" />
                  Sınıfı: {matchingCustomer?.category || "Tescilli Üye"}
                </span>
              </div>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setIsSidebarOpen(false); // Mobile auto close after click
              }}
              className={`w-full text-left p-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all fiery-option-glow ${
                activeTab === "dashboard" 
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" 
                  : isDark ? "text-slate-400 hover:bg-slate-900/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <User className="w-4 h-4" />
              <div>
                <span className="block">Müşteri Kabini</span>
                <span className={`text-[8.5px] font-normal block ${activeTab === "dashboard" ? "text-slate-800" : "text-slate-500"}`}>
                  Hesap Cari Durumu
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab("shop");
                setIsSidebarOpen(false); // Mobile auto close after click
              }}
              className={`w-full text-left p-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all fiery-option-glow ${
                activeTab === "shop" 
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" 
                  : isDark ? "text-slate-400 hover:bg-slate-900/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <div>
                <span className="block">E-Ticaret Kapısı</span>
                <span className={`text-[8.5px] font-normal block ${activeTab === "shop" ? "text-slate-800" : "text-slate-500"}`}>
                  Toptan Sipariş Ver
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab("orders");
                setIsSidebarOpen(false); // Mobile auto close after click
              }}
              className={`w-full text-left p-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all fiery-option-glow ${
                activeTab === "orders" 
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" 
                  : isDark ? "text-slate-400 hover:bg-slate-900/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <div>
                <span className="block">Sipariş Geçmişim</span>
                <span className={`text-[8.5px] font-normal block ${activeTab === "orders" ? "text-slate-800" : "text-slate-500"}`}>
                  Geçmiş Sevkiyatlar
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                setIsSidebarOpen(false); // Mobile auto close after click
              }}
              className={`w-full text-left p-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all fiery-option-glow ${
                activeTab === "profile" 
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" 
                  : isDark ? "text-slate-400 hover:bg-slate-900/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <div>
                <span className="block">İletişim & Şifre</span>
                <span className={`text-[8.5px] font-normal block ${activeTab === "profile" ? "text-slate-800" : "text-slate-500"}`}>
                  Güvenlik Güncelleme
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* LOGOUT FOOTER BUTTON */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Portaldan Çıkış Yap
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* UPPER STATUS BAR */}
        <header className={`p-4 px-6 md:px-8 border-b flex items-center justify-between ${
          isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-lg cursor-pointer"
              title="Menüyü Aç"
            >
              <Menu className="w-5 h-5 text-emerald-500 animate-pulse" />
            </button>
            <span className="px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Onaylı Müşteri Terminali
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">Oturum IP: 127.0.0.1</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme select dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 px-1.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Tema:</span>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value as any)}
                className="bg-transparent border-none outline-none text-[10px] text-emerald-500 font-bold cursor-pointer pr-1 focus:ring-0 max-w-[100px]"
              >
                <option value="magma" className="bg-slate-950 text-orange-500 font-semibold">🔥 Magma</option>
                <option value="cosmic" className="bg-slate-950 text-purple-400 font-semibold">🌌 Nebula</option>
                <option value="emerald" className="bg-slate-950 text-emerald-400 font-semibold">⚡ Siber</option>
                <option value="gold" className="bg-slate-950 text-yellow-500 font-semibold">🪙 Gold</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono hidden sm:block">
              Son Giriş Tarihi: <b className="text-slate-300">{currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleDateString("tr-TR") + " " + new Date(currentUser.lastLoginAt).toLocaleTimeString("tr-TR") : "Yeni Giriş"}</b>
            </div>
          </div>
        </header>

        {/* INNER RENDER SHEET */}
        <section className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* 1. MÜŞTERİ KABİNİ (DASHBOARD) */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Welcome Jumbotron Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20">
                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <User className="text-emerald-400" />
                  Hoş Geldiniz, {currentUser.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  DAL Grup tescilli üye portali üzerinden açık cari hesap bakiye limitinizi görebilir, vadeli veya nakit iskontolu sipariş talebi geçebilirsiniz.
                </p>
              </div>

              {/* CRM Account Details (Financial metrics) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border bg-slate-900/50 border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">CARİ BORÇ</span>
                  <p className="text-xl font-extrabold text-rose-500 mt-1">
                    {matchingCustomer ? matchingCustomer.debt.toLocaleString("tr-TR") : "0"} ₺
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-1">Gecikmiş ödemeler dahil toplam</span>
                </div>

                <div className="p-5 rounded-xl border bg-slate-900/50 border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">CARİ ALACAK / AVANS</span>
                  <p className="text-xl font-extrabold text-emerald-400 mt-1">
                    {matchingCustomer ? matchingCustomer.credit.toLocaleString("tr-TR") : "0"} ₺
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-1">Sipariş avansı ve peşin ödemeler</span>
                </div>

                <div className="p-5 rounded-xl border bg-slate-900/50 border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">RİSK LİMİTİ</span>
                  <p className="text-xl font-extrabold text-white mt-1">
                    {matchingCustomer ? matchingCustomer.riskLimit.toLocaleString("tr-TR") : "5.000"} ₺
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-1">Vadeli aşım limit yetkiniz</span>
                </div>

                <div className="p-5 rounded-xl border bg-slate-900/50 border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">AKTİF SİPARİŞ HAREKETİ</span>
                  <p className="text-xl font-extrabold text-amber-500 mt-1">
                    {myOrders.length} Adet
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-1">Sistemdeki tüm kayıtlı emirler</span>
                </div>
              </div>

              {/* Personal CRM details */}
              <div className="p-6 rounded-2xl bg-[#0c1221] border border-slate-850">
                <h3 className="font-bold text-sm tracking-wide text-white mb-4">Firmasal ve Tescil Bilgileriniz</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Kayıtlı Ticari Unvan:</span>
                      <span className="font-semibold text-white truncate max-w-xs">{matchingCustomer?.companyName || `${currentUser.name} Bireysel Üyelik`}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Vergi Dairesi / No:</span>
                      <span className="font-semibold text-white">{matchingCustomer?.taxOffice || "Belirtilmedi"} / {matchingCustomer?.taxNo || "Bireysel"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Oluşturulma Tarihi:</span>
                      <span className="font-semibold font-mono text-white">{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString("tr-TR") : "Bilinmiyor"}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Sistem E-Postası:</span>
                      <span className="font-semibold text-white">{currentUser.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">İrtibat GSM:</span>
                      <span className="font-semibold text-white">{currentUser.phone || "Belirtilmedi"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Adres Bilgisi:</span>
                      <span className="font-semibold text-white truncate max-w-xs">{matchingCustomer?.address || "Belirtilmedi"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/10 text-[11px] text-emerald-400 leading-relaxed">
                  💡 <b>Bilgilendirme:</b> Adres unvanı, fatura adresi, vergi numarası gibi ticari değişiklik isteklerinizi sol menü panelinden CRM koordinatörlerimize iletebilir veya İrtibat numaramızdan anlık değiştirebilirsiniz.
                </div>
              </div>

            </div>
          )}

          {/* 2. ETİCARET KAPISI (SHOP) */}
          {activeTab === "shop" && (
            <div className="space-y-6 animate-fade-in text-white">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-2">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-amber-500" />
                  DAL GRUP GÜVENLİ TOPTAN SİPARİŞ PORTALI
                </p>
                <p className="text-[11px] text-slate-400">
                  Aşağıdaki e-ticaret portalından sepetinize malzeme ekleyerek doğrudan sipariş tescil edin. Siparişleriniz anlık olarak DAL GRUP ERP Sevkiyat İstasyonuna düşecektir.
                </p>
              </div>

              {/* Render existing ShopTab perfectly inside customer cabinet */}
              <ShopTab db={db} saveDb={saveDb} addNotification={addNotification} isDark={isDark} activeCustomerId={matchingCustomer?.id} />
            </div>
          )}

          {/* 3. SİPARİŞ GEÇMİŞİ */}
          {activeTab === "orders" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Sipariş Geçmişim ve Takibat</h3>
                  <p className="text-xs text-slate-500">Firmamıza geçtiğiniz tüm tescilli siparişlerin durumları ve kargo sevkiyat aşamaları.</p>
                </div>
              </div>

              {myOrders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0c1221] border border-slate-850">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="font-semibold text-sm text-white">Kayıtlı Sipariş Bulunmuyor</p>
                  <p className="text-xs text-slate-500 mt-1">E-Ticaret Kapısı menüsünden ilk siparişinizi hemen geçebilirsiniz.</p>
                  <button
                    onClick={() => setActiveTab("shop")}
                    className="mt-4 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-bold text-slate-950 transition-all cursor-pointer"
                  >
                    Ürünleri Listele
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="p-4">Sipariş Kodu</th>
                        <th className="p-4">Tarih</th>
                        <th className="p-4">Malzeme Kalemleri</th>
                        <th className="p-4">Kargo No</th>
                        <th className="p-4 text-right">Tutar</th>
                        <th className="p-4">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-white">
                      {myOrders.map((ord: Order) => (
                        <tr key={ord.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4 font-mono font-bold text-amber-500">{ord.id}</td>
                          <td className="p-4 text-slate-400">{new Date(ord.date).toLocaleDateString("tr-TR")}</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {ord.items.map((it, idx) => (
                                <span key={idx} className="block text-[11px]">
                                  • {it.productTitle} <span className="text-slate-500">({it.quantity} adet)</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-400">
                            {ord.trackingNumber ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                {ord.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">Hazırlanıyor</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400">
                            {ord.total.toLocaleString("tr-TR")} ₺
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === "Beklemede" ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20" :
                              ord.status === "Hazırlanıyor" || ord.status === "Paketleniyor" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" :
                              ord.status === "Kargoda" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                              ord.status === "Teslim Edildi" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-555/20" :
                              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. PROFİLİMİ GÜNCELLE */}
          {activeTab === "profile" && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
              <div className="p-6 rounded-2xl bg-[#0c1221] border border-slate-850">
                <h3 className="text-lg font-bold text-white tracking-wide mb-2 flex items-center gap-2">
                  <Lock className="text-amber-500 w-5 h-5" />
                  Profil & Şifre Güncelleme Formu
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Ad soyad, telefon numarası ve şifrenizi güvenle güncelleyin. Şifre değişimi sonrasında mevcut şifreniz güncel PBKDF2 hash'i ile güvenli saklanacaktır.
                </p>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                      Adınız can Soyadınız
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-900/65 border border-slate-800 rounded-xl focus:border-emerald-550 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                      E-Posta Adresi (Değiştirilemez)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-850 rounded-xl text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                      GSM İrtibat Telefonu
                    </label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={e => setProfilePhone(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-900/65 border border-slate-800 rounded-xl focus:border-emerald-550 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                      Yeni Şifre (İsteğe Bağlı)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Değiştirmek istemiyorsanız boş bırakın"
                      className="w-full px-4 py-2 text-xs bg-slate-900/65 border border-slate-800 rounded-xl focus:border-emerald-550 text-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Güncelleniyor..." : "Bilgileri Kaydet ve Uygula"}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Floating WhatsApp Support Button */}
      <a
        href="https://wa.me/905528847647?text=Merhaba%2C%20DAL%20GRUP%20üzerinden%20bilgi%20almak%2520istiyorum."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-extrabold text-xs rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 group cursor-pointer border border-emerald-450"
      >
        <span className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-xs block whitespace-nowrap font-sans font-extrabold">
          WhatsApp Sipariş & Destek Hattı
        </span>
        <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.022-.008-.115-.062-.272-.14-.158-.077-.915-.452-1.07-.51-.153-.059-.26-.086-.37.078-.11.164-.425.534-.52.642-.097.108-.194.12-.35.043-.158-.079-.665-.245-1.27-.783-.469-.42-1.127-1.144-1.27-1.393-.14-.24-.015-.369.106-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.163.04-.302-.02-.418-.06-.115-.53-1.282-.727-1.758-.19-.46-.388-.397-.53-.404-.139-.007-.3-.008-.46-.008s-.42.06-.64.29c-.22.24-.84.82-.84 2.008s.86 2.33 1.04 2.53c.18.2 1.69 2.58 4.1 3.626.57.25 1.02.4 1.37.5.572.18 1.093.15 1.504.09.46-.07 1.41-.577 1.61-1.135.2-.558.2-1.037.14-1.135-.06-.1-.22-.16-.407-.241"/>
          <path d="M12.003 21c-1.65 0-3.26-.43-4.67-1.25l-.34-.2-3.48.91.93-3.39-.22-.35C3.4 15.3 2.78 13.56 2.78 11.77 2.78 6.7 6.85 2.61 11.93 2.61c2.45 0 4.76.96 6.5 2.68a9.23 9.23 0 0 1 2.62 6.5C21.05 16.85 16.98 21 12.003 21M12 0c-6.627 0-12 5.372-12 12 0 2.115.547 4.188 1.603 6.012L0 24l6.197-1.631c1.78.98 3.792 1.498 5.803 1.498 6.627 0 12-5.372 12-12 0-3.2-1.25-6.21-3.51-8.47C18.23 1.25 15.21 0 12 0"/>
        </svg>
      </a>

    </div>
  );
}
