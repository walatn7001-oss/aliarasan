/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, 
  Award, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Laptop, 
  TrendingUp, 
  CheckCircle,
  Briefcase,
  Smartphone,
  ShieldAlert,
  ChevronRight,
  PlusCircle,
  Clock,
  UserPlus,
  Edit,
  Coins,
  Package,
  Check,
  AlertCircle
} from "lucide-react";
import { DatabaseState, Personnel, Transaction, ZimmetItem } from "../types";

interface PersonnelTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function PersonnelTab({ db, saveDb, addNotification, isDark }: PersonnelTabProps) {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(db.personnel[0]?.id || "");
  const [activeSubTab, setActiveSubTab] = useState<"detail" | "advance" | "zimmet">("detail");

  // Personnel CRUD states
  const [isAddingPersonnel, setIsAddingPersonnel] = useState(false);
  const [isEditingPersonnel, setIsEditingPersonnel] = useState(false);

  const emptyPersonnelForm = {
    name: "",
    role: "Satış Temsilcisi",
    email: "",
    phone: "",
    salary: 42503,
    monthlyExpense: 65000,
    performanceScore: 85
  };
  const [personnelForm, setPersonnelForm] = useState(emptyPersonnelForm);

  // Local additions states
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [leaveDaysRequest, setLeaveDaysRequest] = useState<number>(1);
  
  // Zimmet detailed form states
  const [editingZimmetId, setEditingZimmetId] = useState<string | null>(null);
  const [zimmetForm, setZimmetForm] = useState({
    itemName: "",
    quantity: 1,
    givenDate: new Date().toISOString().split("T")[0],
    hasDeficit: false,
    deficitQuantity: 0,
    notes: ""
  });

  const activeEmployee = db.personnel.find(p => p.id === selectedPersonnelId) || null;

