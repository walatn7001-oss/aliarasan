/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  TrendingUp, 
  ChevronRight, 
  RefreshCcw, 
  Bot, 
  VolumeX, 
  Volume2, 
  CalendarDays, 
  DollarSign, 
  Percent, 
  Activity,
  Award
} from "lucide-react";
import { DatabaseState } from "../types";

interface AIAssistantTabProps {
  db: DatabaseState;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function AIAssistantTab({ db, addNotification, isDark }: AIAssistantTabProps) {
  const [activeAIModule, setActiveAIModule] = useState<"desc" | "forecast">("desc");

  // Module 1: AI Description Generator State
  const [prodTitle, setProdTitle] = useState("");
  const [prodCategory, setProdCategory] = useState("Elektrikli El Aletleri");
  const [prodBrand, setProdBrand] = useState("");
  const [aiResult, setAiResult] = useState<{ description: string; seoKeywords: string[] } | null>(null);
  const [isLoadingDesc, setIsLoadingDesc] = useState(false);

  // Module 2: AI Forecasting state
  const [forecastResult, setForecastResult] = useState<{
    forecast: { ay: string; ciro: number }[];
    demandAnalysis: string;
    pricingTips: string;
    campaignIdeas: string;
  } | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);

  // Call `/api/gemini/generate-description`
  const handleGenerateDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim() || !prodBrand.trim()) {
      addNotification("Lütfen ürün başlığı ve marka bilgilerini doldurunuz.", "warning");
      return;
    }

    setIsLoadingDesc(true);
    setAiResult(null);

    try {
      const response = await fetch("/api/gemini/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle: prodTitle,
          category: prodCategory,
          brand: prodBrand
        })
      });

      if (!response.ok) throw new Error("AI API endpoint returned non-ok status");
      
      const data = await response.json();
      setAiResult(data);
      addNotification("Yapay zekâ ürün açıklaması ve SEO anahtar kelimeleri başarıyla üretildi!", "success");
    } catch (err) {
      console.error(err);
      addNotification("Yapay zeka erişiminde hata oluştu. Lütfen bağlantınızı kontrol edin.", "warning");
    } finally {
      setIsLoadingDesc(false);
    }
  };

  // Call `/api/gemini/sales-forecast`
  const handleGenerateForecast = async () => {
    setIsLoadingForecast(true);
    setForecastResult(null);

    // Calculate real physical metrics to feeding our Gemini Prompt
    const currentInventoryValue = db.products.reduce((acc, p) => acc + ((p.stock || 0) * (p.purchasePrice || 0)), 0);
    const totalSalesLastQuarter = db.transactions
      .filter(t => t.type === "income" && t.category.includes("Satış"))
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const criticalStockItemsCount = db.products.filter(p => (p.stock || 0) <= (p.criticalStock || 0)).length;
    const currentCashBalance = db.transactions.reduce((acc, t) => acc + (t.type === "income" ? (t.amount || 0) : -(t.amount || 0)), 0);

    // Filter transaction historicals
    const history = db.transactions.map(t => ({
      amount: t.amount,
      category: t.category,
      date: t.date,
      type: t.type
    }));

    try {
      const response = await fetch("/api/gemini/sales-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          historicalData: history,
          currentInventoryValue,
          totalSalesLastQuarter,
          criticalStockItemsCount,
          currentCashBalance
        })
      });

      if (!response.ok) throw new Error("AI forecasting API returned error");

      const data = await response.json();
      setForecastResult(data);
      addNotification("Yapay zekâ makine öğrenmeli talep tahmini ve kampanya simülasyonu başarıyla tamamlandı!", "success");
    } catch (err) {
      console.error(err);
      addNotification("Öngörü hesabı sırasında bir veri senkronizasyonu hatası oluştu.", "warning");
    } finally {
      setIsLoadingForecast(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Decisiveness header */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </span>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Gemini AI • Yapay Zekâ Karar Destek Merkezi
            </h3>
            <p className="text-xs text-slate-500">Milyarlarca parametre gücündeki dil modelleriyle ERP verileriniz üzerinde tahminleme ve otomasyon</p>
          </div>
        </div>
      </div>

      {/* Selector tab row */}
      <div className="flex bg-slate-800/40 p-1 border border-slate-800 rounded-2xl w-max">
        <button
          onClick={() => setActiveAIModule("desc")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeAIModule === "desc" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          AI Akıllı Ürün Açıklaması & Tanımı
        </button>
        <button
          onClick={() => setActiveAIModule("forecast")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeAIModule === "forecast" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          AI Talep Öngörü & Fiyatlama Analisti
        </button>
      </div>

      {/* MODULE 1: AI Description Generator & copy system */}
      {activeAIModule === "desc" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Creator Inputs Form */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <h4 className="font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">Ürün Bilgilerini Tanımla</h4>
            
            <form onSubmit={handleGenerateDescription} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-slate-450 uppercase mb-1.5 font-bold">* Ürün Başlığı / Adı</label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Örn: SDS Plus Akülü Merdiven Matkabı"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1.5 font-bold">* Marka</label>
                  <input
                    type="text"
                    required
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Örn: Bosch Professional"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1.5 font-bold">Kategori Sektörü</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="Elektrikli El Aletleri">Elektrikli El Aletleri</option>
                    <option value="Yapı Kimyasalları">Yapı Kimyasalları</option>
                    <option value="Hırdavat & Bağlantı">Hırdavat & Bağlantı Elemanları</option>
                    <option value="İş Güvenliği">İş Güvenliği & Çevre</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingDesc}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-xl hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 transition-all text-xs uppercase flex items-center justify-center gap-2"
              >
                {isLoadingDesc ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    <span>Gemini ile Metinler Dokunuyor...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Ürün Metinlerini ve SEO'yu Oluştur (Gemini)</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* AI Resulting Block */}
          <div className="space-y-4">
            {isLoadingDesc && (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Bot className="w-12 h-12 text-amber-500/40 mx-auto animate-bounce mb-3" />
                Düşünce motoru çalışıyor. Gemini dil verilerini KDV ve marka şartlarına göre yapılandırıyor...
              </div>
            )}

            {!isLoadingDesc && !aiResult && (
              <div className="p-12 border border-dashed border-slate-800/80 rounded-2xl text-center text-slate-550 text-xs">
                Üretilen SEO başlıkları ve profesyonel ERP katalog açıklamaları burada görünecektir. Saniyeler içinde tamamlayın.
              </div>
            )}

            {!isLoadingDesc && aiResult && (
              <div className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-105 shadow"
              } space-y-4`}>
                
                {/* Simulated metadata banner */}
                <div className="p-2 border-l-2 border-emerald-500 bg-emerald-500/5 rounded-r-lg text-[11px] text-emerald-400">
                  ✔ Gemini AI v3.5-Flash tescilli katalog dökümü oluşturdu.
                </div>

                <div>
                  <h5 className="text-[10px] font-bold text-slate-450 uppercase mb-1.5">Oluşturulan ERP Katalog Tanımı:</h5>
                  <p className="text-xs p-3.5 bg-slate-950 border border-slate-850 rounded-xl leading-relaxed text-slate-300">
                    {aiResult.description}
                  </p>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold text-slate-450 uppercase mb-1.5">SEO Etiketleri & Meta Kelimeleri:</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.seoKeywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-0.5 bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 rounded font-mono">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* MODULE 2: AI Forecasting and pricing optimation */}
      {activeAIModule === "forecast" && (
        <div className={`p-6 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-805" : "bg-white border-slate-100"
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/60">
            <div>
              <h4 className="font-bold text-sm text-slate-200">Talep Tahmini & Yapay Zekâ Fiyatlandırma Simulasyonu</h4>
              <p className="text-xs text-slate-500">Geçmiş satış makbuzlarını KDV ve mevsimsel katsayılarla işleme alarak rekolte tahmini</p>
            </div>

            <button
              onClick={handleGenerateForecast}
              disabled={isLoadingForecast}
              className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs uppercase flex items-center gap-2 shadow-lg"
            >
              {isLoadingForecast ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Satış Akışları Çözümleniyor...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Yapay Zekâ Öngörü Analizini Başlat</span>
                </>
              )}
            </button>
          </div>

          {isLoadingForecast && (
            <div className="p-16 text-center text-slate-500 text-xs">
              <Bot className="w-12 h-12 text-amber-500/40 mx-auto animate-bounce mb-3" />
              Muhasebe defterlerindeki gelir-gider verileri toplanıyor... Mevsimsel talep indeksleri çıkarılıyor...
            </div>
          )}

          {!isLoadingForecast && !forecastResult && (
            <div className="p-12 border-2 border-dashed border-slate-805 rounded-xl text-center text-slate-550 text-xs">
              Mevcut muhasebe ve depo hareket bilgilerinize göre 3 aylık ciro tahmini, KDV dahil fiyatlama önerileri ve yeni pazarlama kampanyaları türetmek için yukarıdaki butona tıklayın.
            </div>
          )}

          {!isLoadingForecast && forecastResult && (
            <div className="space-y-6">
              
              {/* Output cards row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Forecast trend cards */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl">
                  <h5 className="font-bold text-[10px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Önümüzdeki 3 Aylık Ciro Projeksiyonu
                  </h5>
                  <div className="space-y-2 font-mono">
                    {forecastResult.forecast.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                        <span>{f.ay}:</span>
                        <b className="text-white text-right font-bold ml-4">{f.ciro.toLocaleString("tr-TR")} ₺</b>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Optimizer insights */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-1.5 text-xs text-slate-350">
                  <h5 className="font-bold text-[10px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    <Percent className="w-4 h-4" />
                    KDV & Döviz Dahil Fiyatlama Tavsiyeleri
                  </h5>
                  <p className="leading-relaxed text-[11px] text-slate-300">
                    {forecastResult.pricingTips}
                  </p>
                </div>

                {/* Campaign generator ideas */}
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-1.5 text-xs text-slate-350">
                  <h5 className="font-bold text-[10px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    <Award className="w-4 h-4" />
                    Bayi Stok Tüketim Kampanyaları
                  </h5>
                  <p className="leading-relaxed text-[11px] text-slate-300">
                    {forecastResult.campaignIdeas}
                  </p>
                </div>

              </div>

              {/* In-depth Demand Text */}
              <div className="p-5 bg-slate-850 border border-slate-800 rounded-xl text-xs space-y-2">
                <h5 className="font-bold text-amber-500 uppercase tracking-wider">Detaylı Makro Talep ve Mevsimsel Sınav Analizi</h5>
                <p className="leading-relaxed text-slate-300 text-[11px]">
                  {forecastResult.demandAnalysis}
                </p>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
