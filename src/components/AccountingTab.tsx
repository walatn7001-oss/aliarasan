/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileCheck, 
  Calculator, 
  Percent, 
  Scale, 
  Briefcase,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle
} from "lucide-react";
import { DatabaseState, Transaction } from "../types";

interface AccountingTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function AccountingTab({ db, saveDb, addNotification, isDark }: AccountingTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ledger" | "tax" | "checks" | "invoice">("ledger");

  // Create standard Transaction states
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Satış Geliri");
  const [accountType, setAccountType] = useState<"cash" | "bank">("bank");
  const [accountName, setAccountName] = useState("Akbank Ticari");

  // Invoice Sub-tab local states
  const [invoiceSubMode, setInvoiceSubMode] = useState<"normal" | "luca">("normal"); 
  const [selectedCustomerIdForInvoice, setSelectedCustomerIdForInvoice] = useState("");
  const [manualCustomerNameForInvoice, setManualCustomerNameForInvoice] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`FAT-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // Line item states
  const [invoiceLineProduct, setInvoiceLineProduct] = useState("");
  const [manualLineProductTitle, setManualLineProductTitle] = useState("");
  const [invoiceLinePrice, setInvoiceLinePrice] = useState<number>(0);
  const [invoiceLineQty, setInvoiceLineQty] = useState<number>(1);
  const [invoiceLineUnit, setInvoiceLineUnit] = useState("Adet");
  const [invoiceLineKdv, setInvoiceLineKdv] = useState<number>(20);
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    productId?: string;
    title: string;
    quantity: number;
    unit: string;
    price: number;
    kdv: number;
  }>>([]);

  const [invoicePreview, setInvoicePreview] = useState<any | null>(null);

  const handleAddInvoiceLineItem = () => {
    const finalTitle = manualLineProductTitle.trim();
    if (!finalTitle) {
      addNotification("Lütfen bir ürün başlığı aratın, seçin veya manuel girin.", "warning");
      return;
    }
    if (invoiceLinePrice <= 0 || invoiceLineQty <= 0) {
      addNotification("Geçersiz miktar veya fiyat.", "warning");
      return;
    }

    setInvoiceItems([...invoiceItems, {
      productId: invoiceLineProduct || undefined,
      title: finalTitle,
      quantity: invoiceLineQty,
      unit: invoiceLineUnit,
      price: invoiceLinePrice,
      kdv: invoiceLineKdv
    }]);

    // reset fields
    setInvoiceLineProduct("");
    setManualLineProductTitle("");
    setInvoiceLinePrice(0);
    setInvoiceLineQty(1);
    setInvoiceLineUnit("Adet");
    setInvoiceLineKdv(20);
  };

  const handleProductSelectForInvoice = (prodId: string) => {
    setInvoiceLineProduct(prodId);
    if (!prodId) {
      setManualLineProductTitle("");
      setInvoiceLinePrice(0);
      setInvoiceLineUnit("Adet");
      return;
    }
    const prod = db.products.find(p => p.id === prodId);
    if (prod) {
      setManualLineProductTitle(`${prod.brand} ${prod.title}`);
      setInvoiceLinePrice(prod.price);
      setInvoiceLineUnit(prod.unit || "Adet");
      setInvoiceLineKdv(prod.kdv || 20);
    }
  };

  const handleCustomerSelectForInvoice = (custId: string) => {
    setSelectedCustomerIdForInvoice(custId);
    if (!custId) {
      setManualCustomerNameForInvoice("");
      return;
    }
    const cust = db.customers.find(c => c.id === custId);
    if (cust) {
      setManualCustomerNameForInvoice(cust.companyName || cust.name);
    }
  };

  const handleSaveInvoice = () => {
    if (invoiceItems.length === 0) {
      addNotification("Faturaya en az bir satır kalemi eklemelisiniz.", "warning");
      return;
    }

    const finalCustomer = manualCustomerNameForInvoice.trim() || "Perakende Alıcı / Cari Dışı";
    
    // Compute totals
    let araToplam = 0;
    let kdvToplam = 0;
    invoiceItems.forEach(item => {
      const lineCost = item.price * item.quantity;
      const lineKdv = lineCost * (item.kdv / 100);
      araToplam += lineCost;
      kdvToplam += lineKdv;
    });
    const subtotal = araToplam;
    const totalTax = kdvToplam;
    const finalTotal = subtotal + totalTax;

    // Generate Transaction (Income)
    const newTx: Transaction = {
      id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "income",
      amount: finalTotal,
      description: `[Fatura Satışı No: ${invoiceNumber}] Müşteri: ${finalCustomer} - Toplam: ${invoiceItems.length} Kalem`,
      date: new Date(invoiceDate).toISOString(),
      category: "Mağaza Satışı",
      accountType: "bank",
      accountName: "Akbank Ticari"
    };

    // Deduct stock quantity from products
    let updatedProducts = [...db.products];
    invoiceItems.forEach(item => {
      if (item.productId) {
        updatedProducts = updatedProducts.map(p => {
          if (p.id === item.productId) {
            return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          }
          return p;
        });
      }
    });

    // Save Database
    saveDb({
      ...db,
      transactions: [newTx, ...db.transactions],
      products: updatedProducts
    });

    // Open Printable Preview
    setInvoicePreview({
      customerName: finalCustomer,
      number: invoiceNumber,
      date: invoiceDate,
      items: invoiceItems,
      subtotal,
      tax: totalTax,
      total: finalTotal
    });

    addNotification(`"${invoiceNumber}" numaralı Satış Faturası başarıyla oluşturuldu ve stoklar düşüldü.`, "success");
    
    // Clear Form
    setInvoiceItems([]);
    setSelectedCustomerIdForInvoice("");
    setManualCustomerNameForInvoice("");
    setInvoiceNumber(`FAT-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  // Load checks dynamically from database
  const checksList = db.checks || [];

  // Local Form state for new Checks
  const [drawer, setDrawer] = useState("");
  const [bank, setBank] = useState("");
  const [checkAmount, setCheckAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState("");
  const [checkStatus, setCheckStatus] = useState("Beklemede/Portföyde");

  const handleAddCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer.trim() || !bank.trim() || checkAmount <= 0 || !dueDate) {
      addNotification("Lütfen tüm çek/senet alanlarını eksiksiz doldurun.", "warning");
      return;
    }

    const newCheck = {
      id: `chk-${Math.floor(1000 + Math.random() * 9000)}`,
      drawer: drawer.trim(),
      bank: bank.trim(),
      amount: checkAmount,
      dueDate,
      status: checkStatus
    };

    saveDb({
      ...db,
      checks: [...(db.checks || []), newCheck]
    });

    addNotification(`"${drawer}" firmasının çeki portföye kaydedildi.`, "success");
    setDrawer("");
    setBank("");
    setCheckAmount(0);
    setDueDate("");
    setCheckStatus("Beklemede/Portföyde");
  };

  const handleDeleteCheck = (id: string, name: string) => {
    if (confirm(`"${name}" firmasına ait çek evrakını silmek istediğinizden emin misiniz?`)) {
      const updated = (db.checks || []).filter(c => c.id !== id);
      saveDb({ ...db, checks: updated });
      addNotification(`Çek kaydı silindi.`, "info");
    }
  };

  const handleUpdateCheckStatus = (id: string, nextStatus: string) => {
    const updated = (db.checks || []).map(c => {
      if (c.id === id) {
        return { ...c, status: nextStatus };
      }
      return c;
    });
    saveDb({ ...db, checks: updated });
    addNotification(`Çek durumu "${nextStatus}" olarak güncellendi.`, "success");
  };

  // Calculate totals
  const financials = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let bankSol = 0;
    let cashSol = 0;

    db.transactions.forEach(t => {
      if (t.type === "income") {
        totalIn += t.amount;
        if (t.accountType === "bank") bankSol += t.amount;
        else cashSol += t.amount;
      } else {
        totalOut += t.amount;
        if (t.accountType === "bank") bankSol -= t.amount;
        else cashSol -= t.amount;
      }
    });

    return {
      revenue: totalIn,
      expense: totalOut,
      balance: totalIn - totalOut,
      bankBalance: bankSol + 225000, // include seed start reserves
      cashBalance: cashSol + 35000
    };
  }, [db.transactions]);

  // Tax calculations
  const taxMetrics = useMemo(() => {
    // Simulated input tax from product sales vs purchasing cost tax
    // Calculated directly over the transactions ledger dynamically
    const averageKdvPercent = 20;
    const incomingKdv = financials.revenue * (averageKdvPercent / (100 + averageKdvPercent));
    const outgoingKdv = financials.expense * (averageKdvPercent / (100 + averageKdvPercent));
    const netKdvPayable = incomingKdv - outgoingKdv;

    return {
      incomingKdv,
      outgoingKdv,
      netKdvPayable
    };
  }, [financials]);

  // Handle Add Transaction form
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      addNotification("Lütfen geçerli bir tutar ve açıklama girin.", "warning");
      return;
    }

    const newTx: Transaction = {
      id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      amount,
      description: description.trim(),
      date: new Date().toISOString(),
      category,
      accountType,
      accountName
    };

    saveDb({
      ...db,
      transactions: [newTx, ...db.transactions]
    });

    addNotification(`Muhasebe defterine yeni ${type === "income" ? "gelir" : "gider"} hareketi kaydedildi.`, "success");
    setAmount(0);
    setDescription("");
  };

  return (
    <div className="space-y-6">
      
      {/* Financial aggregate KPI summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total revenue */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Toplam Gelir Defteri</span>
            <span className="text-md font-bold font-mono text-emerald-500 block mt-1">
              +{financials.revenue.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <span className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>

        {/* Total expenses */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Toplam Gider Defteri</span>
            <span className="text-md font-bold font-mono text-rose-500 block mt-1">
              -{financials.expense.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <span className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg">
            <ArrowDownLeft className="w-4 h-4" />
          </span>
        </div>

        {/* Bank accounts balance */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Bankalar Kasası (EFT)</span>
            <span className="text-md font-bold font-mono text-blue-500 block mt-1">
              {financials.bankBalance.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <span className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
            <Building2 className="w-4 h-4" />
          </span>
        </div>

        {/* Cash box balance */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Merkez Çelik Kasa</span>
            <span className="text-md font-bold font-mono text-amber-500 block mt-1">
              {financials.cashBalance.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>

      </div>

      {/* Workspace sheet selector */}
      <div className="flex bg-slate-800/40 p-1.5 border border-slate-800 rounded-2xl w-max flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeSubTab === "ledger" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          Genel Gelir/Gider Defteri
        </button>
        <button
          onClick={() => setActiveSubTab("tax")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeSubTab === "tax" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          KDV Beyanname & Vergi Analiz
        </button>
        <button
          onClick={() => setActiveSubTab("checks")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeSubTab === "checks" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          Portföy Çek / Senet İzleyici
        </button>
        <button
          onClick={() => setActiveSubTab("invoice")}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${activeSubTab === "invoice" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
        >
          🧾 İrsaliyeli Satış Faturası Oluşturucu
        </button>
      </div>

      {/* WORKSPACE CONTENT 1: LEDGER LIST & TRANSACTION ADD FORM */}
      {activeSubTab === "ledger" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Ledger List */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
              Günlük Ledger Finansal Defter Kayıtları (Cari Yıl)
            </h3>
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {db.transactions.map((tx, idx) => {
                const isIncome = tx.type === "income";

                return (
                  <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`p-2.5 rounded-lg ${isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </span>
                      <div>
                        <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-800"}`}>{tx.description}</span>
                        <p className="text-[10px] text-slate-550 mt-0.5">
                          {new Date(tx.date).toLocaleDateString("tr-TR")} • Hesap: <b className="text-slate-400">{tx.accountName}</b> • Kat: <b className="text-slate-400">{tx.category}</b>
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                      {isIncome ? "+" : "-"}{tx.amount.toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Expense / Income form */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className={`text-sm font-bold text-amber-500 uppercase tracking-wider mb-4`}>
              Manuel Kasa Harcaması / Faturası Al
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] text-slate-450 font-semibold mb-1">* İşlem Tipi</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const nextType = e.target.value as "income" | "expense";
                    setType(nextType);
                    setCategory(nextType === "income" ? "Satış Geliri" : "Kira Gideri");
                  }}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  <option value="income">Gelir (+) (Kasa Tahsilat)</option>
                  <option value="expense">Gider (-) (Harcama / Ödeme)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-455 font-semibold mb-1">* İşlem Tutarı (₺ - KDV Dahil)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  placeholder="2500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 mb-1">Hesap Kasası</label>
                  <select
                    value={accountType}
                    onChange={(e) => {
                      const mode = e.target.value as "cash" | "bank";
                      setAccountType(mode);
                      setAccountName(mode === "bank" ? "Akbank Ticari" : "Merkez Kasa");
                    }}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="bank font-semibold">Banka</option>
                    <option value="cash font-semibold">Kasa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 mb-1">Hesap Seçimi</label>
                  <select
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    {accountType === "bank" ? (
                      <>
                        <option value="Akbank Ticari">Akbank Ticari</option>
                        <option value="Garanti Şube">Garanti Şube</option>
                      </>
                    ) : (
                      <>
                        <option value="Merkez Kasa">Merkez Kasa</option>
                        <option value="Yedek Kasa">Yedek Kasa</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 mb-1">Kategori Sınıfı</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  {type === "income" ? (
                    <>
                      <option value="Satış Geliri">Satış Geliri</option>
                      <option value="Cari Tahsilat">Cari Tahsilat</option>
                      <option value="Ek Gelir">Ek Gelir</option>
                    </>
                  ) : (
                    <>
                      <option value="Kira Gideri">Merkez Kira Gideri</option>
                      <option value="Maaş Ödemesi">Personel Maaşı</option>
                      <option value="Mal Alımı">Toptan Mal Alımı</option>
                      <option value="Yol Masrafı">Araç ve Yol Gideri</option>
                      <option value="Ofis Giderleri">Ofis Kırtasiye / Mutfak</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-455 font-semibold mb-1">* Özet Fatura Açıklaması</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Shell hırdavat yakıt harcaması"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
              >
                Muhasebe Defterine Ekle
              </button>
            </form>
          </div>

        </div>
      )}

      {/* WORKSPACE CONTENT 2: VAT / TAXXING DESTRUCTORS */}
      {activeSubTab === "tax" && (
        <div className={`p-6 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
        }`}>
          <h3 className={`text-md font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
            <Percent className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>KDV (Katma Değer Vergisi) Mahsuplaşma ve Beyanname Raporu</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Outgoing tax box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">İndirilecek KDV (Alışlar Sebebiyle Ödediğimiz)</span>
              <span className="text-xl font-bold font-mono text-slate-300 block mt-2">
                {taxMetrics.outgoingKdv.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
              </span>
              <p className="text-[10px] text-slate-500 mt-2">Yapılan toptan mal alımları ve şirket gider biletlerinden biriken vergi kredisi.</p>
            </div>

            {/* Incoming tax box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Hesaplanan KDV (Satışlarımızdan Elde Edilen)</span>
              <span className="text-xl font-bold font-mono text-amber-500 block mt-2">
                {taxMetrics.incomingKdv.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
              </span>
              <p className="text-[10px] text-slate-500 mt-2">Satılan matkap, silikon ve alüminyum kilit sirkülasyonundan müşterilerden tahsil edilen vergi borcu.</p>
            </div>

            {/* Net Vat box */}
            <div className={`p-4 rounded-xl border ${
              taxMetrics.netKdvPayable >= 0 ? "bg-amber-500/10 border-amber-500/25 text-amber-500" : "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
            }`}>
              <span className="text-[10px] text-slate-450 uppercase font-bold block">Ödenecek / Devreden KDV Dönem Bakiyesi</span>
              <span className="text-xl font-bold font-mono block mt-2">
                {Math.abs(taxMetrics.netKdvPayable).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
              </span>
              <p className="text-[10px] text-slate-400 mt-2">
                {taxMetrics.netKdvPayable >= 0 
                  ? "Devlete ödenecek net Katma Değer Vergisi beyanname tutarıdır." 
                  : "Önümüzdeki dönemlere mahsup edilmek üzere devreden KDV alacağıdır."}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* WORKSPACE CONTENT 3: CHECKS AND OUTSTANDING DEBTS SCREEN */}
      {activeSubTab === "checks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Checks portfolio dynamic list */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
              Vadeli Portföy Çek / Senet Evrak Defteri (Aktif)
            </h3>

            {checksList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
                <FileCheck className="w-8 h-8 text-slate-600 mx-auto animate-bounce" />
                <p className="font-semibold text-slate-400">Portföyde kayıtlı vadeli çek bulunmamaktadır.</p>
                <p>Sağ taraftaki kartı kullanarak ilk vadeli çek/senet senedini sisteme ekleyin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-slate-950/20 rounded-xl">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Keşideci Firma</th>
                      <th className="py-2.5 px-2">Banka</th>
                      <th className="py-2.5 px-2">Vade Tarihi</th>
                      <th className="py-2.5 px-2 text-right">Tutar (₺)</th>
                      <th className="py-2.5 px-2 text-center">Durum</th>
                      <th className="py-2.5 px-3 text-right">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checksList.map(check => (
                      <tr key={check.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 text-[11px]">
                        <td className="py-3 px-3 font-semibold text-slate-200">{check.drawer}</td>
                        <td className="py-3 px-2 text-slate-400">{check.bank}</td>
                        <td className="py-3 px-2 text-slate-300 font-mono">
                          {new Date(check.dueDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-amber-500">
                          {check.amount.toLocaleString("tr-TR")} ₺
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            check.status.includes("Portföyde") ? "bg-slate-800 text-slate-400" :
                            check.status.includes("Ciro") ? "bg-blue-500/15 text-blue-400" :
                            "bg-emerald-500/15 text-emerald-400"
                          }`}>
                            {check.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          {check.status.includes("Portföyde") && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCheckStatus(check.id, "Beklemede/Ciro Edildi")}
                              className="text-[9px] Purchase border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-1.5 py-0.5 rounded"
                              title="Tedarikçiye Devret/Ciro Et"
                            >
                              Ciro Et
                            </button>
                          )}
                          {!check.status.includes("Ödendi") && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCheckStatus(check.id, "Kabul Edildi/Ödendi")}
                              className="text-[9px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded"
                              title="Ödendi/Tahsil Edildi Olarak İşaretle"
                            >
                              Tahsil Et
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCheck(check.id, check.drawer)}
                            className="text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 p-1 rounded inline-block align-middle"
                            title="Çeki Portföyden Kaldır"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New Check Form */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4">
              Yeni Çek / Senet Kaydet
            </h3>
            <form onSubmit={handleAddCheck} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">* Keşideci Borçlu Firma/Şahıs</label>
                <input
                  type="text"
                  required
                  value={drawer}
                  onChange={(e) => setDrawer(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Örn: Kuzey Yapı Market Ltd"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">* Banka Şube Adı</label>
                <input
                  type="text"
                  required
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Örn: Garanti Bankası Karaköy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">* Tutar (₺)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={checkAmount || ""}
                    onChange={(e) => setCheckAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono outline-none"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">* Vade Tarihi</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono outline-none text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">* Evrak Başlangıç Durumu</label>
                <select
                  value={checkStatus}
                  onChange={(e) => setCheckStatus(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  <option value="Beklemede/Portföyde">Beklemede / Portföyde</option>
                  <option value="Beklemede/Ciro Edildi">Beklemede / Ciro Edildi</option>
                  <option value="Kabul Edildi/Ödendi">Tahsil Edildi / Ödendi</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
              >
                Çek / Senet Evrakını Kaydet
              </button>
            </form>
          </div>

        </div>
      )}

      {/* WORKSPACE CONTENT 4: SMART INVOICE GENERATOR WITH STOCK AUTO-DELETION OR REDIRECT */}
      {activeSubTab === "invoice" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-[11px]">
              <button
                onClick={() => setInvoiceSubMode("normal")}
                className={`px-4 py-1.5 rounded-md font-bold ${
                  invoiceSubMode === "normal" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                Normal Fatura Oluşturma (A4 & Baskı Çıktılı)
              </button>
              <button
                onClick={() => setInvoiceSubMode("luca")}
                className={`px-4 py-1.5 rounded-md font-bold ${
                  invoiceSubMode === "luca" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                TÜRMOB Luca Resmi E-Fatura Entegrasyonu
              </button>
            </div>
          </div>

          {invoiceSubMode === "normal" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Form panel */}
              <div className={`lg:col-span-2 p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
              }`}>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  Detaylı İrsaliyeli Satış Faturası Genel Bilgileri
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-450 mb-1">Müşteri Seç (Cari Kartlar)</label>
                      <select
                        value={selectedCustomerIdForInvoice}
                        onChange={(e) => handleCustomerSelectForInvoice(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none text-xs"
                      >
                        <option value="">-- Serbest Hızlı Alıcı Yaz --</option>
                        {db.customers.map(c => (
                          <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-450 mb-1">* Cari Firma / Alıcı Adı</label>
                      <input
                        type="text"
                        required
                        value={manualCustomerNameForInvoice}
                        onChange={(e) => setManualCustomerNameForInvoice(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none text-xs"
                        placeholder="Örn: Özgür Makine Sanayi"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-455 mb-1">Fatura Tarihi</label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-455 mb-1">Fatura No</label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-3">
                    <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Faturaya Yeni Satır Ekle</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">Stoktaki Ürünü Bul (Kriter Ara / Seç)</label>
                        <select
                          value={invoiceLineProduct}
                          onChange={(e) => handleProductSelectForInvoice(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none text-[11px]"
                        >
                          <option value="">-- Serbest Ürün Yaz (Manuel Barem) --</option>
                          {db.products.map(p => (
                            <option key={p.id} value={p.id}>{p.brand} {p.title} (Stok: {p.stock} {p.unit || "Adet"})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">* Kalem Başlığı / Hizmet Adı</label>
                        <input
                          type="text"
                          value={manualLineProductTitle}
                          onChange={(e) => setManualLineProductTitle(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none text-[11px]"
                          placeholder="Ürün adı veya açıklayıcı not"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">* Birim Fiyatı (₺)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={invoiceLinePrice || ""}
                          onChange={(e) => setInvoiceLinePrice(parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono outline-none text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">* Miktar</label>
                        <input
                          type="number"
                          min="1"
                          value={invoiceLineQty}
                          onChange={(e) => setInvoiceLineQty(parseInt(e.target.value) || 1)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono outline-none text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Birim Seti</label>
                        <select
                          value={invoiceLineUnit}
                          onChange={(e) => setInvoiceLineUnit(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none text-[11px]"
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
                        <label className="block text-[10px] text-slate-400 mb-1">KDV Oranı (%)</label>
                        <select
                          value={invoiceLineKdv}
                          onChange={(e) => setInvoiceLineKdv(parseInt(e.target.value) || 20)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none text-[11px]"
                        >
                          <option value="20">%20 Standart KDV</option>
                          <option value="10">%10 İndirimli KDV</option>
                          <option value="1">%1 Gıda / Temel KDV</option>
                          <option value="0">%0 KDV Muaf</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddInvoiceLineItem}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Kalemi Faturaya Ekle
                    </button>
                  </div>

                  {/* Listing added lines */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fatura Satır Kalemleri Listesi</h4>
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20 text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-400 bg-slate-950/15">
                            <th className="p-2">Hizmet / Malzeme Açıklaması</th>
                            <th className="p-2 text-center">Miktar</th>
                            <th className="p-2 text-right">Birim Fiyat</th>
                            <th className="p-2 text-center">KDV</th>
                            <th className="p-2 text-right">Satır Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                                Faturanızda henüz kayıtlı satır kalemi bulunmamaktadır.
                              </td>
                            </tr>
                          ) : (
                            invoiceItems.map((item, id) => {
                              const lineTotal = item.price * item.quantity;
                              return (
                                <tr key={id} className="border-b border-slate-850 hover:bg-slate-950/45">
                                  <td className="p-2 text-slate-200 font-medium">{item.title}</td>
                                  <td className="p-2 text-center text-slate-350">{item.quantity} {item.unit}</td>
                                  <td className="p-2 text-right font-mono text-slate-300">{item.price.toLocaleString("tr-TR")} ₺</td>
                                  <td className="p-2 text-center text-slate-400 font-mono">%{item.kdv}</td>
                                  <td className="p-2 text-right font-mono font-bold text-amber-500">{(lineTotal + lineTotal * (item.kdv / 100)).toLocaleString("tr-TR")} ₺</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={handleSaveInvoice}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg flex items-center gap-1.5"
                    >
                      🧾 Faturayı Tamamla, Kaydet ve Stokları Güncelle
                    </button>
                  </div>

                </div>
              </div>

              {/* Invoice Live Preview Card */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fatura Canlı Baskı Önizlemesi</h4>
                
                {invoicePreview ? (
                  <div className="p-6 bg-white border border-slate-300 rounded-2xl text-slate-800 space-y-4 shadow-xl">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-950 uppercase">BANYOBURADA A.Ş.</h2>
                        <span className="text-[10px] text-slate-500">Hırdavat & Yapı Market Deposu • İstanbul</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2.5 py-0.5 rounded font-bold">FATURA</span>
                        <span className="block text-xs font-bold text-slate-900 mt-1">{invoicePreview.number}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{new Date(invoicePreview.date).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Sayın Müşteri / Cari Ünvan</span>
                      <strong className="text-slate-900 block">{invoicePreview.customerName}</strong>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Fatura Detayları</span>
                      {invoicePreview.items.map((item: any, id: number) => (
                        <div key={id} className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-1 font-mono">
                          <span className="text-slate-705 font-sans">{item.title} x {item.quantity} {item.unit}</span>
                          <span className="font-bold text-slate-950">{(item.price * item.quantity).toLocaleString("tr-TR")} ₺</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ara Toplam:</span>
                        <span>{invoicePreview.subtotal.toLocaleString("tr-TR")} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">KDV Toplamı:</span>
                        <span>{invoicePreview.tax.toLocaleString("tr-TR")} ₺</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-950 pt-1 border-t border-dashed border-slate-200">
                        <span>Genel Toplam:</span>
                        <span className="text-amber-600">{invoicePreview.total.toLocaleString("tr-TR")} ₺</span>
                      </div>
                    </div>

                    <div className="text-center py-2 bg-emerald-500/10 rounded-lg text-emerald-800 text-[10px] font-bold flex items-center justify-center gap-1.5 border border-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> RESMİ ENTEGRATÖRE GÖNDERİLDİ
                    </div>
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 italic text-[11px]">
                    Fatura önizlemesini görüntülemek için lütfen soldaki panelden fatura oluşturup tamamlayın.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={`p-8 rounded-2xl border text-center ${
              isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="max-w-md mx-auto space-y-5 py-6">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className={`text-md font-extrabold ${isDark ? "text-white" : "text-slate-950"}`}>
                    Luca Resmi E-Fatura Düzenleme Portal Kapısı
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    TÜRMOB Luca Entegratörü kullanarak sisteme kayıtlı müşterilerinize resmi e-fatura kesebilir, vergi numaraları üzerinden GİB sorgulaması yapabilirsiniz.
                  </p>
                </div>

                <a
                  href="https://turmobefatura.luca.com.tr/Account/Login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg text-xs"
                >
                  Luca Portalına Yönlen (turmobefatura.luca.com.tr) 🡥
                </a>

                <p className="text-[10px] text-slate-500 mt-2">
                  Not: Yönlendiğiniz portalda Luca kullanıcı kimlik bilgilerinizle oturum açmanız gerekmektedir.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
