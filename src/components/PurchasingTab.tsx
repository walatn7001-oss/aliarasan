/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle,
  TrendingDown, 
  TrendingUp,
  Sliders,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";
import { DatabaseState, Transaction, Product } from "../types";

interface PurchasingTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function PurchasingTab({ db, saveDb, addNotification, isDark }: PurchasingTabProps) {
  // Tabs: list, add
  const [activeSubTab, setActiveSubTab] = useState<"list" | "form">("list");
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [flowType, setFlowType] = useState<"gider" | "gelir">("gider"); // gider = Alış, gelir = Satış
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  
  // Custom manual inputs (if not choosing existing items)
  const [manualTitle, setManualTitle] = useState("");
  const [manualParty, setManualParty] = useState(""); // manual customer/vendor name
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("Adet");
  const [accountType, setAccountType] = useState<"cash" | "bank">("bank");
  const [accountName, setAccountName] = useState("Akbank Ticari");
  const [category, setCategory] = useState("Mağaza Gideri");

  // Filtered lists
  const filteredTransactions = useMemo(() => {
    // We filter standard expense/income logs
    const list = db.transactions.filter(t => {
      // Include any transactions related to Mağaza or Alış/Satış/Cari
      return (
        t.category === "Mağaza Gideri" || 
        t.category === "Mağaza Satışı" || 
        t.category === "Mal Alımı" ||
        t.category === "Cari Tahsilat / Ödeme" ||
        t.description.toLowerCase().includes("alış") ||
        t.description.toLowerCase().includes("satış") ||
        t.description.toLowerCase().includes("gider")
      );
    });

    if (!searchTerm.trim()) return list;
    const query = searchTerm.toLowerCase();
    return list.filter(t => 
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.accountName.toLowerCase().includes(query)
    );
  }, [db.transactions, searchTerm]);

  // Financial Stats
  const totalGider = useMemo(() => {
    return db.transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [db.transactions]);

  const totalGelir = useMemo(() => {
    return db.transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [db.transactions]);

  const netBalance = totalGelir - totalGider;

  // Handle product selection to auto-fill prices
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;

    const product = db.products.find(p => p.id === prodId);
    if (product) {
      setUnitPrice(flowType === "gider" ? product.purchasePrice : product.price);
      setUnit(product.unit || "Adet");
      setManualTitle(`${product.brand} ${product.title}`);
    }
  };

  // Handle Customer selection
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) return;

