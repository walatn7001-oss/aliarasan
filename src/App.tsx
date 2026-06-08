/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  ClipboardList, 
  DollarSign, 
  Briefcase, 
  UserSquare2, 
  Sparkles, 
  Sun, 
  Moon, 
  CheckCircle, 
  Database,
  Volume2,
  X,
  AlertTriangle,
  RotateCcw,
  Menu
} from "lucide-react";
import { DatabaseState } from "./types";
import FieryCursor from "./components/FieryCursor";

// Import tabs
import DashboardTab from "./components/DashboardTab";
import ProductsTab from "./components/ProductsTab";
import CRMTab from "./components/CRMTab";
import ShopTab from "./components/ShopTab";
import OrdersTab from "./components/OrdersTab";
import AccountingTab from "./components/AccountingTab";
import PurchasingTab from "./components/PurchasingTab";
import PersonnelTab from "./components/PersonnelTab";
import AIAssistantTab from "./components/AIAssistantTab";

// Import multi-role security modules
import AuthScreen from "./components/AuthScreen";
import CustomerHub from "./components/CustomerHub";

interface ToastNotification {
  id: string;
  message: string;
  type: "info" | "warning" | "success";
}

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [themeMode, setThemeMode] = useState<"magma" | "cosmic" | "emerald" | "gold">(() => {
    return (localStorage.getItem("dal_erp_theme") as any) || "magma";
  });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("Veritabanı bağlı");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Sync theme changes to HTML element safely for Tailwind structure
  useEffect(() => {
    document.documentElement.classList.remove("theme-magma", "theme-cosmic", "theme-emerald", "theme-gold", "theme-light-mode");
    document.documentElement.classList.add(`theme-${themeMode}`);
    if (!isDark) {
      document.documentElement.classList.add("theme-light-mode");
    }
    localStorage.setItem("dal_erp_theme", themeMode);
  }, [themeMode, isDark]);

  // Fetch full state from server on startup
  useEffect(() => {
    fetchDatabaseState();

    // Auto-restore login session gracefully
    const savedUser = localStorage.getItem("dal_erp_session");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("dal_erp_session");
      }
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("dal_erp_session", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("dal_erp_session");
    addNotification("Sistemden güvenli çıkış yapıldı.", "info");
  };

  const fetchDatabaseState = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage("Veritabanı yükleniyor...");
      
      const response = await fetch("/api/db");
      if (!response.ok) throw new Error("Database load failed");
      const serverData = await response.json();
      
      // Compare and reconcile with client-side localStorage state
      const localDataStr = localStorage.getItem("dal_erp_database_state");
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr) as DatabaseState;
          
          // Compute quantities to detect if local data contains items not on the server
          const localProductCount = localData.products?.length || 0;
          const serverProductCount = serverData.products?.length || 0;
          const localOrderCount = localData.orders?.length || 0;
          const serverOrderCount = serverData.orders?.length || 0;
          
          if (localProductCount > serverProductCount || localOrderCount > serverOrderCount) {
            console.log("Client local storage has more entries than server. Synchronizing cache to cloud to prevent loss...");
            
            // Sync client state back to the cloud database
            await fetch("/api/db/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(localData)
            });
            
            setDb(localData);
            setSyncMessage("Yerel Veriler Eşitlendi");
            addNotification("Bilgisayarınızdaki yerel veriler bulut ile otomatik eşitlendi ve korundu.", "success");
            setIsSyncing(false);
            return;
          }
        } catch (localErr) {
          console.error("Local storage sync error", localErr);
        }
      }
      
      setDb(serverData);
      // Cache a mirror of the server database state locally
      localStorage.setItem("dal_erp_database_state", JSON.stringify(serverData));
      setSyncMessage("Veritabanı senkronize edildi");
    } catch (err) {
      console.error(err);
      
      // Fallback: load entirely from client-side persistent cache if cloud is offline
      const localDataStr = localStorage.getItem("dal_erp_database_state");
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr);
          setDb(localData);
          setSyncMessage("Yerel Bellek Aktif (Çevrimdışı)");
          addNotification("Buluta bağlanılamadı. Çevrimdışı yerel yedek aktif edildi.", "info");
        } catch (e) {
          setSyncMessage("Yükleme Başarısız");
        }
      } else {
        setSyncMessage("Yükleme başarısız. Çevrimdışı Mod");
        addNotification("Bulut veritabanı yüklenirken hata oluştu. Çevrimdışı modda devam ediliyor.", "warning");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Full stack save logic (persist on disk so there is zero loss)
  const saveDbState = async (nextState: DatabaseState) => {
    setDb(nextState);
    localStorage.setItem("dal_erp_database_state", JSON.stringify(nextState));
    try {
      setIsSyncing(true);
      setSyncMessage("Kaydediliyor...");
      
      const response = await fetch("/api/db/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextState)
      });

      if (!response.ok) throw new Error("Failed to write db to disk");
      
      setSyncMessage("Değişiklikler kaydedildi");
    } catch (err) {
      console.error(err);
      setSyncMessage("Yerel belleğe kaydedildi");
    } finally {
      setIsSyncing(false);
    }
  };

  // Toast Notification Hub
  const addNotification = (message: string, type: "info" | "warning" | "success" = "success") => {
    const id = `notif-${Math.random().toString(36).substr(2, 9)}`;
    const newNotif = { id, message, type };

    setNotifications(prev => [newNotif, ...prev].slice(0, 5)); // Keep max 5 toaster lines

    // Trigger standard audit log record automatically in the DB state!
    if (db) {
      const timestamp = new Date().toLocaleTimeString("tr-TR");
      const updatedLogs = [`[${timestamp}] ${message}`, ...db.auditLogs].slice(0, 30);
      setDb(prev => prev ? { ...prev, auditLogs: updatedLogs } : null);
    }

    // Auto removal transition timer
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Safe manual full backup trigger
  const triggerManualBackup = async () => {
    try {
      addNotification("Tüm ERP fihristi yedek arşivi alınıyor...", "info");
      const response = await fetch("/api/db/backup", { method: "POST" });
      if (response.ok) {
        addNotification("Yedekleme arşivi (db_backup.json) başarıyla üretildi ve sunucuya tescil edildi.", "success");
      }
    } catch (e) {
      addNotification("Yedekleme işlemi sunucu izin hatasıyla sonuçlandı.", "warning");
    }
  };

  // Restore factory defaults
  const triggerResetDefaults = async () => {
    if (!window.confirm("Dikkat! Tüm veri akışları ve tarayıcı yedekleri fabrika ayarlarına sıfırlanacaktır. Bu işlem geri alınamaz! Emin misiniz?")) return;
    try {
      localStorage.removeItem("dal_erp_database_state");
      const response = await fetch("/api/db/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupIndex: "reset" })
      });
      if (response.ok) {
        addNotification("Sistem veri yapılandırması ve tarayıcı belleği tamamen temizlenerek sıfırlandı.", "success");
        // Reload fresh from server
        await fetchDatabaseState();
      }
    } catch (e) {
      addNotification("Sıfırlama başlatılamadı.", "warning");
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", sub: "Masaüstü Özet", icon: LayoutDashboard },
    { id: "products", label: "Katalog & Depo", sub: "Stok Envanter", icon: Package },
    { id: "crm", label: "Cari & CRM", sub: "Müşteri Kartları", icon: Users },
    { id: "shop", label: "E-Ticaret Kapısı", sub: "Alışveriş Portalı", icon: ShoppingCart },
    { id: "orders", label: "Sipariş Sevkiyat", sub: "İş İstasyonları", icon: ClipboardList },
    { id: "accounting", label: "Muhasebe Defter", sub: "Gelir-Gider KDV", icon: DollarSign },
    { id: "purchasing", label: "Mağaza Giderleri", sub: "Alış & Satış Defteri", icon: Briefcase },
    { id: "personnel", label: "Kadro & İK", sub: "Maaş Zimmet", icon: UserSquare2 },
    { id: "ai", label: "Gemini Yapay Zekâ", sub: "Karar Destek", icon: Sparkles },
  ];

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 font-sans text-white">
        <Building2 className="w-16 h-16 text-amber-500 animate-pulse" />
        <h2 className="font-extrabold text-lg tracking-wider">DAL GRUP ERP</h2>
        <p className="text-xs text-slate-500">Güvenlik ve veritabanı bağı kuruluyor. Lütfen bekleyin...</p>
      </div>
    );
  }

  // --- 1. MANDATORY AUTHENTICATION GUARD ---
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={handleLoginSuccess} 
        isDark={isDark} 
        onNotify={addNotification} 
      />
    );
  }

  // --- 2. CUSTOMER CABINET SPLIT ROUTE ---
  if (currentUser.role === "customer") {
    return (
      <CustomerHub 
        currentUser={currentUser} 
        db={db} 
        saveDb={saveDbState} 
        isDark={isDark} 
        addNotification={addNotification} 
        onLogout={handleLogout}
        onProfileUpdate={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem("dal_erp_session", JSON.stringify(updatedUser));
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      isDark ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-800"
    } flex flex-col lg:flex-row relative overflow-x-hidden`}>

      <FieryCursor />

      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r flex flex-col justify-between flex-shrink-0 transition-all duration-300 transform lg:static lg:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${
        isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200"
      }`}>
        <div>
          {/* Brand branding header with neon active state */}
          <div className="p-6 pb-4 flex items-center justify-between border-b border-dashed border-slate-800">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-amber-500 animate-spin-slow" />
              <div>
                <h1 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-1.5 fiery-title-glow">
                  DAL GRUP
                  <span className="text-[9px] bg-amber-500 text-slate-950 px-1 py-0.5 rounded font-mono">ERP</span>
                </h1>
                <span className="text-[10px] text-slate-500 font-medium block">Zirve Entegrasyon Sürümü</span>
              </div>
            </div>

            {/* Mobile close menu trigger */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5 text-amber-500" />
            </button>
          </div>

          {/* Quick sync badge */}
          <div className="mx-6 my-4 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-500" />
              <span>{syncMessage}</span>
            </span>
            <span className={`w-2 h-2 rounded-full ${isSyncing ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
          </div>

          {/* Dynamic anchors loop */}
          <nav className="px-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false); // Mobile auto close after click
                  }}
                  className={`w-full text-left p-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3.5 transition-all fiery-option-glow ${
                    isActive 
                      ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20" 
                      : isDark ? "text-slate-400 hover:bg-slate-900/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                  <div>
                    <span className="block">{item.label}</span>
                    <span className={`text-[9px] font-normal block ${isActive ? "text-slate-800" : "text-slate-500"}`}>
                      {item.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Brand version credentials & developer backups footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          
          <div className="flex gap-2">
            <button
              onClick={triggerManualBackup}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-[9px] font-bold rounded-lg uppercase transition-all tracking-wider cursor-pointer"
              title="Cari yedekleme gerçekleştir"
            >
              Yedek Kaydet
            </button>
            <button
              onClick={triggerResetDefaults}
              className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 text-[9px] font-bold rounded-lg uppercase rounded transition-all cursor-pointer"
              title="Fabrika verisine döndür"
            >
              Sıfırla
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mb-2">
            <span>v9.26 Enterprise</span>
            <span>UTF-8 Güvenli</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center font-bold text-[10px]">
                A
              </div>
              <div className="truncate">
                <span className="block font-bold truncate text-[10px]">Yetki: {currentUser.name}</span>
                <span className="text-[8px] text-rose-400 font-extrabold uppercase block leading-none">Genel Yönetici</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-1 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 text-[9px] font-extrabold uppercase rounded-lg border border-rose-500/15 transition-all text-center cursor-pointer"
            >
              Güvenli Çıkış Yap
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT WORKSPACE FRAME */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* TOP STATUS BAR BAR */}
        <header className={`p-4 px-6 md:px-8 border-b flex items-center justify-between ${
          isDark ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-lg cursor-pointer"
              title="Menüyü Aç"
            >
              <Menu className="w-5 h-5 text-amber-500" />
            </button>
            <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/15`}>
              Yerel Ağ
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">Terminal ID: DESKTOP-ERP-PRO</span>
          </div>

          {/* Quick actions row */}
          <div className="flex items-center gap-4">
            
            {/* Auto-save notification anchor */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Otomatik Kayıt Devrede</span>
            </div>

            {/* Theme select dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 px-1.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Tema:</span>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value as any)}
                className="bg-transparent border-none outline-none text-[10px] text-amber-500 font-bold cursor-pointer pr-1 focus:ring-0 max-w-[100px]"
              >
                <option value="magma" className="bg-slate-950 text-orange-500 font-semibold">🔥 Magma</option>
                <option value="cosmic" className="bg-slate-950 text-purple-400 font-semibold">🌌 Nebula</option>
                <option value="emerald" className="bg-slate-950 text-emerald-400 font-semibold">⚡ Siber</option>
                <option value="gold" className="bg-slate-950 text-yellow-500 font-semibold">🪙 Gold</option>
              </select>
            </div>

            {/* Quick theme toggler */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition cursor-pointer hover:scale-105"
              title="Açık/Koyu Tema Değiştir"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>


        {/* CENTRAL ROUTING SHEET WRAPPER */}
        <section className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardTab 
              db={db} 
              saveDb={saveDbState} 
              addNotification={addNotification} 
              isDark={isDark} 
              onResetDatabase={triggerResetDefaults} 
              onTriggerBackup={triggerManualBackup}
            />
          )}

          {activeTab === "products" && (
            <ProductsTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "crm" && (
            <CRMTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "shop" && (
            <ShopTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "orders" && (
            <OrdersTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "accounting" && (
            <AccountingTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "purchasing" && (
            <PurchasingTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "personnel" && (
            <PersonnelTab db={db} saveDb={saveDbState} addNotification={addNotification} isDark={isDark} />
          )}

          {activeTab === "ai" && (
            <AIAssistantTab db={db} addNotification={addNotification} isDark={isDark} />
          )}
        </section>

      </main>

      {/* FLOAT ALERTS TOASTER DRAWER */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {notifications.map(n => {
          return (
            <div
              key={n.id}
              className={`p-3.5 rounded-xl text-xs font-semibold shadow-xl border flex items-center justify-between gap-3 pointer-events-auto animate-fade-in ${
                n.type === "success" ? "bg-emerald-950 border-emerald-500/30 text-emerald-300" :
                n.type === "warning" ? "bg-amber-950 border-amber-500/30 text-amber-300" :
                "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {n.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                <span>{n.message}</span>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
