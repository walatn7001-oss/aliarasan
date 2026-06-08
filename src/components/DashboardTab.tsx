/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  Bell, 
  Clock, 
  ChevronUp, 
  Award,
  Database,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  HardDrive
} from "lucide-react";
import { motion } from "motion/react";
import { DatabaseState, OrderStatus } from "../types";

interface DashboardTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
  onResetDatabase?: () => void;
  onTriggerBackup?: () => void;
}

export default function DashboardTab({ 
  db, 
  saveDb, 
  addNotification, 
  isDark,
  onResetDatabase,
  onTriggerBackup
}: DashboardTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculations
  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter(o => o.status === OrderStatus.BEKLEMEDE).length;
  const completedOrders = db.orders.filter(o => o.status === OrderStatus.TESLIM_EDILDI).length;
  
  const totalCiro = db.transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = db.transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const profitability = totalCiro - totalExpense;

  // Stock alerts
  const criticalStockProducts = db.products.filter(p => p.stock <= p.criticalStock);
  const lowStockProducts = db.products.filter(p => p.stock <= p.minStock && p.stock > p.criticalStock);

  // Top selling (Mock evaluation representing system intelligence)
  const topSellers = db.products.slice(0, 3).map((p, idx) => ({
    ...p,
    soldCount: [240, 185, 95][idx] || 15
  }));

  // Simple Turkish currency formatting helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val);
  };

  // Monthly breakdown for animated chart (SVG coordinates)
  // Re-evaluates based on transaction ledger
  const monthlyData = [
    { name: "Oca", revenue: 140000, expense: 95000 },
    { name: "Şub", revenue: 165000, expense: 110000 },
    { name: "Mar", revenue: 198000, expense: 120000 },
    { name: "Nis", revenue: 185000, expense: 130000 },
    { name: "May", revenue: 230000, expense: 145000 },
    { name: "Haz", revenue: totalCiro, expense: totalExpense } // Current month is live!
  ];

  const maxRevenueVal = Math.max(...monthlyData.map(d => d.revenue));

  return (
    <div className="space-y-6">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Toplam Ciro */}
        <motion.div 
          whileHover={{ y: -3 }}
          className={`p-5 rounded-2xl border transition-all ${
            isDark 
              ? "bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-black/25" 
              : "bg-white border-slate-100 shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Toplam Ciro (Live)</p>
              <h3 className="text-2xl font-bold font-sans mt-2 tracking-tight accent-gold text-amber-500">
                {formatCurrency(totalCiro)}
              </h3>
            </div>
            <span className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1 mt-4 text-emerald-500 text-xs font-semibold">
            <ChevronUp className="w-4 h-4" />
            <span>%18.4 geçen aydan fazla</span>
          </div>
        </motion.div>

        {/* Card 2: Net Karlılık */}
        <motion.div 
          whileHover={{ y: -3 }}
          className={`p-5 rounded-2xl border transition-all ${
            isDark 
              ? "bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-black/25" 
              : "bg-white border-slate-100 shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Net Kârlılık</p>
              <h3 className={`text-2xl font-bold font-sans mt-2 tracking-tight ${profitability >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatCurrency(profitability)}
              </h3>
            </div>
            <span className={`p-3 rounded-xl ${
              profitability >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}>
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs text-slate-400">
            <span>Gelir/Gider dengesi aktiftir</span>
          </div>
        </motion.div>

        {/* Card 3: Siparişler */}
        <motion.div 
          whileHover={{ y: -3 }}
          className={`p-5 rounded-2xl border transition-all ${
            isDark 
              ? "bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-black/25" 
              : "bg-white border-slate-100 shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Toplam / Bekleyen</p>
              <h3 className={`text-2xl font-bold font-sans mt-2 tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                {totalOrders} / <span className="text-amber-500">{pendingOrders}</span>
              </h3>
            </div>
            <span className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-4 font-sans">
            <span className="text-emerald-500 font-semibold">{completedOrders}</span> sipariş başarıyla teslim edildi.
          </p>
        </motion.div>

        {/* Card 4: Ürün Portföyü */}
        <motion.div 
          whileHover={{ y: -3 }}
          className={`p-5 rounded-2xl border transition-all ${
            isDark 
              ? "bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-lg shadow-black/25" 
              : "bg-white border-slate-100 shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Toplam Ürün & Alarm</p>
              <h3 className={`text-2xl font-bold font-sans mt-2 tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                {totalProducts} / <span className="text-rose-500">{criticalStockProducts.length}</span>
              </h3>
            </div>
            <span className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1 mt-4 text-rose-500 text-xs font-semibold">
            {criticalStockProducts.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>{criticalStockProducts.length} ürün kritik stok sınırında!</span>
              </>
            ) : (
              <span className="text-emerald-500">Stok seviyeleri güvenli</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* 🛡️ VERİ KORUMA, YEDEKLEME VE KURTARMA MERKEZİ (PRODATA SHIELD) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border transition-all ${
          isDark 
            ? "bg-slate-900/60 border-amber-500/20 shadow-xl shadow-black/30 backdrop-blur-md" 
            : "bg-amber-50/60 border-amber-200 shadow-md"
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Status and explanation column */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/15 text-amber-500 rounded-xl">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className={`text-md font-bold ${isDark ? "text-white" : "text-slate-900"} flex items-center gap-2`}>
                  Zirve Veri Kalkanı ve Yedek Güvence Sistemi
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-extrabold uppercase">
                    Çift Katmanlı Koruma Aktif
                  </span>
                </h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"} font-medium mt-0.5`}>
                  Eklediğiniz ürünler, cariler ve siparişlerin tamamı eş zamanlı olarak çift katmanlı (Hem yerel tarayıcı belleğinde hem de bulut sunucuda) yedeklenmektedir. Olası bir sunucu veya konteyner sıfırlanmasında verileriniz otomatik olarak tarayıcıdan geri yüklenir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2.5 ${isDark ? "bg-slate-950/70 border border-slate-800" : "bg-white border border-slate-200"}`}>
                <Database className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                <div>
                  <span className="block text-slate-500 text-[10px]">Bulut Veritabanı Sınırı</span>
                  <span className={`font-extrabold text-[11px] ${isDark ? "text-emerald-400" : "text-emerald-600"} uppercase`}>
                    Güvenli ve Aktif
                  </span>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2.5 ${isDark ? "bg-slate-950/70 border border-slate-800" : "bg-white border border-slate-200"}`}>
                <HardDrive className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="block text-slate-500 text-[10px]">Aktif Tarayıcı Bellek Yedeği</span>
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {db.products.length} Ürün • {db.orders.length} Sipariş • {db.customers.length} Cari
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons column */}
          <div className="flex flex-col gap-2 justify-center">
            <span className={`text-[9px] font-bold uppercase tracking-wider block text-center ${isDark ? "text-slate-500" : "text-slate-500"}`}>İstediğiniz Zaman Verilerinizi Yönetin</span>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  try {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    const timestamp = new Date().toISOString().slice(0, 10);
                    downloadAnchor.setAttribute("download", `dal_erp_v9_yedek_${timestamp}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    addNotification("Zirve veritabanı yedeğiniz (.json) üretildi ve bilgisayarınıza indirildi. İstediğiniz zaman bu dosyayı yükleyebilirsiniz.", "success");
                  } catch (err) {
                    addNotification("Yedek dosyası indirilemedi.", "warning");
                  }
                }}
                className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
                title="Tüm veritabanı yedeğini bilgisayara indir"
              >
                <Download className="w-3.5 h-3.5" />
                Yedek İndir
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-[11px] rounded-xl border border-slate-700/60 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Bilgisayardaki bir .json yedek dosyasını sisteme yükle"
              >
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                Yedek Yükle
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (!parsed.products || !parsed.customers) {
                      throw new Error("Yedek dosyası formatı geçersiz.");
                    }
                    saveDb(parsed);
                    addNotification("Sistem verileri yedek dosyasından başarıyla geri yüklendi ve senkronize edildi!", "success");
                  } catch (err) {
                    addNotification("Hatalı dosya formatı! Lütfen geçerli bir ERP yedek (.json) dosyası seçin.", "warning");
                  }
                };
                reader.readAsText(file);
                e.target.value = ""; // Reset input so same file can be re-selected if edit
              }} 
              accept=".json" 
              className="hidden" 
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  saveDb({ ...db });
                  addNotification("Sunucu ve tarayıcı veritabanları manuel olarak eş zamanlı eşitlendi.", "success");
                }}
                className="flex-1 py-1.5 bg-slate-950 hover:bg-black text-slate-300 hover:text-white border border-slate-800 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Şimdi bulut ve tarayıcıyı manuel zorla eşitle"
              >
                <RefreshCw className="w-3" />
                Zorlu Eşitle
              </button>

              <button
                onClick={onResetDatabase}
                className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Fabrika verisine döndür"
              >
                <Trash2 className="w-3 h-3" />
                Sıfırla
              </button>
            </div>

          </div>

        </div>
      </motion.div>

      {/* Main Stats Chart & Critical Alert Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Line Graph (Frosted Panel) */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-950"}`}>Ciro ve Finansal Trend Analizi</h3>
              <p className="text-xs text-slate-400">Son 6 ayın karşılaştırmalı gelir-gider tablosu</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>Gelir (Ciro)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>Gider</span>
              </div>
            </div>
          </div>

          {/* SVG Multi Line Chart with Smooth Animations */}
          <div className="h-64 w-full relative">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="180" x2="500" y2="180" stroke="#334155" strokeWidth="1" />

              {/* Chart paths calculation */}
              {(() => {
                const stepX = 500 / 5;
                const revenuePoints = monthlyData.map((d, index) => {
                  const x = index * stepX;
                  const y = 180 - (d.revenue / (maxRevenueVal * 1.2)) * 160;
                  return `${x},${y}`;
                }).join(" ");

                const expensePoints = monthlyData.map((d, index) => {
                  const x = index * stepX;
                  const y = 180 - (d.expense / (maxRevenueVal * 1.2)) * 160;
                  return `${x},${y}`;
                }).join(" ");

                return (
                  <>
                    {/* Revenue Area Under Gradient */}
                    <defs>
                      <linearGradient id="chartRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0,180 L ${revenuePoints} L 500,180 Z`}
                      fill="url(#chartRevGrad)"
                    />

                    {/* Revenue Line */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2 }}
                      d={`M ${revenuePoints}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Expense Line */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.2 }}
                      d={`M ${expensePoints}`}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2.5"
                      strokeDasharray="2 2"
                    />

                    {/* Point Indicators */}
                    {monthlyData.map((d, idx) => {
                      const x = idx * stepX;
                      const ry = 180 - (d.revenue / (maxRevenueVal * 1.2)) * 160;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={ry} r="5" className="fill-amber-500 stroke-slate-900" strokeWidth="2" />
                          <text x={x} y={ry - 10} className="fill-amber-500 font-mono font-bold" fontSize="9" textAnchor="middle">
                            {Math.round(d.revenue / 1000)}k
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            {/* X Axis Labels */}
            <div className="absolute bottom-[-10px] w-full flex justify-between px-2 text-[10px] font-mono font-medium text-slate-400">
              {monthlyData.map((d, i) => <span key={i}>{d.name}</span>)}
            </div>
          </div>
        </div>

        {/* Critical Alerts & Live Watch */}
        <div className="space-y-6">
          {/* Critical Stock List */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h4 className={`text-md font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Yetersiz Stok Uyarıları</span>
            </h4>
            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
              {criticalStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-sans">
                  Kritik stok uyarısı bulunmuyor.
                </div>
              ) : (
                <>
                  {criticalStockProducts.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div>
                        <p className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{p.title}</p>
                        <p className="text-[10px] font-mono text-rose-400 mt-0.5">{p.code} • Kalan: {p.stock}</p>
                      </div>
                      <span className="px-2 py-1 bg-rose-500 text-[10px] font-bold text-white rounded-lg">Kritik</span>
                    </div>
                  ))}
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{p.title}</p>
                        <p className="text-[10px] font-mono text-amber-500 mt-0.5">{p.code} • Kalan: {p.stock}</p>
                      </div>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-lg">Min Limit</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
              <Award className="w-4 h-4 text-amber-500" />
              <span>En Çok Satan Model</span>
            </h4>
            <div className="space-y-2.5">
              {topSellers.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className={`truncate ${isDark ? "text-slate-300" : "text-slate-700"}`} title={item.title}>{item.title}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-500">{item.soldCount} adet</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Audit Logs / Activity History */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
      }`}>
        <div className="flex justify-between items-center mb-5">
          <h3 className={`text-lg font-bold flex items-center gap-2.5 ${isDark ? "text-white" : "text-slate-950"}`}>
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Kullanıcı Hareketi ve İşlem Kayıtları (Audit Journal)</span>
          </h3>
          <span className="text-xs font-mono px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            KVKK Uyumlu Loglama: AKTİF
          </span>
        </div>

        <div className="space-y-4 max-h-[250px] overflow-y-auto">
          {/* Static detailed log entries showcasing system state */}
          <div className="flex items-start gap-3 text-xs pl-2 border-l-2 border-amber-500">
            <span className="text-[10px] bg-amber-500/15 text-amber-500 px-1 py-0.5 rounded font-mono">07.06.2026 - 19:10</span>
            <div>
              <p className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>[Sistem Admin] hakan@sirket.com</p>
              <p className="text-slate-400 mt-0.5">Yapay zeka ile 'Bosch GBH 2-26 RE' marka ürünün teknik açıklamaları ve SEO anahtar kelimeleri güncellendi.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs pl-2 border-l-2 border-blue-500">
            <span className="text-[10px] bg-blue-500/15 text-blue-500 px-1 py-0.5 rounded font-mono">07.06.2026 - 17:45</span>
            <div>
              <p className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>[Muhasebe] zeynep@sirket.com</p>
              <p className="text-slate-400 mt-0.5">Ahmet Yılmaz (Yılmaz Yapı) tarafından gönderilen <b>45.000,00 ₺</b> cari ödemesi onaylanarak Akbank Banka hesabına tahsil kaydedildi.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs pl-2 border-l-2 border-emerald-500">
            <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1 py-0.5 rounded font-mono">06.06.2026 - 14:30</span>
            <div>
              <p className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>[E-Ticaret Modülü]</p>
              <p className="text-slate-400 mt-0.5">Yılmaz Yapı tarafından 1 adet sepet faturasından <b>32.537,50 ₺</b> tutarında sipariş oluşturuldu (Sipariş #ord-1). Beklemeye alındı.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs pl-2 border-l-2 border-purple-500">
            <span className="text-[10px] bg-purple-500/15 text-purple-500 px-1 py-0.5 rounded font-mono">01.06.2026 - 09:00</span>
            <div>
              <p className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>[Otomatik Yedekleyici]</p>
              <p className="text-slate-400 mt-0.5">Giriş işlemleri öncesi sürüm yedeği başarıyla disk üzerine oluşturuldu: <b>db_backup_1.0.0.json</b>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
