/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Clipboard, 
  Truck, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  MapPin, 
  DollarSign, 
  FileCheck,
  Building,
  PackageCheck
} from "lucide-react";
import { DatabaseState, OrderStatus, Order, Transaction } from "../types";

interface OrdersTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function OrdersTab({ db, saveDb, addNotification, isDark }: OrdersTabProps) {

  // Dynamic workflow transitions
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    if (oldStatus === newStatus) return;

    let updatedOrders = db.orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    );

    let updatedTransactions = [...db.transactions];
    let updatedCustomers = [...db.customers];

    // Finance booking logic: When order moves specifically to "TESLIM_EDILDI", we automatically invoice & book it as income!
    // If it was already completed before, prevent double financial booking.
    if (newStatus === OrderStatus.TESLIM_EDILDI && oldStatus !== OrderStatus.TESLIM_EDILDI) {
      const financeTx: Transaction = {
        id: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
        type: "income",
        amount: order.total,
        description: `[E-Ticaret Sipariş Geliri] Sipariş #${order.id} Teslim Makbuzu - ${order.customerName}`,
        date: new Date().toISOString(),
        category: "Satış Geliri",
        accountType: "bank",
        accountName: "Akbank Ticari"
      };
      
      updatedTransactions = [financeTx, ...db.transactions];

      // Update Cari bakiye
      updatedCustomers = db.customers.map(c => {
        if (c.id === order.customerId) {
          // Add credit/reduce debt
          return { ...c, debt: Math.max(0, c.debt - order.total) };
        }
        return c;
      });

      addNotification(`Sipariş #${order.id} teslim edildi olarak işaretlendi. ${order.total.toLocaleString("tr-TR")} ₺ finansal gelir kaydı Akbank cari hesabına işlendi!`, "success");
    } else {
      addNotification(`Sipariş #${order.id} güncellendi: ${newStatus}`, "info");
    }

    saveDb({
      ...db,
      orders: updatedOrders,
      transactions: updatedTransactions,
      customers: updatedCustomers
    });
  };

  const statusColors = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.BEKLEMEDE: 
        return "bg-slate-800 text-slate-350 border-slate-700";
      case OrderStatus.HAZIRLANIYOR: 
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case OrderStatus.PAKETLENIYOR: 
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case OrderStatus.KARGODA: 
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case OrderStatus.TESLIM_EDILDI: 
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case OrderStatus.IPTAL_EDILDI: 
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      isDark ? "bg-slate-900/60 border-slate-800 animate-fade-in" : "bg-white border-slate-100"
    }`}>
      <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-800">
        <div>
          <h3 className={`text-md font-bold flex items-center gap-2.5 ${isDark ? "text-white" : "text-slate-950"}`}>
            <Clipboard className="w-5 h-5 text-amber-500" />
            <span>Sipariş ve Sevkiyat İş İstasyonu</span>
          </h3>
          <p className="text-xs text-slate-500">Müşterilerden gelen siparişlerin onay, paketleme, sevk ve kargo işlemleri</p>
        </div>
        <span className="text-xs font-mono px-3 py-1 bg-slate-800 border border-slate-700/80 rounded-lg text-slate-400">
          Toplam: <b>{db.orders.length} Fiili Sipariş</b>
        </span>
      </div>

      <div className="space-y-4">
        {db.orders.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10">Sistemde henüz oluşturulmuş sipariş bulunmamaktadır.</p>
        ) : (
          db.orders.map(order => {
            return (
              <div 
                key={order.id} 
                className={`p-4 rounded-xl border transition-all ${
                  isDark ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-100 hover:bg-slate-100/50"
                }`}
              >
                {/* Order Top Summary */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <Clipboard className="w-4 h-4 text-amber-500" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-white text-xs`}>#{order.id}</span>
                        <span className="text-[10px] text-slate-500">{new Date(order.date).toLocaleDateString("tr-TR")} {new Date(order.date).toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className={`text-xs font-bold block mt-0.5 text-slate-400`}>
                        {order.customerName}
                      </p>
                    </div>
                  </div>

                  {/* Pricing metrics */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Fatura Tutarı</span>
                      <span className="text-sm font-bold font-mono text-amber-500">
                        {order.total.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>

                    {/* Status widget dropdown bar */}
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold text-center mb-1">Durum Akışı</span>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className={`p-1.5 px-3 rounded-lg text-xs font-bold border outline-none font-sans cursor-pointer ${statusColors(order.status)}`}
                      >
                        <option value={OrderStatus.BEKLEMEDE}>Beklemede</option>
                        <option value={OrderStatus.HAZIRLANIYOR}>Hazırlanıyor</option>
                        <option value={OrderStatus.PAKETLENIYOR}>Paketleniyor</option>
                        <option value={OrderStatus.KARGODA}>Kargoda</option>
                        <option value={OrderStatus.TESLIM_EDILDI}>Teslim Edildi (Fatura Kes)</option>
                        <option value={OrderStatus.IPTAL_EDILDI}>İptal Edildi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items & Shipping particulars */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 text-xs">
                  
                  {/* Shopping products breakdown */}
                  <div className="md:col-span-2 space-y-1 bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60">
                    <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5" />
                      Sipariş Verilen Kalemler
                    </p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[80%]">• {item.productTitle}</span>
                        <span className="font-mono font-semibold text-slate-400">{item.quantity} Adet × {item.price.toLocaleString("tr-TR")} ₺</span>
                      </div>
                    ))}
                  </div>

                  {/* Logistics spec (Simulated cargo barcodes) */}
                  <div className="space-y-1 bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60">
                    <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      Sevkiyat & Kargo
                    </p>
                    <div className="space-y-0.5 font-sans">
                      <p className="text-slate-400">Takip No: <b className="text-white font-mono">{order.trackingNumber || "MNG-BEKLEYEN"}</b></p>
                      <p className="text-[10px] text-slate-500">MNG, Yurtiçi veya Sürat Kargo ile entegre faturası yazdırılabilir.</p>
                    </div>
                  </div>

                  {/* Fatura/Notes info */}
                  <div className="space-y-1 bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-1">Dahili Sevk Notu</p>
                      <p className="text-slate-400 text-[10px] italic">"{order.notes || 'Belirtilmedi'}"</p>
                    </div>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
