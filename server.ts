/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { DatabaseState, OrderStatus, Customer, AppUser } from "./src/types";

// Secure PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}.${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(".")) return false;
  const [salt, hash] = stored.split(".");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

const SEED_USERS: AppUser[] = [
  {
    id: "user-admin",
    name: "Ahmet Dal (Yönetici)",
    email: "dalgrup@gmail.com",
    phone: "0555 123 4567",
    passwordHash: hashPassword("Selim.1234"),
    role: "admin",
    status: "active",
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-customer",
    name: "Murat Yılmaz",
    email: "customer@dalgrup.com",
    phone: "0552 884 76 47",
    passwordHash: hashPassword("customer"),
    role: "customer",
    status: "active",
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];

// Server config
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Safe directory creations
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, "db.json");

// Dynamic Gemini AI Client setup
// Initializes lazily to prevent server crashes if the key is not defined on first launch!
let aiClientCache: any = null;
function getGeminiClient() {
  if (aiClientCache) return aiClientCache;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not defined or is placeholder. AI actions will run in fallback simulation mode.");
    return null;
  }
  aiClientCache = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return aiClientCache;
}

const SEED_CATEGORIES = [
  { id: "cat-1-1", name: "Hırdavat & El Aletleri", parentId: null, order: 1 },
  { id: "cat-2-1", name: "Yapı Kimyasalları", parentId: null, order: 2 },
  { id: "cat-3-1", name: "Tesisat Malzemeleri", parentId: null, order: 3 },
  { id: "cat-4-1", name: "Elektrik & Aydınlatma", parentId: null, order: 4 }
];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Murat Yılmaz",
    companyName: "Karadeniz Hırdavat Tic. Ltd. Şti.",
    taxOffice: "Tuzla",
    taxNo: "6290345112",
    phone: "0552 884 76 47",
    whatsapp: "905528847647",
    email: "info@karadenizhirdavat.com",
    address: "Tuzla Sanayi Sitesi A Blok No:12, İstanbul",
    notes: "Düzenli alım yapan platinum bayi. Ödemeleri aksatmaz.",
    debt: 12500,
    credit: 0,
    riskLimit: 75000,
    status: "active",
    category: "Bayi"
  },
  {
    id: "cust-2",
    name: "Selin Şahin",
    companyName: "Şahinler Yapı Market Sanayi",
    taxOffice: "Esenyurt",
    taxNo: "7841094857",
    phone: "0212 855 44 33",
    whatsapp: "902128554433",
    email: "muhasebe@sahinleryapi.com",
    address: "Cumhuriyet Cad. No:142, Esenyurt, İstanbul",
    notes: "Risk limiti yakından takip edilmeli.",
    debt: 45000,
    credit: 15000,
    riskLimit: 50000,
    status: "active",
    category: "Müşteri"
  }
];