  // Process advance payment
  const handleIssueAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || advanceAmount <= 0) {
      addNotification("Geçersiz avans tutarı.", "warning");
      return;
    }

    const updatedPersonnel = db.personnel.map(p => {
      if (p.id === activeEmployee.id) {
        return {
          ...p,
          activeAdvances: p.activeAdvances + advanceAmount,
          activities: [`${advanceAmount.toLocaleString("tr-TR")} ₺ avans tahsisatı bakiye kaydedildi.`, ...p.activities]
        };
      }
      return p;
    });

    const advanceTx: Transaction = {
      id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "expense",
      amount: advanceAmount,
      description: `[Personel Ödemesi] ${activeEmployee.name} - Avans Tahakkuk Fişi`,
      date: new Date().toISOString(),
      category: "Maaş Ödemesi",
      accountType: "bank",
      accountName: "Akbank Ticari"
    };

    saveDb({
      ...db,
      personnel: updatedPersonnel,
      transactions: [advanceTx, ...db.transactions]
    });

    addNotification(`${activeEmployee.name} için ${advanceAmount.toLocaleString("tr-TR")} ₺ tutarındaki avans ödeme fişi Akbank hesabından ödendi.`, "success");
    setAdvanceAmount(0);
  };

  // Record Leave
  const handleApproveLeave = () => {
    if (!activeEmployee || leaveDaysRequest <= 0) return;
    if (activeEmployee.leftDays < leaveDaysRequest) {
      addNotification("Hata: Personelin kalan izin bakiyesi bu talep için yetersizdir.", "warning");
      return;
    }

    const updated = db.personnel.map(p => {
      if (p.id === activeEmployee.id) {
        return {
          ...p,
          leftDays: p.leftDays - leaveDaysRequest,
          activities: [`${leaveDaysRequest} gün yıllık ücretli izin hakkı onaylandı.`, ...p.activities]
        };
      }
      return p;
    });

    saveDb({ ...db, personnel: updated });
    addNotification(`${activeEmployee.name} için ${leaveDaysRequest} günlük izin onaylandı ve bakiyeden düşüldü.`, "success");
    setLeaveDaysRequest(1);
  };

  // Save Personnel (Add & Update)
  const handleSavePersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnelForm.name.trim()) {
      addNotification("Lütfen personel ad soyadını doldurun.", "warning");
      return;
    }

    if (isEditingPersonnel && activeEmployee) {
      const updatedList = db.personnel.map(p => {
        if (p.id === activeEmployee.id) {
          return {
            ...p,
            name: personnelForm.name.trim(),
            role: personnelForm.role,
            email: personnelForm.email.trim(),
            phone: personnelForm.phone.trim(),
            salary: personnelForm.salary,
            monthlyExpense: personnelForm.monthlyExpense,
            performanceScore: personnelForm.performanceScore,
            activities: [`Sicil kartı bilgileri İK tarafından güncellendi.`, ...p.activities]
          };
        }
        return p;
      });

      saveDb({ ...db, personnel: updatedList });
      addNotification(`"${personnelForm.name}" personeli başarıyla güncellendi.`, "success");
      setIsEditingPersonnel(false);
    } else {
      const newId = `pers-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPersonnel: Personnel = {
        id: newId,
        name: personnelForm.name.trim(),
        role: personnelForm.role,
        email: personnelForm.email.trim() || `${newId}@firma.com`,
        phone: personnelForm.phone.trim() || "Belirtilmemiş",
        salary: personnelForm.salary,
        monthlyExpense: personnelForm.monthlyExpense,
        activeAdvances: 0,
        leftDays: 14,
        itemsZimmet: [],
        zimmetDetailed: [],
        performanceScore: personnelForm.performanceScore,
        activities: ["Personel ilk giriş sicil tescili gerçekleştirildi."]
      };

      saveDb({ ...db, personnel: [...db.personnel, newPersonnel] });
      addNotification(`"${newPersonnel.name}" adlı yeni personel sicil kadrosu açıldı.`, "success");
      setSelectedPersonnelId(newId);
      setIsAddingPersonnel(false);
    }

    setPersonnelForm(emptyPersonnelForm);
  };

  // Delete Personnel Record
  const handleDeletePersonnel = (id: string, name: string) => {
    if (confirm(`"${name}" adlı personeli kadro sicil defterinden tamamen silmek istediğinize emin misiniz? Birikmiş tüm verileri silinecektir.`)) {
      const updated = db.personnel.filter(p => p.id !== id);
      const nextActiveId = updated[0]?.id || "";
      saveDb({ ...db, personnel: updated });
      addNotification(`"${name}" personel sicil kaydı silindi.`, "info");
      setSelectedPersonnelId(nextActiveId);
      setIsAddingPersonnel(false);
      setIsEditingPersonnel(false);
    }
  };

  // Detailed Zimmet Save
  const handleSaveZimmet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || !zimmetForm.itemName.trim()) return;

    const currentZimmetList = activeEmployee.zimmetDetailed || [];
    let updatedZimmet: ZimmetItem[] = [];

    if (editingZimmetId) {
      updatedZimmet = currentZimmetList.map(z => {
        if (z.id === editingZimmetId) {
          return {
            ...z,
            itemName: zimmetForm.itemName.trim(),
            quantity: zimmetForm.quantity,
            givenDate: zimmetForm.givenDate,
            hasDeficit: zimmetForm.hasDeficit,
            deficitQuantity: zimmetForm.hasDeficit ? zimmetForm.deficitQuantity : 0,
            notes: zimmetForm.notes.trim()
          };
        }
        return z;
      });
      addNotification("Zimmet envanter kaydı başarıyla güncellendi.", "success");
    } else {
      const newZimId = `zim-${Math.floor(1000 + Math.random() * 9000)}`;
      const newZimObj: ZimmetItem = {
        id: newZimId,
        itemName: zimmetForm.itemName.trim(),
        quantity: zimmetForm.quantity,
        givenDate: zimmetForm.givenDate,
        hasDeficit: zimmetForm.hasDeficit,
        deficitQuantity: zimmetForm.hasDeficit ? zimmetForm.deficitQuantity : 0,
        notes: zimmetForm.notes.trim()
      };
      updatedZimmet = [...currentZimmetList, newZimObj];
      addNotification(`"${zimmetForm.itemName}" başarıyla zimmet envanterine kaydedildi.`, "success");
    }

    const updatedPersonnel = db.personnel.map(p => {
      if (p.id === activeEmployee.id) {
        return {
          ...p,
          zimmetDetailed: updatedZimmet,
          itemsZimmet: updatedZimmet.map(z => `${z.quantity}x ${z.itemName}${z.hasDeficit ? ` (Eksik: ${z.deficitQuantity} Adet)` : ""}`)
        };
      }
      return p;
    });

    saveDb({ ...db, personnel: updatedPersonnel });
    setEditingZimmetId(null);
    setZimmetForm({
      itemName: "",
      quantity: 1,
      givenDate: new Date().toISOString().split("T")[0],
      hasDeficit: false,
      deficitQuantity: 0,
      notes: ""
    });
  };

  // Release Zimmet (Delete)
  const handleDeleteZimmet = (zimId: string, itemName: string) => {
    if (!activeEmployee) return;
    if (confirm(`"${itemName}" tescilli demirbaşını personelden iade almak ve zimmet kaydını düşürmek istiyor musunuz?`)) {
      const currentList = activeEmployee.zimmetDetailed || [];
      const updatedZimmet = currentList.filter(z => z.id !== zimId);

      const updatedPersonnel = db.personnel.map(p => {
        if (p.id === activeEmployee.id) {
          return {
            ...p,
            zimmetDetailed: updatedZimmet,
            itemsZimmet: updatedZimmet.map(z => `${z.quantity}x ${z.itemName}${z.hasDeficit ? ` (Eksik: ${z.deficitQuantity} Adet)` : ""}`)
          };
        }
        return p;
      });

      saveDb({ ...db, personnel: updatedPersonnel });
      addNotification(`"${itemName}" demirbaşı zimmetten düşürüldü.`, "info");
    }
  };

  const handleEditZimmetClick = (z: ZimmetItem) => {
    setEditingZimmetId(z.id);
    setZimmetForm({
      itemName: z.itemName,
      quantity: z.quantity,
      givenDate: z.givenDate,
      hasDeficit: z.hasDeficit,
      deficitQuantity: z.deficitQuantity || 0,
      notes: z.notes || ""
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* LEFT COLUMN: Employee quick cards list & Actions */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
      }`}>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>Kadro Defteri ({db.personnel.length})</span>
          </h3>
          <button
            onClick={() => {
              setPersonnelForm(emptyPersonnelForm);
              setIsEditingPersonnel(false);
              setIsAddingPersonnel(true);
            }}
            className="p-1 px-2.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Ekle</span>
          </button>
        </div>

        <div className="space-y-2">
          {db.personnel.map(p => {
            const isActive = p.id === selectedPersonnelId && !isAddingPersonnel;

            return (
              <button
                key={p.id}
                onClick={() => { 
                  setSelectedPersonnelId(p.id); 
                  setIsAddingPersonnel(false);
                  setIsEditingPersonnel(false);
                  setActiveSubTab("detail"); 
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex justify-between items-center ${
                  isActive 
                    ? "bg-amber-500/10 border-amber-500/30 text-white" 
                    : isDark ? "bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-400" : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div>
                  <p className={`font-bold block ${isActive ? "text-amber-500" : isDark ? "text-slate-200" : "text-slate-800"}`}>{p.name}</p>
                  <span className="text-[10px] text-slate-500 font-sans block mt-0.5">{p.role}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono bg-slate-800 text-slate-450 text-[10px] p-1 rounded font-bold block">
                    P: {p.performanceScore}
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans mt-1 block">
                    {p.salary.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive workspace */}
      <div className="lg:col-span-2 space-y-6">
        
        {isAddingPersonnel || isEditingPersonnel ? (
          /* Add / Edit Personnel Form */
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <h3 className={`text-md font-bold mb-4 ${isDark ? "text-white" : "text-slate-950"}`}>
              {isEditingPersonnel ? "Personel Sicil Kaydını Güncelle" : "Kadro Sicil Defterine Yeni Çalışan Kaydet"}
            </h3>

            <form onSubmit={handleSavePersonnel} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Personel Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    value={personnelForm.name}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Örn: Ahmet Can Yılmaz"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Kadro Pozisyonu / Unvanı</label>
                  <select
                    value={personnelForm.role}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="Yönetici">Yönetici / Direktör</option>
                    <option value="Satış Temsilcisi">Satış Temsilcisi</option>
                    <option value="Muhasebe">Muhasebe Sorumlusu</option>
                    <option value="Depo Sorumlusu">Depo & Lojistik Görevlisi</option>
                    <option value="İK">İnsan Kaynakları Uzmanı</option>
                    <option value="Mühendis">Ar-Ge / Yazılım Sorumlusu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">E-Posta Adresi</label>
                  <input
                    type="email"
                    value={personnelForm.email}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="ahmet@firma.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Telefon Numarası</label>
                  <input
                    type="text"
                    value={personnelForm.phone}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="05..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Performans Puanı (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={personnelForm.performanceScore}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, performanceScore: parseInt(e.target.value) || 85 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Aylık Brüt Maaş (₺)</label>
                  <input
                    type="number"
                    value={personnelForm.salary}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, salary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Aylık Toplam Şirket Maliyeti / Gideri (₺)</label>
                  <input
                    type="number"
                    value={personnelForm.monthlyExpense}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, monthlyExpense: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                    placeholder="Maaş + Prim + SGK + Yol + Yemek"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Personelin genel şirket muhasebesine yansıyan aylık bütçe maliyeti.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPersonnel(false);
                    setIsEditingPersonnel(false);
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl font-semibold text-slate-200"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                >
                  Sicili Kaydet
                </button>
              </div>
            </form>
          </div>
        ) : activeEmployee ? (
          <>
            {/* Upper Toolbar for Active Employee */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-850/50 p-2.5 rounded-2xl border border-slate-800">
              {/* Tabs selector */}
              <div className="flex bg-slate-900 p-1 border border-slate-800 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveSubTab("detail")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeSubTab === "detail" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Kadro & Gider Kartı
                </button>
                <button
                  onClick={() => setActiveSubTab("advance")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeSubTab === "advance" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Avans EFT Fişi
                </button>
                <button
                  onClick={() => setActiveSubTab("zimmet")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeSubTab === "zimmet" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Zimmetli Envanterler
                </button>
              </div>

              {/* CRUD triggers */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    setPersonnelForm({
                      name: activeEmployee.name,
                      role: activeEmployee.role,
                      email: activeEmployee.email,
                      phone: activeEmployee.phone,
                      salary: activeEmployee.salary,
                      monthlyExpense: activeEmployee.monthlyExpense || activeEmployee.salary * 1.5,
                      performanceScore: activeEmployee.performanceScore
                    });
                    setIsEditingPersonnel(true);
                  }}
                  className="p-1 px-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>
                <button
                  onClick={() => handleDeletePersonnel(activeEmployee.id, activeEmployee.name)}
                  className="p-1 px-3 bg-rose-500/10 text-rose-450 hover:bg-rose-500 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kadro Sil</span>
                </button>
              </div>
            </div>

            {/* Sub Content 1: Detailed Overview and Leaves */}
            {activeSubTab === "detail" && (
              <div className="space-y-6">
                
                {/* Employee Profile Sheet */}
                <div className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase tracking-wider">{activeEmployee.role}</span>
                      <h2 className={`text-xl font-bold mt-1.5 ${isDark ? "text-white" : "text-slate-950"}`}>{activeEmployee.name}</h2>
                      <p className="text-xs text-slate-500 mt-1">İrtibat: {activeEmployee.email} • {activeEmployee.phone}</p>
                    </div>

                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 text-center font-sans">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Performans</span>
                      <span className="text-xl font-extrabold font-mono mt-0.5 block">{activeEmployee.performanceScore} / 100</span>
                    </div>
                  </div>

                  {/* Financial Stats Area */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-850 text-xs">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Aylık Net Maaş</span>
                      <span className="text-md font-bold font-mono text-slate-300 mt-1 block flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        {activeEmployee.salary.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Aylık Toplam Şirket Maliyeti</span>
                      <span className="text-md font-bold font-mono text-amber-500 mt-1 block flex items-center gap-1">
                        <Coins className="w-4 h-4 text-amber-550" />
                        {(activeEmployee.monthlyExpense || activeEmployee.salary * 1.5).toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Ücretli İzin Bakiyesi</span>
                      <span className="text-md font-bold font-mono text-emerald-450 mt-1 block flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        {activeEmployee.leftDays} İş Günü
                      </span>
                    </div>
                  </div>
                </div>

                {/* Yıllık İzin Girişi */}
                <div className={`p-5 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                }`}>
                  <h4 className="font-bold text-xs text-slate-450 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-550" />
                    <span>Yıllık Ücretli İzin Tescili</span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 mr-2">Onaylanacak izin süresi:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={leaveDaysRequest}
                        onChange={(e) => setLeaveDaysRequest(parseInt(e.target.value) || 1)}
                        className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded font-bold font-mono text-white text-center w-16 outline-none"
                      />
                      <span className="text-slate-500 ml-2">İş Günü</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApproveLeave}
                      className="px-4 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-lg text-[10px] uppercase font-bold tracking-wider"
                    >
                      Bordrodan İzni Düş
                    </button>
                  </div>
                </div>

                {/* Son Aktiviteler */}
                <div className={`p-5 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                }`}>
                  <h4 className="font-bold text-xs text-slate-350 uppercase tracking-wider mb-4">İK & Bordro İşlem Günlüğü</h4>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {activeEmployee.activities?.map((act, i) => (
                      <div key={i} className="text-xs text-slate-400 flex items-center gap-2 pl-2 border-l border-amber-500">
                        <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span>{act}</span>
                      </div>
                    )) || (
                      <p className="text-xs text-slate-500 italic">Kayıtlı işlem günlüğü yok.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Sub Content 2: Avans Tahakkuku */}
            {activeSubTab === "advance" && (
              <div className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
              }`}>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Personel Cari Avans Tahakkuku: {activeEmployee.name}
                </h3>

                <form onSubmit={handleIssueAdvance} className="space-y-4 text-xs">
                  <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 mb-4">
                    <p className="text-slate-400">
                      Personelin mevcut dönem birikmiş onaylı avans tutarı: <span className="text-amber-500 font-mono font-bold text-xs">{activeEmployee.activeAdvances.toLocaleString("tr-TR")} ₺</span>.
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Avanslar bir sonraki ay başı bordrosundan otomatik kesilir.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-semibold mb-1">* Ödenecek Avans / Ara Ödeme Tutarı (₺)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={advanceAmount || ""}
                      onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono max-w-xs block"
                      placeholder="Tutarı yazın"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                  >
                    Avans Fişini Onayla ve EFT Yap
                  </button>
                </form>
              </div>
            )}

            {/* Sub Content 3: Detailed Zimmet (Zimmet ve Demirbaş Tescil) */}
            {activeSubTab === "zimmet" && (
              <div className="space-y-6 animate-fadeIn text-xs">
                
                {/* Zimmet Form add / edit */}
                <div className={`p-5 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                }`}>
                  <h4 className="font-bold text-xs text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-550" />
                    <span>{editingZimmetId ? "Mevcut Zimmet Kaydını Düzenle" : "Yeni Demirbaş Zimmeti Tescil Et"}</span>
                  </h4>

                  <form onSubmit={handleSaveZimmet} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">* Demirbaş Malzeme / Ürün Adı</label>
                        {/* Dynamic dropdown helper which lists general high-value products in db or lets manual write */}
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={zimmetForm.itemName}
                            onChange={(e) => setZimmetForm({ ...zimmetForm, itemName: e.target.value })}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                            placeholder="Zimmetlenecek ürünü yazın veya aşağıdan seçin..."
                          />
                          {db.products.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[9px] text-slate-500 mr-1 self-center">Hızlı Seç:</span>
                              {db.products.slice(0, 4).map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setZimmetForm({ ...zimmetForm, itemName: `${p.brand} ${p.title}` })}
                                  className="p-1 px-2 rounded bg-slate-900 text-slate-400 text-[10px] hover:text-white"
                                >
                                  {p.brand} {p.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">* Verilen Miktar (Adet)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={zimmetForm.quantity}
                          onChange={(e) => setZimmetForm({ ...zimmetForm, quantity: parseInt(e.target.value) || 1 })}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">* Tescil (Teslim) Tarihi</label>
                        <input
                          type="date"
                          required
                          value={zimmetForm.givenDate}
                          onChange={(e) => setZimmetForm({ ...zimmetForm, givenDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                        />
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-400 pt-1">
                          <input
                            type="checkbox"
                            checked={zimmetForm.hasDeficit}
                            onChange={(e) => setZimmetForm({ ...zimmetForm, hasDeficit: e.target.checked, deficitQuantity: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-rose-500 focus:ring-rose-500"
                          />
                          <span>⚠️ Eksik / Hasarlı Malzeme Tespiti Var</span>
                        </label>
                        <p className="text-[9px] text-slate-500 mt-1 ml-6">Eğer teslim edilen üründe eksik veya hasar varsa tescil edin.</p>
                      </div>
                    </div>

                    {zimmetForm.hasDeficit && (
                      <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] text-rose-400 font-semibold mb-1">* Eksik veya Kullanılamaz Olan Adet</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={zimmetForm.quantity}
                            value={zimmetForm.deficitQuantity}
                            onChange={(e) => setZimmetForm({ ...zimmetForm, deficitQuantity: parseInt(e.target.value) || 1 })}
                            className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono w-32"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Maksimum teslim edilen adet kadar olabilir.</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Malzeme Detay Notları (Model No, Durumu, Seri No vb.)</label>
                      <input
                        type="text"
                        value={zimmetForm.notes}
                        onChange={(e) => setZimmetForm({ ...zimmetForm, notes: e.target.value })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                        placeholder="Örn: Barkod 869..., Seri No SN-92381 duruşu temiz, kılıfıyla verildi"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                      {editingZimmetId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingZimmetId(null);
                            setZimmetForm({
                              itemName: "",
                              quantity: 1,
                              givenDate: new Date().toISOString().split("T")[0],
                              hasDeficit: false,
                              deficitQuantity: 0,
                              notes: ""
                            });
                          }}
                          className="px-4 py-2 bg-slate-800 rounded-lg text-slate-300 font-bold"
                        >
                          İptal
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400"
                      >
                        {editingZimmetId ? "Güncellemeyi Kaydet" : "Tescil Et ve Envantere Bağla"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Zimmets List Workspace Table */}
                <div className={`p-5 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                }`}>
                  <h4 className="font-bold text-xs text-slate-350 uppercase tracking-wider mb-4">Aktif Zimmet Cetveli</h4>
                  
                  {!(activeEmployee.zimmetDetailed) || activeEmployee.zimmetDetailed.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs italic">
                      Personel üzerine tescillenmiş herhangi bir demirbaş zimmet kaydı bulunmamaktadır.
                      Yukarıdaki formdan ilk zimmetlemeyi yapabilirsiniz.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
                      <table className="w-full text-left text-[11px] text-slate-400">
                        <thead>
                          <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-300">
                            <th className="py-2.5 px-3">Envanter Kalemi</th>
                            <th className="py-2.5 px-3 text-center">Miktar</th>
                            <th className="py-2.5 px-3 font-mono">Tescil Tarihi</th>
                            <th className="py-2.5 px-3">Durum</th>
                            <th className="py-2.5 px-3">Açıklama / Notlar</th>
                            <th className="py-2.5 px-3 text-center">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {activeEmployee.zimmetDetailed.map((z, idx) => {
                            return (
                              <tr key={z.id || idx} className="hover:bg-slate-800/10">
                                <td className="py-2.5 px-3 text-white font-semibold flex items-center gap-1.5">
                                  <Laptop className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{z.itemName}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold font-mono">{z.quantity} Adet</td>
                                <td className="py-2.5 px-3 font-mono text-[10px]">{z.givenDate}</td>
                                <td className="py-2.5 px-3">
                                  {z.hasDeficit ? (
                                    <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-rose-500/10 text-rose-450 font-bold text-[9px]">
                                      <AlertCircle className="w-3 h-3 text-rose-500" />
                                      Eksik var ({z.deficitQuantity} Adet)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-emerald-500/10 text-emerald-450 font-bold text-[9px]">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Eksiksiz (Tam)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={z.notes}>
                                  {z.notes || "-"}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleEditZimmetClick(z)}
                                      className="p-1 text-indigo-400 hover:text-white hover:bg-indigo-500/10 rounded"
                                      title="Düzenle"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteZimmet(z.id, z.itemName)}
                                      className="p-1 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                                      title="İade Al / Sil"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">
            Personel dosyalarını ve performans kartlarını incelemek için sol taraftan bir çalışan seçin veya yeni personel sicil tescili ekleyin.
          </div>
        )}

      </div>

    </div>
  );
}
