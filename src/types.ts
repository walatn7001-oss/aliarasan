/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// SİSTEM ORTAK TIPI
export enum OrderStatus {
  BEKLEMEDE = "Beklemede",
  HAZIRLANIYOR = "Hazırlanıyor",
  PAKETLENIYOR = "Paketleniyor",
  KARGODA = "Kargoda",
  TESLIM_EDILDI = "Teslim Edildi",
  IPTAL_EDILDI = "İptal Edildi"
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null; // For hierarchical trees
  order: number;
}

export interface Product {
  id: string;
  code: string;
  barcode: string;
  qrcode: string;
  title: string;
  brand: string;
  model: string;
  series: string;
  categoryId: string;
  subCategoryId?: string;
  color: string;
  size: string;
  weight: string;
  technicalDetails: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  price: number; // Satış fiyatı
  purchasePrice: number; // Alış fiyatı
  kdv: number; // Örn %20
  discount: number; // Örn %10 indirim
  stock: number;
  minStock: number;
  criticalStock: number;
  supplierInfo: string;
  images: string[];
  videos?: string[];
  documents?: { name: string; url: string }[];
  unit?: string; // "Adet" | "Metre" | "Koli" | "Paket" vb.
  isImported?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  taxOffice: string;
  taxNo: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
  debt: number; // Borç
  credit: number; // Alacak
  riskLimit: number;
  status: "active" | "passive";
  category: "Bayi" | "Müşteri" | "Özel Bayi";
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerCategory: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string;
  trackingNumber?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category: string; // "Satış Geliri", "Kira", "Maaş Ödemesi", "Mal Alımı", "Yol Masrafı" vb.
  accountType: "cash" | "bank"; // Kasa veya Banka
  accountName: string; // "Merkez Kasa", "Akbank Ticari", "Garanti Şube" vb.
  checkNumber?: string; // Çek/Senet numarası (isteğe bağlı)
}

export interface PurchasingQuote {
  id: string;
  supplierName: string;
  itemTitle: string;
  quotePrice: number;
  shippingDays: number;
  rating: number; // 1-5 yıldız
  status: "approved" | "pending" | "rejected";
  date: string;
}

export interface ZimmetItem {
  id: string;
  itemName: string;
  quantity: number; // Kaç adet/ürün
  givenDate: string; // Ne zaman verilmişiz
  hasDeficit: boolean; // Eksik var mı?
  deficitQuantity?: number; // Eksik miktarı
  notes?: string; // Detaylar / Durumu
}

export interface Personnel {
  id: string;
  name: string;
  role: string; // "Yönetici" | "Muhasebe" | "Satış Temsilcisi" | "Depo Sorumlusu" | "İK" vb.
  email: string;
  phone: string;
  salary: number;
  monthlyExpense?: number; // Personelin şirkete aylık toplam maliyeti/gideri (Maaş, SGK, Yol, Yemek vb.)
  activeAdvances: number; // Avans
  leftDays: number; // Kalan İzin Günü
  itemsZimmet: string[]; // Zimmetli ekipmanlar (eskiler için fallback)
  zimmetDetailed?: ZimmetItem[]; // Gelişmiş ürün zimmet takibi
  performanceScore: number; // 0-100
  activities: string[]; // Son aktiviteleri
}

export interface SystemBackup {
  version: string;
  timestamp: string;
  stats: {
    products: number;
    customers: number;
    orders: number;
    transactions: number;
  };
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string; // safely hashed password string
  role: "customer" | "admin";
  status: "active" | "passive" | "suspended";
  isVerified: boolean;
  emailVerificationCode?: string;
  resetToken?: string;
  resetTokenExpires?: string; // ISO date-time string
  createdAt: string;
  lastLoginAt?: string;
}

export interface PromissoryCheck {
  id: string;
  drawer: string;
  bank: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface DatabaseState {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  transactions: Transaction[];
  quotes: PurchasingQuote[];
  personnel: Personnel[];
  backupHistory: SystemBackup[];
  checks?: PromissoryCheck[];
  auditLogs?: string[];
  users?: AppUser[];
}