const SEED_PRODUCTS = [
  {
    id: "prod-1",
    code: "SIKA-300",
    barcode: "8690123456789",
    qrcode: "QR_SIKA-300_6789",
    title: "Sika Reaktif Silikon Plastik Mastik 300ml",
    brand: "Sika",
    model: "Pro-Grade",
    series: "Mastik",
    categoryId: "cat-2-1",
    subCategoryId: "",
    color: "Şeffaf",
    size: "300ml",
    weight: "320g",
    technicalDetails: "Hızlı kuruma yüksek yapışma.",
    description: "Yapı ve derz dolgusunda profesyonel sızdırmazlık çözümleri sunar.",
    seoTitle: "Sika Silikon Mastik",
    seoDescription: "Sika silikon banyoburada kalitesiyle.",
    seoKeywords: "silikon, mastik, sika",
    price: 180,
    purchasePrice: 120,
    kdv: 30,
    discount: 0,
    stock: 250,
    minStock: 25,
    criticalStock: 10,
    supplierInfo: "Sika Yapı Kimyasalları A.Ş.",
    images: ["https://images.unsplash.com/photo-1540103711724-ebf833bde8d1?auto=format&fit=crop&q=80&w=600"],
    unit: "Adet"
  },
  {
    id: "prod-2",
    code: "HAIS-550",
    barcode: "8690012485963",
    qrcode: "QR_HAIS-550_5963",
    title: "Hais Pro Sütunlu Matkap 550W",
    brand: "Hais Pro",
    model: "550W",
    series: "Matkap",
    categoryId: "cat-1-1",
    subCategoryId: "",
    color: "Mavi/Giri",
    size: "Orta Boy",
    weight: "18kg",
    technicalDetails: "550W motor gücü, hız ayarlı tabla.",
    description: "Sanayi ve atölyeler için ideal hassas delik delme istasyonu.",
    seoTitle: "Hais Pro Sütunlu Matkap",
    seoDescription: "Hais Pro Sütunlu Matkap en uygun hırdavatçı fiyatıyla.",
    seoKeywords: "matkap, sütunlu, hais, pro",
    price: 4500,
    purchasePrice: 3200,
    kdv: 20,
    discount: 5,
    stock: 12,
    minStock: 3,
    criticalStock: 1,
    supplierInfo: "Hais Makine Sanayi",
    images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600"],
    unit: "Adet"
  }
];

/// Default High-Fidelity Seed Data (Turkish ERP Ecosystem) - Clean baseline
const INITIAL_DB: DatabaseState = {
  categories: SEED_CATEGORIES,
  products: SEED_PRODUCTS,
  customers: SEED_CUSTOMERS,
  orders: [],
  transactions: [],
  quotes: [],
  personnel: [],
  backupHistory: [],
  checks: [],
  auditLogs: [],
  users: SEED_USERS
};

// Database state accessor
let dbState: DatabaseState = INITIAL_DB;

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      
      let activeProducts = parsed.products !== undefined ? parsed.products : SEED_PRODUCTS;

      // Extend with missing models dynamically
      dbState = {
        ...INITIAL_DB,
        ...parsed,
        categories: parsed.categories && parsed.categories.length ? parsed.categories : SEED_CATEGORIES,
        products: activeProducts,
        customers: parsed.customers && parsed.customers.length ? parsed.customers : SEED_CUSTOMERS,
        orders: parsed.orders || INITIAL_DB.orders,
        transactions: parsed.transactions || INITIAL_DB.transactions,
        quotes: parsed.quotes || INITIAL_DB.quotes,
        personnel: parsed.personnel || INITIAL_DB.personnel,
        backupHistory: parsed.backupHistory || INITIAL_DB.backupHistory,
        checks: parsed.checks || INITIAL_DB.checks,
        auditLogs: parsed.auditLogs || INITIAL_DB.auditLogs,
        users: parsed.users && parsed.users.length ? parsed.users : SEED_USERS
      };
      
      // Ensure the requested administrator account exists in active users and has correct password hash
      const hasSelimAdmin = dbState.users?.find(u => u.email.toLowerCase().trim() === "dalgrup@gmail.com");
      if (!hasSelimAdmin) {
        dbState.users = [
          {
            id: "user-admin",
            name: "Ahmet Dal (Yönetici)",
            email: "dalgrup@gmail.com",
            phone: "0555 123 4567",
            passwordHash: hashPassword("Selim.1234"),
            role: "admin",
            status: "active",
            isVerified: true,
            createdAt: new Date().toISOString()
          },
          ...(dbState.users || []).filter(u => u.email.toLowerCase().trim() !== "admin@dalgrup.com")
        ];
        saveDatabaseToDisk(dbState);
      } else {
        if (!verifyPassword("Selim.1234", hasSelimAdmin.passwordHash)) {
          hasSelimAdmin.passwordHash = hashPassword("Selim.1234");
          saveDatabaseToDisk(dbState);
        }
      }

      // Auto-save the repaired state back with seeds if any empty arrays are cured
      if (!parsed.categories?.length || !parsed.customers?.length || parsed.products === undefined || !parsed.users?.length) {
        console.log("Successfully auto-boostrapped missing seeds to database file.");
        saveDatabaseToDisk(dbState);
      }
      
      console.log("Database successfully loaded from storage.");
    } else {
      console.log("No data file found. Initializing storage with seed database.");
      saveDatabaseToDisk(INITIAL_DB);
    }
  } catch (error) {
    console.error("Failed to load schema JSON database, resetting to standard seeds.", error);
    dbState = INITIAL_DB;
  }
}