    const customer = db.customers.find(c => c.id === custId);
    if (customer) {
      setManualParty(customer.companyName || customer.name);
    }
  };

  // Record buying & selling operation
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = manualTitle.trim() || (selectedProductId ? "Ürün Hareketi" : "Serbest Gider");
    const finalParty = manualParty.trim() || "Diğer Cari / Cari Dışı Alıcı";
    const totalAmount = unitPrice * quantity;

    if (totalAmount <= 0) {
      addNotification("Lütfen geçerli bir birim fiyatı ve miktar girin.", "warning");
      return;
    }

    // Create transactional record
    const newTx: Transaction = {
      id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
      type: flowType === "gider" ? "expense" : "income",
      amount: totalAmount,
      description: `[Mağaza ${flowType === "gider" ? "Alış/Gider" : "Satış/Gelir"}] ${finalParty} - ${finalTitle} (${quantity} ${unit})`,
      date: new Date().toISOString(),
      category: flowType === "gider" ? "Mağaza Gideri" : "Mağaza Satışı",
      accountType,
      accountName
    };

    // Prepare updated products list
    let updatedProducts = [...db.products];
    if (selectedProductId) {
      updatedProducts = db.products.map(p => {
        if (p.id === selectedProductId) {
          // If buying, stock increases. If selling, stock decreases.
          const adjustment = flowType === "gider" ? quantity : -quantity;
          const finalStock = Math.max(0, p.stock + adjustment);
          return { ...p, stock: finalStock };
        }
        return p;
      });
    }

    // Prepare updated customers list if credit/debts change
    let updatedCustomers = [...db.customers];
    if (selectedCustomerId) {
      updatedCustomers = db.customers.map(c => {
        if (c.id === selectedCustomerId) {
          // If selling to them on account, they owe us more (debt increases)
          // If buying from them on account, we owe them (credit increases)
          if (flowType === "gelir") {
            return { ...c, debt: c.debt + totalAmount };
          } else {
            return { ...c, credit: c.credit + totalAmount };
          }
        }
        return c;
      });
    }

    // Save DB
    saveDb({
      ...db,
      transactions: [newTx, ...db.transactions],
      products: updatedProducts,
      customers: updatedCustomers
    });

    addNotification(
      `Mağaza ${flowType === "gider" ? "alış" : "satış"} kaydı başarıyla girildi. Hareket kaydedildi, stok ve cari bakiyeler düzenlendi.`,
      "success"
    );

    // Reset form states
    setSelectedProductId("");
    setSelectedCustomerId("");
    setManualTitle("");
    setManualParty("");
    setUnitPrice(0);
    setQuantity(1);
    setActiveSubTab("list");
  };

  // Delete transaction
  const handleDeleteTx = (id: string, name: string) => {
    if (confirm(`"${name}" işlemini silmek istediğinize emin misiniz?`)) {
      const updated = db.transactions.filter(t => t.id !== id);
      saveDb({ ...db, transactions: updated });
      addNotification("Seçilen haraket günlüğü silindi.", "info");
    }
  };

  return (
    <div className="space-y-6 text-xs font-sans">
      
      {/* SECTION 1: Metrics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Purchases/Expenses */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Toplam Mağaza Alış & Gider</span>
            <span className="text-lg font-extrabold font-mono text-rose-500 mt-1 block">
              {totalGider.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-550">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Sales */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Toplam Mağaza Satış & Gelir</span>
            <span className="text-lg font-extrabold font-mono text-emerald-500 mt-1 block">
              {totalGelir.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-550">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Net Profit Balance */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Net Dengelenen Kar/Zarar</span>
            <span className={`text-lg font-extrabold font-mono mt-1 block ${netBalance >= 0 ? "text-amber-500" : "text-rose-500"}`}>
              {netBalance.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* SECTION 2: Toolbar & Tabs */}
      <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
          <button
            onClick={() => setActiveSubTab("list")}
            className={`px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === "list" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Gider & Satış Günlükleri
          </button>
          <button
            onClick={() => setActiveSubTab("form")}
            className={`px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === "form" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Alış / Gider / Satış Ekle
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Açıklama, Cari veya Hesap ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg outline-none text-white text-[11px]"
          />
        </div>
      </div>

      {/* SECTION 3: Content Displays */}
      {activeSubTab === "list" ? (
        <div className={`p-6 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              <ShoppingCart className="w-4 h-4 text-amber-500" />
              <span>Mağaza Cari Hareket Defteri (Alışlar & Satışlar)</span>
            </h3>
            <span className="text-[10px] text-slate-500">{filteredTransactions.length} Kayıt Listeleniyor</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 pb-2">
                  <th className="py-2.5 font-semibold">Tarih / Zaman</th>
                  <th className="py-2.5 font-semibold">Hareket Türü</th>
                  <th className="py-2.5 font-semibold">Cari & Açıklama</th>
                  <th className="py-2.5 font-semibold">Kasa / Banka Detayı</th>
                  <th className="py-2.5 font-semibold text-right">Tutar</th>
                  <th className="py-2.5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 italic">
                      Tanımlı veya arama kriterine uyan haraket/gider kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => {
                    const isExpense = t.type === "expense";
                    return (
                      <tr key={t.id} className="border-b border-slate-800/40 hover:bg-slate-950/20">
                        <td className="py-3 text-slate-400 font-mono text-[10px]">
                          {new Date(t.date).toLocaleDateString("tr-TR")} {new Date(t.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isExpense ? "bg-rose-500/10 text-rose-400 border border-rose-500/10" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                          }`}>
                            {isExpense ? "ALIŞ / GİDER" : "SATIŞ / GELİR"}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-slate-200">
                          {t.description}
                          <span className="block text-[10px] text-slate-500 mt-0.5">{t.category}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-slate-355 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                            {t.accountName} <span className="text-[10px] text-slate-500">({t.accountType === "cash" ? "Kasa" : "Banka"})</span>
                          </span>
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${isExpense ? "text-rose-450" : "text-emerald-400"}`}>
                          {isExpense ? "-" : "+"}{t.amount.toLocaleString("tr-TR")} ₺
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleDeleteTx(t.id, t.description)}
                            className="p-1 hover:bg-rose-500/15 rounded text-rose-400 transition-all"
                            title="İşlemi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <h3 className={`text-sm font-bold mb-5 flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Mağaza Çift Yönlü Alış / Satış / Gider Kayıt Paneli</span>
          </h3>

          <form onSubmit={handleAddTransaction} className="space-y-4">
            
            {/* Selection of Flow Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">1. İşlem Cari Yönü</label>
                <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => { setFlowType("gider"); setCategory("Mağaza Gideri"); }}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      flowType === "gider" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-slate-500 hover:text-white"
                    }`}
                  >
                    ↙ Alış / Gider (Kasa Çıkışı)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFlowType("gelir"); setCategory("Mağaza Satışı"); }}
                    className={`py-2 rounded-lg font-bold transition-all text-xs ${
                      flowType === "gelir" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-500 hover:text-white"
                    }`}
                  >
                    ↗ Satış / Gelir (Kasa Girişi)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Kasa-Banka Hesabı</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as "cash" | "bank")}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="bank">Banka Hesabı</option>
                    <option value="cash">Nakit Kasa</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Akbank / Merkez Kasa"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Product Integrations */}
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                  Mevcut Stok Ürünü Bağla <span className="text-slate-500 font-normal">(Stok miktarını otomatik günceller)</span>
                </label>
                <div className="flex gap-2">
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-500 flex items-center justify-center">
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="">-- Serbest Giriş (Stoksuz Gider/Gelir) --</option>
                    {db.products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.title} (Mevcut: {p.stock} {p.unit || "Adet"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Linkage */}
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                  İlişkili Cari Mükellef Kartı <span className="text-slate-500 font-normal">(Cari borcun/alacağın otomatik işler)</span>
                </label>
                <div className="flex gap-2">
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-500 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="">-- Serbest Alıcı / Cari Dışı Giriş --</option>
                    {db.customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Manual Entries (Failsafe fallback & customization) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">* İşlem / Malzeme / Başlık Açıklaması</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Koli faturası, Nakliye ücreti, Sika silikon alımı, vb."
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Muhatap Firma / Ödemeyi Alan-Yapan</label>
                <input
                  type="text"
                  value={manualParty}
                  onChange={(e) => setManualParty(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="X Ticaret A.Ş, Ahmet Demir, Merkez Kasa"
                />
              </div>
            </div>

            {/* Calculations and Quantities */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Birim Fiyatı (₺)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={unitPrice || ""}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Miktar</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Birim Seti</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  <option value="Adet">Adet</option>
                  <option value="Metre">Metre</option>
                  <option value="Koli">Koli</option>
                  <option value="Paket">Paket</option>
                  <option value="Kg">Kilogram (Kg)</option>
                  <option value="Litre">Litre</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Harcama Kategorisi</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Koli Ödemesi / Mağaza Gideri"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[11px] text-rose-400 font-semibold mb-1">Hesaplanan Toplam Tutar</label>
                <div className="p-2.5 bg-slate-950/60 rounded-xl font-mono font-bold text-center border border-dashed border-slate-800 text-amber-500 pr-3">
                  {(unitPrice * quantity).toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>

            {/* Action Triggers */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setActiveSubTab("list"); }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl font-semibold text-slate-200"
              >
                Geri Dön / İptal
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 font-bold rounded-xl text-slate-950 transition-all ${
                  flowType === "gider" ? "bg-rose-500 hover:bg-rose-400" : "bg-emerald-500 hover:bg-emerald-400"
                }`}
              >
                {flowType === "gider" ? "↙ Gider / Alış İrsaliyesini İşle" : "↗ Satış / Gelir Makbuzunu Kaydet"}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
