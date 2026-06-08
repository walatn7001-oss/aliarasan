/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Users, 
  Plus, 
  MessageCircle, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle, 
  PlusCircle, 
  Eye, 
  Briefcase,
  ExternalLink,
  ChevronRight,
  DollarSign,
  PlusSquare,
  FileSpreadsheet
} from "lucide-react";
import { Customer, DatabaseState, Transaction } from "../types";

interface CRMTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function CRMTab({ db, saveDb, addNotification, isDark }: CRMTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(db.customers[0]?.id || null);
  const [activeTab, setActiveTab] = useState<"list" | "form" | "transaction">("list");

  // CRM customer structure states
  const [customerForm, setCustomerForm] = useState<Omit<Customer, "id">>({
    name: "",
    companyName: "",
    taxOffice: "",
    taxNo: "",
    phone: "",
    whatsapp: "05528847647",
    email: "",
    address: "",
    notes: "",
    debt: 0,
    credit: 0,
    riskLimit: 100000,
    status: "active",
    category: "Müşteri"
  });

  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Manual transaction record states associated with selected customer
  const [txType, setTxType] = useState<"tahsilat" | "odeme">("tahsilat");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDesc, setTxDesc] = useState("");
  const [txAccount, setTxAccount] = useState("Akbank Ticari");
  const [txCashOrBank, setTxCashOrBank] = useState<"cash" | "bank">("bank");

  const activeCustomer = useMemo(() => {
    return db.customers.find(c => c.id === selectedCustomerId) || null;
  }, [db.customers, selectedCustomerId]);

  // Find transaction history for active customer (by name search matching)
  const customerTransactions = useMemo(() => {
    if (!activeCustomer) return [];
    const nameLower = activeCustomer.name.toLowerCase();
    const companyLower = activeCustomer.companyName.toLowerCase();
    return db.transactions.filter(t => {
      const descLower = t.description.toLowerCase();
      return descLower.includes(nameLower) || descLower.includes(companyLower);
    });
  }, [db.transactions, activeCustomer]);

  // Filter list
  const filteredCustomers = useMemo(() => {
    return db.customers.filter(c => {
      if (searchTerm.trim() === "") return true;
      const query = searchTerm.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(query) ||
        (c.companyName || "").toLowerCase().includes(query) ||
        (c.phone || "").includes(query) ||
        (c.taxNo || "").includes(query)
      );
    });
  }, [db.customers, searchTerm]);

  // Save Customer Form
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.companyName) {
      addNotification("Lütfen Ad Soyad ve Firma Ünvanı alanlarını doldurun.", "warning");
      return;
    }

    const payload: Customer = {
      id: isEditing || `cust-${Math.floor(1000 + Math.random() * 9000)}`,
      ...customerForm
    };

    let updatedList = [...db.customers];
    if (isEditing) {
      updatedList = updatedList.map(c => c.id === isEditing ? payload : c);
      addNotification(`${payload.name} cari kartı güncellendi.`, "success");
    } else {
      updatedList.push(payload);
      addNotification(`${payload.name} mükellefi cari portföyüne kaydedildi.`, "success");
    }

    saveDb({ ...db, customers: updatedList });
    setIsEditing(null);
    setCustomerForm({
      name: "",
      companyName: "",
      taxOffice: "",
      taxNo: "",
      phone: "",
      whatsapp: "05528847647",
      email: "",
      address: "",
      notes: "",
      debt: 0,
      credit: 0,
      riskLimit: 100000,
      status: "active",
      category: "Müşteri"
    });
    setSelectedCustomerId(payload.id);
    setActiveTab("list");
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`"${name}" cari mükellefini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      const updated = db.customers.filter(c => c.id !== id);
      const nextActiveId = updated[0]?.id || null;
      saveDb({ ...db, customers: updated });
      addNotification(`"${name}" cari mükellefi silindi.`, "info");
      setSelectedCustomerId(nextActiveId);
      setActiveTab("list");
    }
  };

  // Run Tahsilat / Ödeme transaction directly on cari account
  const handleProcessCariTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || txAmount <= 0 || !txDesc.trim()) {
      addNotification("Geçersiz işlem tutarı veya açıklaması.", "warning");
      return;
    }

    const dateStr = new Date().toISOString();
    const newTx: Transaction = {
      id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
      type: txType === "tahsilat" ? "income" : "expense",
      amount: txAmount,
      description: `[Cari ${txType === "tahsilat" ? "Tahsilat" : "Ödeme"}] ${activeCustomer.name} (${activeCustomer.companyName}) - ${txDesc}`,
      date: dateStr,
      category: "Cari Tahsilat / Ödeme",
      accountType: txCashOrBank,
      accountName: txAccount
    };

    // Calculate customer balances
    let finalDebt = activeCustomer.debt;
    let finalCredit = activeCustomer.credit;

    if (txType === "tahsilat") {
      // Customer paid us (reduced debt or increased credit)
      if (finalDebt >= txAmount) {
        finalDebt -= txAmount;
      } else {
        const diff = txAmount - finalDebt;
        finalDebt = 0;
        finalCredit += diff;
      }
    } else {
      // We paid the customer (reduced credit or increased debt)
      if (finalCredit >= txAmount) {
        finalCredit -= txAmount;
      } else {
        const diff = txAmount - finalCredit;
        finalCredit = 0;
        finalDebt += diff;
      }
    }

    const updatedCustomers = db.customers.map(c => 
      c.id === activeCustomer.id 
        ? { ...c, debt: finalDebt, credit: finalCredit } 
        : c
    );

    const updatedTransactions = [newTx, ...db.transactions];

    saveDb({
      ...db,
      customers: updatedCustomers,
      transactions: updatedTransactions
    });

    addNotification(`Cari ${txType === "tahsilat" ? "tahsilat" : "ödeme"} kaydı başarıyla girildi. Bakiye dengelendi.`, "success");
    setTxAmount(0);
    setTxDesc("");
    setActiveTab("list");
  };

  // Launch prefilled Whatsapp link
  const openWhatsappChat = (number: string) => {
    const cleanNum = number.replace(/\s+/g, "").replace("+", "").replace("-", "");
    const waUrl = `https://wa.me/${cleanNum || "905528847647"}?text=${encodeURIComponent("Merhaba, ürünleriniz hakkında bilgi almak istiyorum.")}`;
    window.open(waUrl, "_blank");
  };

  // Calculate global customer balance stats
  const totalCariAlacak = db.customers.reduce((sum, c) => sum + c.debt, 0); // we receive this (debt of others to us)
  const totalCariBorc = db.customers.reduce((sum, c) => sum + c.credit, 0); // we pay this (credit of others on us)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* SECTION 1: Customer List & Global Balances */}
      <div className="lg:col-span-1 space-y-5">
        
        {/* Quick Balance Widgets */}
        <div className={`p-4 rounded-2xl border grid grid-cols-2 gap-4 ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold">Toplam Alacağımız (Cari)</span>
            <span className="text-sm font-bold font-mono text-amber-500 mt-1 block">
              {totalCariAlacak.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-400 block font-semibold">Toplam Borcumuz (Cari)</span>
            <span className="text-sm font-bold font-mono text-slate-300 mt-1 block">
              {totalCariBorc.toLocaleString("tr-TR")} ₺
            </span>
          </div>
        </div>

        {/* List Panel */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              <Users className="w-4 h-4 text-amber-500" />
              <span>Cari Mükellefler</span>
            </h3>
            <button
              onClick={() => {
                setIsEditing(null);
                setCustomerForm({
                  name: "",
                  companyName: "",
                  taxOffice: "",
                  taxNo: "",
                  phone: "",
                  whatsapp: "05528847647",
                  email: "",
                  address: "",
                  notes: "",
                  debt: 0,
                  credit: 0,
                  riskLimit: 100000,
                  status: "active",
                  category: "Müşteri"
                });
                setActiveTab("form");
              }}
              className="p-1 px-2.5 bg-amber-500 hover:bg-amber-400 rounded-lg text-slate-950 font-bold text-[10px] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Ekle
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Firma veya isim ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {filteredCustomers.map(c => {
              const isActive = c.id === selectedCustomerId;
              const subBakiye = c.debt - c.credit;

              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomerId(c.id); setActiveTab("list"); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex justify-between items-center ${
                    isActive 
                      ? "bg-amber-500/10 border-amber-500/30 text-white" 
                      : isDark ? "bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-400" : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="max-w-[70%]">
                    <p className={`font-bold block truncate ${isActive ? "text-amber-500" : isDark ? "text-slate-300" : "text-slate-800"}`}>
                      {c.companyName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.name} • {c.category}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`font-bold block text-[10px] ${subBakiye >= 0 ? "text-amber-500" : "text-emerald-500"}`}>
                      {Math.abs(subBakiye).toLocaleString("tr-TR")} ₺
                    </span>
                    <span className="text-[9px] text-slate-500">{subBakiye >= 0 ? "Alacaklıyız" : "Borçluyuz"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Active Customer Workspace Sheets */}
      <div className="lg:col-span-2 space-y-6">
        
        {activeTab === "form" && !isEditing ? (
          /* New Customer Form (Fixes the blank list bug where form doesn't show up) */
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
              Sisteme Yeni Cari Sicil Kaydı Aç
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Firma Resmi Ünvanı</label>
                  <input
                    type="text"
                    required
                    value={customerForm.companyName}
                    onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="AŞ, Ltd, vb. resmi başlık"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Yetkili Alıcı Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Örn: Ahmet Yılmaz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Cari Kategori Segmenti</label>
                  <select
                    value={customerForm.category}
                    onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value as "Bayi" | "Müşteri" | "Özel Bayi" })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="Müşteri">Müşteri (Perakende / Normal)</option>
                    <option value="Bayi">Sözleşmeli Bayi (Düşük barem)</option>
                    <option value="Özel Bayi">Distribütör / Özel Bayi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={customerForm.taxOffice}
                    onChange={(e) => setCustomerForm({ ...customerForm, taxOffice: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Mecidiyeköy VD"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Vergi Numarası / T.C.</label>
                  <input
                    type="text"
                    value={customerForm.taxNo}
                    onChange={(e) => setCustomerForm({ ...customerForm, taxNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="10 Haneli Vergi No veya TCKN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Yetkili Telefon</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="+90..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">WhatsApp Hattı</label>
                  <input
                    type="text"
                    value={customerForm.whatsapp}
                    onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="05528847647"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1 font-semibold">E-Posta Adresi</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="bilgi@firma.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Risk Kredi Limiti (TL)</label>
                  <input
                    type="number"
                    value={customerForm.riskLimit}
                    onChange={(e) => setCustomerForm({ ...customerForm, riskLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Firma Adresi (Fatura Sevk Adresi)</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Sokak, Mahalle, No, İlçe, İl"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Dahili Özel Notlar (Müşteri İlişkileri Detayları)</label>
                <textarea
                  rows={3}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  placeholder="Müşteri beklentileri, ödeme alışkanlıkları vb."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("list");
                    if (db.customers.length > 0) {
                      setSelectedCustomerId(db.customers[0].id);
                    }
                  }}
                  className="px-5 py-2 bg-slate-800 rounded-xl font-semibold text-slate-200"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                >
                  Cari Kartı Oluştur
                </button>
              </div>

            </form>
          </div>
        ) : activeCustomer ? (
          <>
            {/* Customer workspace tabs header */}
            <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-800 self-start md:max-w-max flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("list")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "list" ? "bg-amber-500 text-slate-950" : "text-slate-450 hover:text-white"}`}
              >
                Cari Kart Detayları
              </button>
              <button
                onClick={() => setActiveTab("transaction")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "transaction" ? "bg-amber-500 text-slate-950" : "text-slate-450 hover:text-white"}`}
              >
                Cari Tahsilat/Ödeme Yap
              </button>
              <button
                onClick={() => {
                  setCustomerForm(activeCustomer);
                  setIsEditing(activeCustomer.id);
                  setActiveTab("form");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "form" ? "bg-amber-500 text-slate-950" : "text-slate-450 hover:text-white"}`}
              >
                Bilgileri Düzenle
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomer(activeCustomer.id, activeCustomer.companyName)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-450 hover:bg-rose-500 hover:text-white transition-all ml-auto"
                title="Cari Kartı Sil"
              >
                Cari Sil
              </button>
            </div>

            {/* Sub View: Detail Sheets */}
            {activeTab === "list" && (
              <div className="space-y-6">
                
                {/* Visual Identity & Contact card */}
                <div className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          activeCustomer.category === "Bayi" ? "bg-indigo-500/15 text-indigo-400" : "bg-amber-500/15 text-amber-500"
                        }`}>
                          {activeCustomer.category}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${activeCustomer.status === "active" ? "bg-emerald-500" : "bg-slate-600"}`} title="Cari Durumu"></span>
                      </div>
                      <h2 className={`text-xl font-bold mt-2 ${isDark ? "text-white" : "text-slate-950"}`}>{activeCustomer.companyName}</h2>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">Yetkili Alıcı: <b className="text-slate-300">{activeCustomer.name}</b></p>
                    </div>

                    {/* Integrated WhatsApp direct contact button */}
                    <button
                      onClick={() => openWhatsappChat(activeCustomer.whatsapp)}
                      className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-transform hover:scale-105 shadow-md flex items-center gap-2 text-xs font-bold"
                      title="WhatsApp Chat Başlat"
                    >
                      <MessageCircle className="w-5 h-5 fill-slate-950 stroke-none" />
                      <span>WhatsApp Hızlı</span>
                    </button>
                  </div>

                  {/* Operational and Tax Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-850 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4 text-amber-500" />
                        <span>Masa/Ofis: {activeCustomer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-4 h-4 text-amber-500" />
                        <span>E-Posta: {activeCustomer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <span className="truncate" title={activeCustomer.address}>Adres: {activeCustomer.address}</span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                      <p className="font-bold text-[11px] text-amber-500 uppercase tracking-wider">Vergi Detayları</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vergi Dairesi:</span>
                        <span className="font-semibold text-slate-300">{activeCustomer.taxOffice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vergi Numarası:</span>
                        <span className="font-semibold font-mono text-slate-300">{activeCustomer.taxNo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Balances and Risk Limit */}
                <div className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
                }`}>
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Cari Finansal Değerler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                    
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Toplam Borçlanması (₺)</span>
                      <span className="text-lg font-bold font-mono text-rose-500 block mt-1">
                        {activeCustomer.debt.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cari Alacağı / Avans (₺)</span>
                      <span className="text-lg font-bold font-mono text-emerald-500 block mt-1">
                        {activeCustomer.credit.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Kalan Risk Limiti (₺)</span>
                      <span className="text-lg font-bold font-mono text-slate-300 block mt-1">
                        {(activeCustomer.riskLimit - activeCustomer.debt).toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                  </div>

                  {activeCustomer.debt >= activeCustomer.riskLimit && (
                    <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 animate-bounce" />
                      <span>Cari risk limiti dolmuştur! Bu mükellefe yeni sevkiyat açılması önerilmemektedir.</span>
                    </div>
                  )}
                </div>

                {/* Sub Customer Ledger (Cari Hareket Geçmişi) */}
                <div className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
                }`}>
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider mb-4 flex justify-between items-center">
                    <span>Cari Defter Hareket Kayıtları</span>
                    <span className="text-[11px] font-normal text-slate-500 font-sans">Mükellef ile ilişkili tüm makbuzlar</span>
                  </h4>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                    {customerTransactions.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Bu cari hesaba ait girilmiş işlem makbuzu bulunmuyor.</p>
                    ) : (
                      customerTransactions.map(t => (
                        <div key={t.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold block text-slate-300 text-[11px]">{t.description}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">{new Date(t.date).toLocaleDateString("tr-TR")} • {t.accountName}</span>
                          </div>
                          <span className={`font-mono font-bold ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                            {t.type === "income" ? "+" : "-"}{t.amount.toLocaleString("tr-TR")} ₺
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Sub View: Manual Cari Transaction (Tahsilat / Ödeme) */}
            {activeTab === "transaction" && (
              <div className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
              }`}>
                <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
                  Cari Hesap Makbuzu Girişi: {activeCustomer.companyName}
                </h3>

                <form onSubmit={handleProcessCariTransaction} className="space-y-4 text-xs">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Yapılacak İşlem Türü</label>
                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-500 font-bold">
                          <input 
                            type="radio" 
                            name="txType" 
                            checked={txType === "tahsilat"} 
                            onChange={() => setTxType("tahsilat")}
                            className="text-amber-500 focus:ring-0" 
                          />
                          Tahsilat (Bize Ödeme Yaptı)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-500 font-bold">
                          <input 
                            type="radio" 
                            name="txType" 
                            checked={txType === "odeme"} 
                            onChange={() => setTxType("odeme")}
                            className="text-amber-500 focus:ring-0" 
                          />
                          Borç Kaydı (Mal/Hizmet Bedeli)
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Cari İşlem Tutar (₺)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={txAmount || ""}
                        onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                        placeholder="Örn: 25000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Hesap Türü</label>
                      <select
                        value={txCashOrBank}
                        onChange={(e) => setTxCashOrBank(e.target.value as "cash" | "bank")}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                      >
                        <option value="bank">Banka Hesabı</option>
                        <option value="cash">Kasa Hesabı</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Hesap / Kasa Başlığı</label>
                      <select
                        value={txAccount}
                        onChange={(e) => setTxAccount(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                      >
                        {txCashOrBank === "bank" ? (
                          <>
                            <option value="Akbank Ticari">Akbank Ticari Merkez</option>
                            <option value="Garanti Şube">Garanti Sanayi Şubesi</option>
                          </>
                        ) : (
                          <>
                            <option value="Merkez Kasa">Sirket Merkez Kasası</option>
                            <option value="Yedek Kasa">Müdüriyet Kasası</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Özet Açıklama</label>
                      <input
                        type="text"
                        required
                        value={txDesc}
                        onChange={(e) => setTxDesc(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="Örn: Fatura No: 2026/89 Nakit vb."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("list")}
                      className="px-5 py-2 bg-slate-805 rounded-xl font-semibold"
                    >
                      Kapat
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                    >
                      {txType === "tahsilat" ? "Tahsilatı Cari Deftere Geç" : "Borçu Mükellefe Yansıt"}
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* Sub View: Create/Edit Customer CRM Profile Form */}
            {activeTab === "form" && (
              <div className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
              }`}>
                <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
                  {isEditing ? `Cari Sicil Kartını Güncelle: ${customerForm.companyName}` : "Sisteme Yeni Cari Sicil Kaydı Aç"}
                </h3>

                <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs font-sans">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Firma Resmi Ünvanı</label>
                      <input
                        type="text"
                        required
                        value={customerForm.companyName}
                        onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="AŞ, Ltd, vb. resmi başlık"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Yetkili Alıcı Adı Soyadı</label>
                      <input
                        type="text"
                        required
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="Örn: Ahmet Yılmaz"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Cari Kategori Segmenti</label>
                      <select
                        value={customerForm.category}
                        onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value as "Bayi" | "Müşteri" | "Özel Bayi" })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                      >
                        <option value="Müşteri">Müşteri (Perakende / Normal)</option>
                        <option value="Bayi">Sözleşmeli Bayi (Düşük barem)</option>
                        <option value="Özel Bayi">Distribütör / Özel Bayi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Vergi Dairesi</label>
                      <input
                        type="text"
                        value={customerForm.taxOffice}
                        onChange={(e) => setCustomerForm({ ...customerForm, taxOffice: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="Mecidiyeköy VD"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Vergi Numarası / T.C.</label>
                      <input
                        type="text"
                        value={customerForm.taxNo}
                        onChange={(e) => setCustomerForm({ ...customerForm, taxNo: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="10 Haneli Vergi No veya TCKN"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Yetkili Telefon</label>
                      <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="+90..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">WhatsApp Hattı</label>
                      <input
                        type="text"
                        value={customerForm.whatsapp}
                        onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="05423217347"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">E-Posta Adresi</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="bilgi@firma.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1">Risk Kredi Limiti (TL)</label>
                      <input
                        type="number"
                        value={customerForm.riskLimit}
                        onChange={(e) => setCustomerForm({ ...customerForm, riskLimit: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-semibold mb-1">Firma Adresi (Fatura Sevk Adresi)</label>
                    <input
                      type="text"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                      placeholder="Sokak, Mahalle, No, İlçe, İl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-semibold mb-1">Dahili Özel Notlar (Müşteri İlişkileri Detayları)</label>
                    <textarea
                      rows={3}
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                      placeholder="Müşteri beklentileri, ödeme alışkanlıkları vb."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("list")}
                      className="px-5 py-2 bg-slate-800 rounded-xl font-semibold"
                    >
                      Geri Dön
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                    >
                      Cari Kartı Tamamla
                    </button>
                  </div>

                </form>
              </div>
            )}

          </>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">
            Müşteri detaylarını görüntülemek için sol taraftaki listeden bir cari seçin.
          </div>
        )}

      </div>

    </div>
  );
}