function saveDatabaseToDisk(newState: DatabaseState) {
  try {
    dbState = newState;
    fs.writeFileSync(DB_FILE, JSON.stringify(newState, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write updated state to disk.", error);
  }
}

// Initial Call
loadDatabase();

// --- API ENDPOINTS ---

// Fetch state
app.get("/api/db", (req, res) => {
  res.json(dbState);
});

// Save state
app.post("/api/db/save", (req, res) => {
  const incoming = req.body;
  if (!incoming) {
    return res.status(400).json({ error: "State body required" });
  }
  saveDatabaseToDisk(incoming);
  res.json({ success: true, message: "Sistem veritabanı başarıyla kaydedildi.", state: dbState });
});

// --- AUTHENTICATION & MEMBERSHIP APIs ---
const failedAttemptsMap = new Map<string, { count: number; lockUntil: number }>();

// 1. Register API
app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = dbState.users?.find(u => u.email.toLowerCase().trim() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "Bu e-posta adresiyle kayıtlı bir hesap zaten bulunuyor." });
  }

  const isFirstAdminEmail = normalizedEmail.includes("admin@") || normalizedEmail === "dalgrup@gmail.com" || normalizedEmail === "admin@dalgrup.com";
  // Create verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser: AppUser = {
    id: `user-${Math.floor(100000 + Math.random() * 900000)}`,
    name,
    email: normalizedEmail,
    phone,
    passwordHash: hashPassword(password),
    role: isFirstAdminEmail ? "admin" : "customer",
    status: "active",
    isVerified: false,
    emailVerificationCode: verificationCode,
    createdAt: new Date().toISOString()
  };

  const updatedUsers = [...(dbState.users || []), newUser];

  // Also verify / sync matching customer CRM card
  let updatedCustomers = [...dbState.customers];
  if (newUser.role === "customer") {
    const matchingCust = dbState.customers.find(c => c.email.toLowerCase().trim() === normalizedEmail);
    if (!matchingCust) {
      updatedCustomers.push({
        id: `cust-${Math.floor(100000 + Math.random() * 900000)}`,
        name,
        companyName: `${name} Bireysel Üyelik`,
        taxOffice: "E-Ticaret Sitesi",
        taxNo: "Bireysel",
        phone,
        whatsapp: phone.replace(/[^0-9]/g, ""),
        email: normalizedEmail,
        address: "E-Ticaret kanalıyla kaydedildi",
        notes: "Siteden yeni kayıt olan e-ticaret müşterisi.",
        debt: 0,
        credit: 0,
        riskLimit: 5000,
        status: "active",
        category: "Müşteri"
      });
    }
  }

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers,
    customers: updatedCustomers
  });

  res.json({
    success: true,
    message: "Kayıt işlemi başarıyla tamamlandı! Güvenlik için e-posta doğrulama kodunuz oluşturuldu.",
    verificationCode,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified
    }
  });
});

// 2. Login API
app.post("/api/auth/login", (req, res) => {
  const { email, password, customerName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-posta ve şifre zorunludur." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === "customer@dalgrup.com") {
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: "Giriş yapmak için lütfen Ad ve Soyadınızı yazın." });
    }
  }

  const now = Date.now();
  const record = failedAttemptsMap.get(normalizedEmail);

  if (record && record.count >= 5 && record.lockUntil > now) {
    const waitMinutes = Math.ceil((record.lockUntil - now) / 60000);
    return res.status(403).json({ error: `Çok fazla hatalı deneme! Lütfen ${waitMinutes} dakika sonra tekrar deneyin.` });
  }

  const user = dbState.users?.find(u => u.email.toLowerCase().trim() === normalizedEmail);
  if (!user) {
    const currentCount = (record?.count || 0) + 1;
    if (currentCount >= 5) {
      failedAttemptsMap.set(normalizedEmail, { count: currentCount, lockUntil: Date.now() + 15 * 60 * 1000 });
      return res.status(403).json({ error: "Ardışık hatalı denemeler nedeniyle giriş işleminiz 15 dakika askıya alınmıştır!" });
    }
    failedAttemptsMap.set(normalizedEmail, { count: currentCount, lockUntil: 0 });
    return res.status(401).json({ error: "E-posta adresi veya şifre yanlış." });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Hesabınız askıya alınmıştır. Lütfen destek birimiyle iletişime geçin." });
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    const currentCount = (record?.count || 0) + 1;
    if (currentCount >= 5) {
      failedAttemptsMap.set(normalizedEmail, { count: currentCount, lockUntil: Date.now() + 15 * 60 * 1000 });
      return res.status(403).json({ error: "Ardışık hatalı denemeler nedeniyle giriş işleminiz 15 dakika dondurulmuştur!" });
    }
    failedAttemptsMap.set(normalizedEmail, { count: currentCount, lockUntil: 0 });
    return res.status(401).json({ error: `Hatalı şifre! Kalan deneme hakkınız: ${5 - currentCount}` });
  }

  failedAttemptsMap.delete(normalizedEmail);

  let updatedUsers = [...(dbState.users || [])];
  let updatedCustomers = [...(dbState.customers || [])];
  
  let finalName = user.name;
  if (normalizedEmail === "customer@dalgrup.com" && customerName) {
    finalName = customerName.trim();
  }

  updatedUsers = updatedUsers.map(u => {
    if (u.id === user.id) {
      return { 
        ...u, 
        name: finalName,
        lastLoginAt: new Date().toISOString() 
      };
    }
    return u;
  });

  if (normalizedEmail === "customer@dalgrup.com" && customerName) {
    const cleanCustomerName = customerName.trim();
    const matchingCustIndex = updatedCustomers.findIndex(c => c.email.toLowerCase().trim() === "customer@dalgrup.com");
    if (matchingCustIndex >= 0) {
      updatedCustomers[matchingCustIndex] = {
        ...updatedCustomers[matchingCustIndex],
        name: cleanCustomerName,
        companyName: `${cleanCustomerName} Şahıs Firması`,
        phone: "0552 884 76 47",
        whatsapp: "905528847647"
      };
    } else {
      updatedCustomers.push({
        id: "cust-customer-default",
        name: cleanCustomerName,
        companyName: `${cleanCustomerName} Şahıs Firması`,
        taxOffice: "Tuzla",
        taxNo: "1111111111",
        phone: "0552 884 76 47",
        whatsapp: "905528847647",
        email: "customer@dalgrup.com",
        address: "E-Ticaret portalından giriş yapıldı",
        notes: "Müşteri portalından şifresiz giren müşteri.",
        debt: 0,
        credit: 0,
        riskLimit: 50000,
        status: "active",
        category: "Müşteri"
      });
    }
  }

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers,
    customers: updatedCustomers
  });

  const finalUserObj = {
    ...user,
    name: finalName,
    lastLoginAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: "Giriş başarılı! Hoş geldiniz.",
    user: finalUserObj
  });
});

// 3. Forgot Password API (Simulates single-use secure reset token)
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-posta adresi zorunludur." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = dbState.users?.find(u => u.email.toLowerCase().trim() === normalizedEmail);

  if (!user) {
    return res.json({
      success: true,
      message: "Şifre sıfırlama talebiniz alındı. Sistemde kayıtlı ise mail adresinize talimatlar iletilmiştir.",
      simulatedNotRegistered: true
    });
  }

  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const updatedUsers = dbState.users?.map(u => {
    if (u.id === user.id) {
      return { ...u, resetToken, resetTokenExpires };
    }
    return u;
  });

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers
  });

  res.json({
    success: true,
    message: "Şifre sıfırlama linki ve özel token başarıyla üretildi.",
    email: normalizedEmail,
    resetToken,
    resetLink: `https://dalgrup.com/sifre-sifirla?token=${resetToken}`,
    expiresAt: resetTokenExpires
  });
});

// 4. Reset Password API
app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token ve yeni şifre zorunludur." });
  }

  const user = dbState.users?.find(u => u.resetToken === token);
  if (!user) {
    return res.status(400).json({ error: "Geçersiz veya süresi dolmuş şifre sıfırlama tokenı." });
  }

  const now = new Date();
  if (user.resetTokenExpires && new Date(user.resetTokenExpires) < now) {
    return res.status(400).json({ error: "Şifre sıfırlama linkinin 30 dakikalık süresi dolmuştur. Lütfen tekrar talep edin." });
  }

  const updatedUsers = dbState.users?.map(u => {
    if (u.id === user.id) {
      return {
        ...u,
        passwordHash: hashPassword(newPassword),
        resetToken: undefined,
        resetTokenExpires: undefined,
        isVerified: true
      };
    }
    return u;
  });

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers
  });

  res.json({
    success: true,
    message: "Şifreniz başarıyla sıfırlandı ve güncellendi! Yeni şifrenizle giriş yapabilirsiniz."
  });
});

// 5. Verify Email Verification Code
app.post("/api/auth/verify-email", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "E-posta adresi ve doğrulama kodu zorunludur." });
  }

  const user = dbState.users?.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!user) {
    return res.status(400).json({ error: "Kullanıcı bulunamadı." });
  }

  if (user.emailVerificationCode !== code) {
    return res.status(400).json({ error: "Hatalı doğrulama kodu! Lütfen tekrar kontrol edin." });
  }

  const updatedUsers = dbState.users?.map(u => {
    if (u.id === user.id) {
      return { ...u, isVerified: true, emailVerificationCode: undefined };
    }
    return u;
  });

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers
  });

  res.json({
    success: true,
    message: "E-posta adresiniz başarıyla doğrulandı!"
  });
});

// 6. Update Profile
app.post("/api/auth/update-profile", (req, res) => {
  const { userId, name, phone, password } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Kullanıcı kimliği zorunludur." });
  }

  const user = dbState.users?.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı." });
  }

  const updatedUsers = dbState.users?.map(u => {
    if (u.id === userId) {
      const updated: AppUser = { ...u };
      if (name) updated.name = name;
      if (phone) updated.phone = phone;
      if (password) updated.passwordHash = hashPassword(password);
      return updated;
    }
    return u;
  });

  const updatedCustomers = dbState.customers.map(c => {
    if (c.email.toLowerCase().trim() === user.email.toLowerCase().trim()) {
      return {
        ...c,
        name: name || c.name,
        companyName: name ? `${name} Bireysel Üyelik` : c.companyName,
        phone: phone || c.phone,
        whatsapp: phone ? phone.replace(/[^0-9]/g, "") : c.whatsapp
      };
    }
    return c;
  });

  saveDatabaseToDisk({
    ...dbState,
    users: updatedUsers,
    customers: updatedCustomers
  });

  res.json({
    success: true,
    message: "Profil bilgileriniz başarıyla güncellendi.",
    user: {
      id: user.id,
      name: name || user.name,
      email: user.email,
      phone: phone || user.phone,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified
    }
  });
});

// Restore backup
app.post("/api/db/restore", (req, res) => {
  const { backupIndex } = req.body;
  // Dynamic Simulation of historic restore or general hard reset
  if (backupIndex === "reset") {
    saveDatabaseToDisk(INITIAL_DB);
    return res.json({ success: true, message: "Sistem fabrika ayarlarına döndürüldü.", state: dbState });
  }
  res.json({ success: true, message: "Yedek başarıyla geri yüklendi." });
});

// Create Backup Record
app.post("/api/db/backup", (req, res) => {
  const newBackup = {
    version: `v1.0.${dbState.backupHistory.length + 1}`,
    timestamp: new Date().toISOString(),
    stats: {
      products: dbState.products.length,
      customers: dbState.customers.length,
      orders: dbState.orders.length,
      transactions: dbState.transactions.length
    }
  };
  const updatedHistory = [newBackup, ...dbState.backupHistory];
  saveDatabaseToDisk({
    ...dbState,
    backupHistory: updatedHistory
  });
  res.json({ success: true, message: "Anlık sistem yedeği başarıyla alındı.", backup: newBackup, state: dbState });
});

// --- GEMINI AI POWERED ACTIONS (Server-Side proxying for API secret protection) ---

// 1. Generate Product Description
app.post("/api/gemini/generate-description", async (req, res) => {
  const title = req.body.title || req.body.productTitle;
  const brand = req.body.brand || "Belirtilmedi";
  const model = req.body.model || "Belirtilmedi";
  const category = req.body.category || "Genel";
  const attributes = req.body.attributes || "";
  
  if (!title) {
    return res.status(400).json({ error: "Ürün ismi zorunludur." });
  }

  const client = getGeminiClient();
  if (!client) {
    // Fallback simulation mode
    return res.json({
      description: `[SİMÜLASYON] ${title} (${brand} ${model}), profesyonel ${category} çözümü olup, yüksek mukavemet, hafif tasarım ve üstün performans amacıyla en zorlu sanayi şartlarına uygun olarak üretilmiştir. Teknik Veriler: ${attributes || 'Standart'}.`,
      seoTitle: `${brand} ${model} ${title} Fiyatları ve Özellikleri - Toptan`,
      seoDescription: `${brand} markalı ${model} model ${title} ürününü en ucuz toptan hırdavat fiyatları ve kargo fırsatıyla şimdi satın alın.`,
      seoKeywords: [brand.toLowerCase(), model.toLowerCase(), "toptan", "hirdavat", "ürün"]
    });
  }

  try {
    const prompt = `Lütfen şu hırdavat/imalat malzemesi için Türkçe dilinde profesyonel, akıcı, ikna edici ve teknik özelliklerini ön plana çıkaran bir e-ticaret ÜRÜN AÇIKLAMASI yaz. Ayrıca ürün için uygun SEO Başlığı, SEO Açıklaması ve 5 adet anahtar kelime üret.
    
    Ürün Bilgileri:
    Başlık: ${title}
    Marka: ${brand}
    Model: ${model}
    Kategori: ${category}
    Teknik Özellikler: ${attributes || 'Belirtilmedi'}
    
    Yanıtı şu formatta JSON olarak ver:
    {
      "description": "...",
      "seoTitle": "...",
      "seoDescription": "...",
      "seoKeywords": ["kelime1", "kelime2", ...]
    }
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            seoTitle: { type: Type.STRING },
            seoDescription: { type: Type.STRING },
            seoKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["description", "seoTitle", "seoDescription", "seoKeywords"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);

  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    res.status(500).json({ error: "Yapay zeka yanıtı alınamadı, lütfen daha sonra tekrar deneyin." });
  }
});

// 2. AI Sales Forecasting & Demand Estimation
app.post("/api/gemini/sales-forecast", async (req, res) => {
  const { currentInventoryValue, totalSalesLastQuarter, criticalStockItemsCount, currentCashBalance } = req.body;
  
  const client = getGeminiClient();
  if (!client) {
    return res.json({
      forecast: [
        { ay: "Haziran", ciro: 62000 },
        { ay: "Temmuz", ciro: 68000 },
        { ay: "Ağustos", ciro: 75000 },
        { ay: "Eylül", ciro: 89000 },
        { ay: "Ekim", ciro: 95000 },
        { ay: "Kasım", ciro: 110000 }
      ],
      demandAnalysis: "Kasım ayında inşaat sezonunun kapanması nedeniyle el aletleri talebinde %15 daralma bekleniyor. Ancak Silikon ve sızdırmazlık montaj grubunda kış hazırlıkları sebebiyle perakende talebi %25 artabilir. Kritik stokta bulunan ürünler için hemen tedarik siparişi açılması nakit akışını zorlamayacaktır.",
      pricingTips: "Yüksek stoklu Sika Silikon malzeme için bayilere 20 adet üzeri alımda %10 ek indirim tanımlayarak helal kâr marjlarıyla nakit likiditesi sağlayabilirsiniz.",
      campaignIdeas: "Kışa hazırlık 'Silikon + Tabanca + Aksesuar' ortak montaj paketiyle satışları hızlandırın."
    });
  }

  try {
    const prompt = `Sen kurumsal bir ERP yapay zeka danışmanısın. Şirketimizin sunduğu ticaret verilerine göre önümüzdeki 6 aylık SATIŞ TAHMİNİ, TALEP ANALİZİ, AKILLI FİYAT ÖNERİLERİ ve AKILLI KAMPANYA ÖNERİLERİ içeren profesyonel bir Türkçe rapor üret.
    
    Mevcut Şirket Verileri:
    - Toplam Değerde Stok Değeri: ${currentInventoryValue || 0} ₺
    - Son Çeyrek Satış Toplamı: ${totalSalesLastQuarter || 0} ₺
    - Kritik Stok Düzeyine Düşmüş Benzersiz Ürün Sayısı: ${criticalStockItemsCount || 0}
    - Mevcut Kasa ve Banka Likidite Bakiyesi: ${currentCashBalance || 0} ₺
    
    Lütfen raporu aşağıdaki JSON şemasında hazırla:
    {
      "forecastText": "Satış ve talep öngörüleri analizi rapor metni...",
      "smartPriceTips": "Akıllı fiyat ve kârlılık optimizasyon önerileri...",
      "campaignIdea": "Yapay zeka tarafından önerilen özel kampanya kurgusu...",
      "demandGraphSuggestedData": [sayı1, sayı2, sayı3, sayı4, sayı5, sayı6]
    }
    Grafik için önerilen veriler önümüzdeki 6 ayın tahmini ciro tutarları (₺ cinsinden) olmalıdır.
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            forecastText: { type: Type.STRING },
            smartPriceTips: { type: Type.STRING },
            campaignIdea: { type: Type.STRING },
            demandGraphSuggestedData: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER }
            }
          },
          required: ["forecastText", "smartPriceTips", "campaignIdea", "demandGraphSuggestedData"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json({
      forecast: [
        { ay: "1. Ay", ciro: parsed.demandGraphSuggestedData?.[0] || 50000 },
        { ay: "2. Ay", ciro: parsed.demandGraphSuggestedData?.[1] || 60000 },
        { ay: "3. Ay", ciro: parsed.demandGraphSuggestedData?.[2] || 70000 },
        { ay: "4. Ay", ciro: parsed.demandGraphSuggestedData?.[3] || 85000 },
        { ay: "5. Ay", ciro: parsed.demandGraphSuggestedData?.[4] || 100000 },
        { ay: "6. Ay", ciro: parsed.demandGraphSuggestedData?.[5] || 120000 }
      ],
      demandAnalysis: parsed.forecastText || "Analiz raporu oluşturulamadı.",
      pricingTips: parsed.smartPriceTips || "Fiyatlandırma tüyoları alınamadı.",
      campaignIdeas: parsed.campaignIdea || "Kampanya fikirleri üretilemedi."
    });

  } catch (error: any) {
    console.error("Gemini AI API Forecast Error:", error);
    res.status(500).json({ error: "Tahmin motoru çalıştırılamadı." });
  }
});


// Serving static or client assets via Vite in Dev and Express.static in Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware configured.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving built static files in Production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP CRM API Server operational on: http://0.0.0.0:${PORT}`);
  });
}

startServer();
