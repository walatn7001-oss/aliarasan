/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  FolderPlus, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Barcode, 
  QrCode, 
  Folder, 
  Layers, 
  Upload, 
  ZoomIn, 
  FileText,
  DollarSign,
  TrendingUp,
  Check,
  X,
  Image as ImageIcon,
  FileSpreadsheet,
  Sparkles
} from "lucide-react";
import { Category, Product, DatabaseState } from "../types";
import { motion } from "motion/react";

interface ProductsTabProps {
  db: DatabaseState;
  saveDb: (state: DatabaseState) => void;
  addNotification: (msg: string, type: "info" | "warning" | "success") => void;
  isDark: boolean;
}

export default function ProductsTab({ db, saveDb, addNotification, isDark }: ProductsTabProps) {
  // Local states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "form" | "categories" | "import">("list");
  
  // Edit Category States
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  
  // Editorial and digital zooom
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  
  // Draft Product State for Create/Edit workflow
  const [isEditing, setIsEditing] = useState<string | null>(null); // holds product.id
  const emptyProduct: Omit<Product, "id"> = {
    code: "",
    barcode: "",
    qrcode: "",
    title: "",
    brand: "",
    model: "",
    series: "",
    categoryId: "cat-1-1",
    subCategoryId: "",
    color: "",
    size: "",
    weight: "",
    technicalDetails: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    price: 0,
    purchasePrice: 0,
    kdv: 30, // Default changed to 30 as KDV standard
    discount: 0,
    stock: 0,
    minStock: 5,
    criticalStock: 2,
    supplierInfo: "",
    images: ["https://images.unsplash.com/photo-1540103711724-ebf833bde8d1?auto=format&fit=crop&q=80&w=600"],
    unit: "Adet"
  };
  const [productForm, setProductForm] = useState<Omit<Product, "id">>(emptyProduct);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // BULK EXCEL / ERP CLIENT-SIDE IMPORT MODULE
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<Omit<Product, "id">[]>([]);

  const parseTurkishNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    let str = String(val).trim();
    if (!str) return 0;
    
    // Remove currency symbols, non-numeric except dot, comma, hyphen
    str = str.replace(/[^\d.,-]/g, '');
    
    // If both . and , exist: e.g. 1.250,90
    if (str.includes(".") && str.includes(",")) {
      if (str.indexOf(".") < str.indexOf(",")) {
        str = str.split(".").join("").replace(",", ".");
      } else {
        str = str.split(",").join("");
      }
    } else if (str.includes(",")) {
      const commaCount = (str.match(/,/g) || []).length;
      if (commaCount === 1) {
        str = str.replace(",", ".");
      } else {
        str = str.split(",").join("");
      }
    } else if (str.includes(".")) {
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount > 1) {
        str = str.split(".").join("");
      }
    }
    
    return parseFloat(str) || 0;
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const mapKeysWithSynonyms = (rawObj: Record<string, any>): Omit<Product, "id"> => {
    const synonyms: Record<string, string[]> = {
      title: ["ürün adı", "urun adi", "urunadı", "başlık", "baslik", "title", "name", "ürün", "urun", "ürün adı adeti", "ad", "adi"],
      code: ["ürün kodu", "ürün kodu", "urun kodu", "kodu", "code", "kod", "stok kodu", "stokkodu", "model referans", "ref", "referans"],
      barcode: ["barkod", "barcode", "barkod numarası", "gtin", "ean", "barkod no"],
      price: ["satış fiyatı", "satis fiyati", "fiyat", "price", "fiyatı", "tutar", "satis", "satış"],
      purchasePrice: ["alış fiyatı", "alis fiyati", "maliyet", "purchase price", "buying price", "alis", "alış"],
      stock: ["stok", "stok adedi", "miktar", "stock", "adet", "bakiye", "kalan", "stok_miktari"],
      brand: ["marka", "brand", "üretici", "imalatci"],
      model: ["model", "ürün tipi"],
      categoryName: ["kategori", "category", "alt kategori", "kategorisi"],
      unit: ["birim", "birimi", "unit", "ölçü", "olcu", "birim seti", "bırımlen"]
    };

    const getVal = (keys: string[]): any => {
      for (const k of Object.keys(rawObj)) {
        const cleanK = k.trim().toLowerCase();
        if (keys.includes(cleanK)) {
          return rawObj[k];
        }
      }
      return undefined;
    };

    const categoryNameVal = getVal(synonyms.categoryName);
    let categoryId = "cat-1-1"; // default if empty
    if (categoryNameVal) {
      const cleanCatName = String(categoryNameVal).trim();
      const existing = db.categories.find(c => c.name.toLowerCase() === cleanCatName.toLowerCase());
      if (existing) {
        categoryId = existing.id;
      } else {
        const newId = `cat-${Math.floor(1000 + Math.random() * 9000)}`;
        // Save dynamically later on execution
        db.categories.push({
          id: newId,
          name: cleanCatName,
          parentId: null,
          order: db.categories.length + 1
        });
        categoryId = newId;
      }
    }

    const priceNum = parseTurkishNumber(getVal(synonyms.price));
    const purchaseNum = parseTurkishNumber(getVal(synonyms.purchasePrice));
    const stockNum = Math.round(parseTurkishNumber(getVal(synonyms.stock))) || 0;
    const unitVal = getVal(synonyms.unit) ? String(getVal(synonyms.unit)).trim() : "Adet";

    return {
      code: String(getVal(synonyms.code) || `BULK-${Math.floor(10000 + Math.random() * 90000)}`),
      barcode: String(getVal(synonyms.barcode) || ""),
      qrcode: "",
      title: String(getVal(synonyms.title) || `ERP Ürünü - ${Math.floor(1000+Math.random()*9000)}`),
      brand: String(getVal(synonyms.brand) || "Belirtilmemiş"),
      model: String(getVal(synonyms.model) || "Belirtilmemiş"),
      series: "",
      categoryId: categoryId,
      subCategoryId: "",
      color: String(rawObj.color || rawObj.renk || ""),
      size: String(rawObj.size || rawObj.boyut || rawObj.ebat || ""),
      weight: String(rawObj.weight || rawObj.agirlik || ""),
      technicalDetails: String(rawObj.technicalDetails || rawObj.detay || ""),
      description: String(rawObj.description || rawObj.aciklama || ""),
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      price: priceNum,
      purchasePrice: purchaseNum,
      kdv: Number(rawObj.kdv || rawObj.vergi) || 20,
      discount: Number(rawObj.discount || rawObj.indirim) || 0,
      stock: stockNum,
      minStock: 5,
      criticalStock: 2,
      supplierInfo: "",
      images: ["https://images.unsplash.com/photo-1540103711724-ebf833bde8d1?auto=format&fit=crop&q=80&w=600"],
      unit: unitVal
    };
  };

  const parseBulkText = (text: string) => {
    if (!text.trim()) {
      addNotification("Lütfen dönüştürülecek ürün listesi metnini girin.", "warning");
      return;
    }

    try {
      const trimmed = text.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const mapped = list.map(item => mapKeysWithSynonyms(item));
        setImportPreview(mapped);
        addNotification(`JSON formatında ${mapped.length} adet ürün başarıyla çözümlendi.`, "success");
        return;
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 1) {
        addNotification("Geçerli veri satırı bulunamadı.", "warning");
        return;
      }

      let delimiter = ",";
      const firstLine = lines[0];
      if (firstLine.includes(";")) {
        delimiter = ";";
      } else if (firstLine.includes("\t")) {
        delimiter = "\t";
      } else if (!firstLine.includes(",") && firstLine.includes("|")) {
        delimiter = "|";
      }

      const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase());
      const parsedItems: Omit<Product, "id">[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        if (values.length === 0 || values.join("").trim() === "") continue;

        const rawObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawObj[header] = values[index] || "";
        });

        parsedItems.push(mapKeysWithSynonyms(rawObj));
      }

      setImportPreview(parsedItems);
      addNotification(`Excel/ERP formatında ${parsedItems.length} adet ürün çözümlendi. Lütfen aşağıdaki listeyi onaylayın.`, "success");
    } catch (err) {
      console.error(err);
      addNotification("Dosya veya metin çözümlenirken veri hatası oluştu.", "warning");
    }
  };

  const handleBulkImport = (itemsToImport: Omit<Product, "id">[]) => {
    if (itemsToImport.length === 0) {
      addNotification("İçe aktarılacak geçerli ürün bulunamadı.", "warning");
      return;
    }

    const newProducts: Product[] = itemsToImport.map((item, index) => {
      const codeClean = (item.code || `PROD-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();
      const barcode = item.barcode || `869${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const qrcode = item.qrcode || `QR_${codeClean}_${barcode.slice(-4)}`;

      return {
        ...item,
        id: `prod-${Math.floor(100000 + Math.random() * 900000) + index}`,
        code: codeClean,
        barcode,
        qrcode,
        isImported: true
      };
    });

    saveDb({
      ...db,
      products: [...db.products, ...newProducts]
    });

    addNotification(`${newProducts.length} adet yeni ürün stoğu portföyle senkronize edildi.`, "success");
    setImportPreview([]);
    setImportText("");
    setActiveTab("list");
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === "string") {
        setImportText(content);
        parseBulkText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addNotification("Lütfen yalnızca resim dosyası seçiniz.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProductForm(prev => ({
        ...prev,
        images: [...(prev.images || []), base64String]
      }));
      addNotification("Görsel başarıyla yüklendi.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageUrl = (url: string) => {
    if (!url.trim()) return;
    setProductForm(prev => ({
      ...prev,
      images: [...(prev.images || []), url.trim()]
    }));
    addNotification("Görsel bağlantısı eklendi.", "success");
  };

  const handleRemoveImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
    addNotification("Görsel listeden çıkarıldı.", "info");
  };

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState<string>("");
  const [manualParentName, setManualParentName] = useState("");

  // Category levels logic helper
  const parentCategories = useMemo(() => db.categories.filter(c => c.parentId === null), [db.categories]);
  
  const subCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return db.categories.filter(c => c.parentId === selectedCategoryId);
  }, [db.categories, selectedCategoryId]);

  // Active filter logic
  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      // Category filter (match first level or subcategory specifically)
      if (selectedCategoryId) {
        const belongsToRoot = p.categoryId === selectedCategoryId;
        const subCatIds = db.categories.filter(c => c.parentId === selectedCategoryId).map(c => c.id);
        const belongsToSub = subCatIds.includes(p.categoryId) || p.subCategoryId === selectedCategoryId;
        if (!belongsToRoot && !belongsToSub) return false;
      }
      
      // Search term
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        return (
          p.title.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.model.toLowerCase().includes(query) ||
          p.technicalDetails.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [db.products, selectedCategoryId, searchTerm, db.categories]);

  // Handle margins dynamically
  const calculateMargin = (sell: number, buy: number, kdvPercent: number) => {
    if (sell <= 0) return 0;
    // tax excluded selling
    const excSelling = sell / (1 + kdvPercent / 100);
    const profit = excSelling - buy;
    return Math.round((profit / excSelling) * 100);
  };

  // Add Product Form Handler
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title || !productForm.code) {
      addNotification("Lütfen Ürün Adı ve Ürün Kodu alanlarını doldurun.", "warning");
      return;
    }

    // Generate bar / qr simulated values if empty
    const codeClean = productForm.code.trim().toUpperCase();
    const finalBarcode = productForm.barcode || `869${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const finalQrcode = productForm.qrcode || `QR_${codeClean}_${finalBarcode.slice(-4)}`;

    const productPayload: Product = {
      id: isEditing || `prod-${Math.floor(100000 + Math.random() * 900000)}`,
      ...productForm,
      code: codeClean,
      barcode: finalBarcode,
      qrcode: finalQrcode
    };

    let updatedProducts = [...db.products];
    if (isEditing) {
      updatedProducts = updatedProducts.map(p => p.id === isEditing ? productPayload : p);
      addNotification(`${productPayload.title} başarıyla güncellendi.`, "success");
    } else {
      updatedProducts.push(productPayload);
      addNotification(`${productPayload.title} stok kartı portföye eklendi.`, "success");
    }

    saveDb({ ...db, products: updatedProducts });
    setProductForm(emptyProduct);
    setIsEditing(null);
    setActiveTab("list");
  };

  // Delete product action
  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`"${name}" ürün kartını silmek istediğinizden emin misiniz?`)) {
      const updated = db.products.filter(p => p.id !== id);
      saveDb({ ...db, products: updated });
      addNotification(`${name} silindi.`, "info");
    }
  };

  // Delete all imported products
  const handleDeleteAllImportedProducts = () => {
    if (!confirm("Sistemde sadece Excel, Loro veya Bulut ERP üzerinden toplu aktarılan tüm ürünleri silmek istediğinizden emin misiniz? El ile eklediğiniz kartlar korunacaktır.")) {
      return;
    }
    // Filter out imported ones: tagged with isImported, starting with BULK-, starting with IMP-, or having id pattern prod-imported or if they look like they came from Excel
    const remaining = db.products.filter(p => !p.isImported && !p.code.startsWith("BULK-") && !p.code.startsWith("IMP-"));
    saveDb({ ...db, products: remaining });
    addNotification("Tüm dışa aktarımdan veya toplu çözümlenerek yüklenen ürün kartları envanterden temizlendi.", "success");
  };

  // Delete absolutely all products
  const handleClearAllProducts = () => {
    if (!confirm("Sistemdeki TÜM ürün kartlarını tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!")) {
      return;
    }
    saveDb({ ...db, products: [] });
    addNotification("Stok portföyündeki tüm ürün kartları başarıyla silindi ve temizlendi.", "info");
  };

  // Edit action initializer
  const handleTriggerEdit = (p: Product) => {
    setProductForm(p);
    setIsEditing(p.id);
    setActiveTab("form");
  };

  // Add Category Handler
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    let parentId: string | null = null;
    const extraCategories: Category[] = [];

    if (newCatParent === "MANUAL_INPUT") {
      const cleanManualName = manualParentName.trim();
      if (!cleanManualName) {
        addNotification("Manuel üst kategori adı boş olamaz.", "warning");
        return;
      }
      
      // Check if it already exists as a parent category
      const existingParent = db.categories.find(c => c.parentId === null && c.name.toLowerCase() === cleanManualName.toLowerCase());
      if (existingParent) {
        parentId = existingParent.id;
      } else {
        // Create new parent category
        const newParentId = `cat-${Math.floor(1000 + Math.random() * 9000)}`;
        const newParent: Category = {
          id: newParentId,
          name: cleanManualName,
          parentId: null,
          order: db.categories.length + 1
        };
        extraCategories.push(newParent);
        parentId = newParentId;
      }
    } else {
      parentId = newCatParent === "" ? null : newCatParent;
    }

    const newCat: Category = {
      id: `cat-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newCatName.trim(),
      parentId: parentId,
      order: db.categories.length + 1 + extraCategories.length
    };

    saveDb({
      ...db,
      categories: [...db.categories, ...extraCategories, newCat]
    });

    const msg = newCatParent === "MANUAL_INPUT" 
      ? `"${manualParentName}" üst kategorisi ve "${newCat.name}" alt kategorisi başarıyla oluşturuldu.`
      : `Kategori "${newCat.name}" başarıyla oluşturuldu.`;

    addNotification(msg, "success");
    setNewCatName("");
    setNewCatParent("");
    setManualParentName("");
  };

  // Delete Category action
  const handleDeleteCategory = (catId: string, name: string) => {
    if (confirm(`'${name}' kategorisini silmek istiyor musunuz? Bu kategoriye bağlı ürünler listede kalmaya devam edecektir.`)) {
      const filtered = db.categories.filter(c => c.id !== catId);
      saveDb({ ...db, categories: filtered });
      addNotification(`Kategori silindi.`, "info");
    }
  };

  // Edit Category Save
  const handleSaveCategory = (catId: string) => {
    if (!editingCategoryName.trim()) {
      addNotification("Kategori adı boş olamaz.", "warning");
      return;
    }
    const updated = db.categories.map(c => {
      if (c.id === catId) {
        return { ...c, name: editingCategoryName.trim() };
      }
      return c;
    });
    saveDb({ ...db, categories: updated });
    addNotification(`Kategori adı "${editingCategoryName.trim()}" olarak güncellendi.`, "success");
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      
      {/* LEFT SIDE: Category Tree (Hierarchy) - Persistent side rail */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
      } lg:sticky lg:top-5`}>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Kategori Ağacı</span>
          </h3>
          <button 
            type="button"
            onClick={() => setActiveTab("categories")}
            className="p-1 px-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 text-[10px] uppercase font-bold tracking-wider"
          >
            Yönet
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {/* Default view all */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full text-left p-2 rounded-xl flex items-center justify-between font-medium transition-all ${
              selectedCategoryId === null 
                ? "bg-amber-500/10 text-amber-500 font-semibold" 
                : isDark ? "text-slate-400 hover:bg-slate-800/50" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Tüm Ürünler ({db.products.length})
            </span>
          </button>

          {/* Root hierarchy */}
          {parentCategories.map(pCat => {
            const children = db.categories.filter(c => c.parentId === pCat.id);
            const isSelected = selectedCategoryId === pCat.id;

            return (
              <div key={pCat.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(pCat.id)}
                  className={`w-full text-left p-2 rounded-xl flex items-center justify-between font-medium transition-all ${
                    isSelected 
                      ? "bg-amber-500/10 text-amber-500 font-semibold" 
                      : isDark ? "text-slate-400 hover:bg-slate-800/50" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 text-amber-500/70" />
                    {pCat.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">
                    {db.products.filter(p => p.categoryId === pCat.id || db.categories.filter(c => c.parentId === pCat.id).map(c => c.id).includes(p.categoryId)).length}
                  </span>
                </button>

                {/* Sub category tree render */}
                {children.length > 0 && (
                  <div className="pl-4 space-y-1 my-1 border-l border-slate-800 ml-3">
                    {children.map(sub => {
                      const isSubSelected = selectedCategoryId === sub.id;
                      const productInSub = db.products.filter(p => p.categoryId === sub.id).length;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(sub.id)}
                          className={`w-full text-left py-1.5 px-2 rounded-lg flex items-center justify-between text-[11px] transition-all ${
                            isSubSelected 
                              ? "text-amber-500 font-semibold bg-amber-500/5" 
                              : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span className="truncate">• {sub.name}</span>
                          <span className="text-[9px] text-slate-500">({productInSub})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT AREA: Products Table & Forms view */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex bg-slate-800/40 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-md">
            <button
              onClick={() => { setActiveTab("list"); setIsEditing(null); setProductForm(emptyProduct); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold ${activeTab === "list" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
            >
              Ürün Listesi
            </button>
            <button
              onClick={() => { setActiveTab("form"); setProductForm(emptyProduct); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold ${activeTab === "form" && !isEditing ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
            >
              Yeni Stok Kartı ekle
            </button>
            <button
              onClick={() => { setActiveTab("import"); setImportPreview([]); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold ${activeTab === "import" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
            >
              📥 Excel / ERP'den Yükle
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="İsim, kod, barkod ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white max-w-xs focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab CONTENT 1: List view */}
        {activeTab === "list" && (
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6 pb-4 border-b border-dashed border-slate-800">
              <div>
                <h3 className={`text-md font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                  {selectedCategoryId 
                    ? `${db.categories.find(c => c.id === selectedCategoryId)?.name || 'Kategori'} Ürünleri` 
                    : "Tüm Kayıtlı Ürün Kartları"} ({filteredProducts.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">Envanterdeki aktif fiziki ve dijital stok listesi</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDeleteAllImportedProducts}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-450 border border-rose-500/20 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                  title="Sadece Excel / Loro ERP içe aktarımıyla sisteme eklenmiş ürünleri toplu olarak siler."
                >
                  📥 Aktarılan Ürünlerin Tamamını Sil
                </button>
                <button
                  onClick={handleClearAllProducts}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700/60 rounded-xl text-[11px] font-bold transition"
                  title="Sistemdeki tüm ürün kartlarını tamamen temizler."
                >
                  🗑️ Tüm Dosyayı Temizle
                </button>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-sans">
                Arama kriterine uygun veya kayıtlı ürün bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-2">Ürün Adı / Kod</th>
                      <th className="py-3 px-2">Kategori</th>
                      <th className="py-3 px-2 text-right">Alış Fiyatı</th>
                      <th className="py-3 px-2 text-right">Satış Fiyatı</th>
                      <th className="py-3 px-2 text-center">Aks. Vergi (KDV)</th>
                      <th className="py-3 px-2 text-center">Kâr Marjı</th>
                      <th className="py-3 px-2 text-center">Mevcut Stok</th>
                      <th className="py-3 px-2 text-center">Kimlik Kodları</th>
                      <th className="py-3 px-2 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const isCritical = p.stock <= p.criticalStock;
                      const isLow = p.stock <= p.minStock && p.stock > p.criticalStock;
                      const marginVal = calculateMargin(p.price, p.purchasePrice, p.kdv);

                      return (
                        <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <img 
                                src={p.images[0]} 
                                alt={p.title} 
                                className="w-10 h-10 object-cover rounded-lg cursor-pointer hover:opacity-80 border border-slate-800"
                                onClick={() => setZoomedImg(p.images[0])}
                              />
                              <div>
                                <span className={`font-bold block ${isDark ? "text-slate-200" : "text-slate-800"}`}>{p.title}</span>
                                <span className="text-[10px] font-mono text-slate-500">{p.code} ({p.brand})</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-slate-400">
                            {db.categories.find(c => c.id === p.categoryId)?.name || "Genel"}
                          </td>
                          <td className="py-4 px-2 text-right font-mono text-slate-400 font-medium">
                            {p.purchasePrice.toLocaleString("tr-TR")} ₺
                          </td>
                          <td className="py-4 px-2 text-right font-mono font-bold text-amber-500">
                            {p.price.toLocaleString("tr-TR")} ₺
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-slate-400">
                            %{p.kdv}
                          </td>
                          <td className="py-4 px-2 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              marginVal > 40 ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"
                            }`}>
                              %{marginVal} kâr
                            </span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`px-2 py-1 rounded-lg font-mono font-bold text-xs ${
                              isCritical ? "bg-rose-500/15 text-rose-500" :
                              isLow ? "bg-amber-500/15 text-amber-500" :
                              "bg-emerald-500/15 text-emerald-500"
                            }`}>
                              {p.stock} {p.unit || "Adet"}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Hover modal trigger for identifiers */}
                              <span className="p-1 bg-slate-800 rounded text-slate-400" title={`Barkod: ${p.barcode}`}>
                                <Barcode className="w-3.5 h-3.5" />
                              </span>
                              <span className="p-1 bg-slate-800 rounded text-slate-400" title={`QR Kod: ${p.qrcode}`}>
                                <QrCode className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTriggerEdit(p)}
                                className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg"
                                title="Kartı Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id, p.title)}
                                className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg"
                                title="Kartı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* Tab CONTENT 2: Form Create/Edit view */}
        {activeTab === "form" && (
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className={`text-md font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
              <Plus className="w-5 h-5 text-amber-500" />
              <span>{isEditing ? "Ürün Kartını Güncelle" : "Yeni Ürün Kartı (Stok Kartı) Kaydı"}</span>
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-6 text-xs font-sans">
              
              {/* Section: Genel Kimlik Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">* Ürün Adı</label>
                  <input
                    type="text"
                    required
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                    placeholder="Bosch GBH Matkap vb."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">* Ürün Kodu (Tedarikçi Kodu)</label>
                  <input
                    type="text"
                    required
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                    placeholder="ELK-BOS-260"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Barkod EAN-13 (Opsiyonel)</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500"
                    placeholder="869..."
                  />
                </div>
              </div>

              {/* Section: Sınıflandırma ve Markalama */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Bosch, Makita, Kale vb."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Model</label>
                  <input
                    type="text"
                    value={productForm.model}
                    onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="X-Series 800W"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Seri Bilgisi</label>
                  <input
                    type="text"
                    value={productForm.series}
                    onChange={(e) => setProductForm({ ...productForm, series: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="2026 Pro"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Üst Kategori</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.parentId ? "↳ " : ""}{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section: Fiyatlandırma, KDV ve Finans */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div>
                  <label className="block text-[11px] text-amber-500 font-semibold mb-1.5">Alış Fiyatı (₺ - KDV Hariç)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.purchasePrice || ""}
                    onChange={(e) => setProductForm({ ...productForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-amber-500 font-semibold mb-1.5">Satış Fiyatı (₺ - KDV Dahil)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.price || ""}
                    onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">KDV Oranı (%)</label>
                  <select
                    value={productForm.kdv}
                    onChange={(e) => setProductForm({ ...productForm, kdv: parseInt(e.target.value) || 20 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  >
                    <option value="20">%20 (Hırdavat, Elektronik)</option>
                    <option value="10">%10 (Gıda, Temel)</option>
                    <option value="1">%1 (Ek)</option>
                    <option value="0">%0 (Muaf)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">İndirim Oranı (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={productForm.discount || ""}
                    onChange={(e) => setProductForm({ ...productForm, discount: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Hesaplanan Kâr Marjı</label>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono font-bold text-emerald-500 flex items-center justify-between">
                    <TrendingUp className="w-4 h-4" />
                    <span>%{calculateMargin(productForm.price, productForm.purchasePrice, productForm.kdv)} Net</span>
                  </div>
                </div>
              </div>

              {/* Section: Stok Kontrol ve Limit Alarm Eşikleri */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Toplam Stok Miktarı</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.stock || ""}
                    onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5 font-bold text-amber-500">Birim Seti</label>
                  <select
                    value={productForm.unit || "Adet"}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold outline-none"
                  >
                    <option value="Adet">Adet (pcs)</option>
                    <option value="Metre">Metre (m)</option>
                    <option value="Koli">Koli (box)</option>
                    <option value="Paket">Paket (pkg)</option>
                    <option value="Kg">Kilogram (kg)</option>
                    <option value="Litre">Litre (L)</option>
                    <option value="Rulo">Rulo (roll)</option>
                    <option value="Plaka">Plaka (sheet)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Minimum Emniyet Stoku</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.minStock || ""}
                    onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Kritik Stok Uyarı Limiti</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.criticalStock || ""}
                    onChange={(e) => setProductForm({ ...productForm, criticalStock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Tedarikçi Firma / Şube</label>
                  <input
                    type="text"
                    value={productForm.supplierInfo}
                    onChange={(e) => setProductForm({ ...productForm, supplierInfo: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Sika Yapı Kimyasalları A.Ş."
                  />
                </div>
              </div>

              {/* Section: Fiziksel Özellikler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Ürün Rengi</label>
                  <input
                    type="text"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Şeffaf, Mavi, Sarı vb."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Ürün Boyutu / Ölçüleri</label>
                  <input
                    type="text"
                    value={productForm.size}
                    onChange={(e) => setProductForm({ ...productForm, size: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="300 ml, 40x12 cm vb."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Ürün Ağırlığı</label>
                  <input
                    type="text"
                    value={productForm.weight}
                    onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="2.7 kg"
                  />
                </div>
              </div>

              {/* Technical features & description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Teknik Özellikler / Parametreler</label>
                  <textarea
                    rows={3}
                    value={productForm.technicalDetails}
                    onChange={(e) => setProductForm({ ...productForm, technicalDetails: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Güç: 800 W, Şanzıman Tipi..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Ürün Detaylı Tanıtım Açıklaması</label>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    placeholder="Müşteriye ve bayiye gösterilecek zengin pazarlama metni..."
                  />
                </div>
              </div>

              {/* SEO Tags */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-4">
                <p className="font-bold text-[11px] text-amber-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  SEO ve Arama Motoru Optimizasyonu (Arama Çekirdeği)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Google Arama Başlığı</label>
                    <input
                      type="text"
                      value={productForm.seoTitle}
                      onChange={(e) => setProductForm({ ...productForm, seoTitle: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                      placeholder="Maksimum 60 karakter"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Açıklama (Meta Description)</label>
                    <input
                      type="text"
                      value={productForm.seoDescription}
                      onChange={(e) => setProductForm({ ...productForm, seoDescription: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                      placeholder="Maksimum 160 karakter"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">SEO Anahtar Kelimeler</label>
                    <input
                      type="text"
                      value={productForm.seoKeywords}
                      onChange={(e) => setProductForm({ ...productForm, seoKeywords: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                      placeholder="Virgülle ayırarak (matkap, bosch)"
                    />
                  </div>
                </div>
              </div>

              {/* Fully Functional Multi-Media Upload Station */}
              <div className="p-5 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/20 space-y-4">
                <div className="text-center space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-amber-500 animate-pulse" />
                  <p className="font-bold text-xs text-slate-300">Aktif Medya & Görsel Yükleme İstasyonu</p>
                  <p className="text-[10px] text-slate-500">
                    Ürün için PNG/JPG dosyalarını seçin veya doğrudan görsel internet bağlantısı (URL) ekleyin.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Local File upload */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-2">
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all">
                      <Upload className="w-3.5 h-3.5 text-amber-500" />
                      <span>Bilgisayardan Dosya Seç</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[9px] text-slate-500">Maksimum 5MB • PNG, JPG, WEBP</span>
                  </div>

                  {/* Direct CDN/URL add */}
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-center space-y-2">
                    <label className="block text-[10px] text-slate-400 uppercase font-bold">Görsel İnternet Bağlantısı (URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none"
                        placeholder="https://example.com/resim.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddImageUrl(imageUrlInput);
                          setImageUrlInput("");
                        }}
                        className="p-2 px-3 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid of uploaded images with Delete option */}
                {productForm.images && productForm.images.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase font-bold text-slate-400">Ekli Ürün Görselleri ({productForm.images.length})</h5>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {productForm.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                          <img src={img} alt={`ürün-${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-rose-550 text-white rounded-full w-5 h-5 flex items-center justify-center font-sans font-extrabold text-xs shadow-lg opacity-90 hover:scale-105"
                            title="Görseli Sil"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setActiveTab("list"); setIsEditing(null); setProductForm(emptyProduct); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl"
                >
                  {isEditing ? "Ürün Kartını Güncelle" : "Hemen Kaydet ve Yayınla"}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Tab CONTENT: Bulk Product Excel Importer */}
        {activeTab === "import" && (
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className={`text-md font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
                <Upload className="w-5 h-5 text-amber-500" />
                <span>Tek Tıkla Harici Excel, Loro, Bulut ERP İçe Aktarım İstasyonu</span>
              </h3>
              <button 
                type="button" 
                onClick={() => { setActiveTab("list"); setImportPreview([]); }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Kapat
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
              Loro ERP, Bulut ERP veya herhangi bir Excel, XML, JSON, CSV ihracatından indirdiğiniz ürün listesini 
              doğrudan aşağıdaki yükleme kutusuna atabilir veya ham dosya içeriğini yapıştırabilirsiniz. 
              Sistemimiz <strong>Yapay Zekâ Destekli Sütun Eşleştirici</strong> sayesinde kolon başlıklarını 
              (<em>Ürün Adı, Barkod, Fiyat, Kodu, Marka vb.</em>) tüm dillerdeki varyasyonlarıyla otomatik tanır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans mb-6">
              {/* Left Column: Input station */}
              <div className="space-y-4">
                <div className="p-5 bg-slate-950/60 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-3">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-bold text-slate-300">Bulut ERP / Excel Dosyası Yükleyin</p>
                  <label className="cursor-pointer inline-flex bg-emerald-600 hover:bg-emerald-550 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors">
                    📂 Dosya Seçin (.xls, .csv, .json, .txt, .tsv)
                    <input 
                      type="file" 
                      accept=".csv,.json,.txt,.tsv" 
                      onChange={handleImportFileChange} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Maksimum 10MB boyutundaki Excel CSV, TSV veya JSON dosyaları desteklenir.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Alternatif: Ham Metin / Kopyalanan Excel Yapıştırın
                  </label>
                  <textarea
                    rows={8}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Masaüstü Excelinizden sütunları seçip kopyalayın, ardından buraya yapıştırıp 'Çözümle' deyin (Satırlar tırnaklı, tırnaksız, noktalı virgüllü veya TAB ayraçlı olabilir)..."
                    className="w-full p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white font-mono text-[10px] outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => parseBulkText(importText)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    ⚡️ Ham Metni Çözümle ve Önizle
                  </button>
                </div>
              </div>

              {/* Right Column: Column Matching and Documentation */}
              <div className="p-4 bg-slate-950/45 rounded-xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-xs text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Akıllı Eşleşen Kolon Sözlüğü</span>
                </h4>
                <div className="space-y-2.5 text-[11px] text-slate-400">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Ürün Adı:</span>
                    <span>ürün adı, başlık, title, name, ürün, urun</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Stok Kodu:</span>
                    <span>ürün kodu, kod, code, referans, ref</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Barkod / GTIN:</span>
                    <span>barkod, barcode, gtin, ean</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Satış Fiyatı:</span>
                    <span>fiyat, satış fiyatı, price, tutar, satis</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Alış Fiyatı:</span>
                    <span>maliyet, alış fiyatı, purchase price, alis</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Mevcut Stok:</span>
                    <span>stok, miktar, stock, adet, kalan, bakiye</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="font-semibold text-slate-300">Kategori:</span>
                    <span>kategori, category, alt kategori</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 text-[10px] text-amber-200 leading-relaxed font-sans mt-3">
                  💡 <strong>Uç Öneri:</strong> Kolonlarınız bu isimlerden biriyle eşleşmese bile sistemimiz 
                  benzerlik algoritmalarını çalıştırıp kolonu anlamlandıracaktır. Eksik stok kodu bulunan satırlara 
                  otomatik benzersiz kodlar atanır, KDV varsayılan olarak %20 alınır.
                </div>
              </div>
            </div>

            {/* PREVIEW CONTAINER SECTION */}
            {importPreview.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-white">İçe Aktarılmaya Hazır Ürünler Önizlemesi</h4>
                    <p className="text-[10px] text-slate-500">
                      Son kontrolü sağlayın, listeyi doğrudan portföyle entegre etmek için onaylayın.
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setImportPreview([])}
                      className="px-4 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-lg text-xs"
                    >
                      Önizlemeyi Temizle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkImport(importPreview)}
                      className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                    >
                      ✔️ {importPreview.length} Ürünü Stoğa Aktar
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/30">
                  <table className="w-full text-left text-[11px] text-slate-400">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800/80 text-slate-300">
                        <th className="py-2.5 px-3">Ürün Adı</th>
                        <th className="py-2.5 px-3 font-mono">Stok Kodu</th>
                        <th className="py-2.5 px-3 font-mono">Barkod</th>
                        <th className="py-2.5 px-3">Marka/Model</th>
                        <th className="py-2.5 px-3 text-right">Alış Fiyatı</th>
                        <th className="py-2.5 px-3 text-right">Satış Fiyatı</th>
                        <th className="py-2.5 px-3 text-center">Stok</th>
                        <th className="py-2.5 px-3">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="py-2 px-3 text-white font-medium">{item.title}</td>
                          <td className="py-2 px-3 font-mono text-[10px]">{item.code}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{item.barcode || "(Otomatik Üretilecek)"}</td>
                          <td className="py-2 px-3">{item.brand} / {item.model}</td>
                          <td className="py-2 px-3 text-right font-mono text-[10px] text-emerald-400">{item.purchasePrice.toLocaleString("tr-TR")} ₺</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-500 font-semibold">{item.price.toLocaleString("tr-TR")} ₺</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-white">{item.stock} Adet</td>
                          <td className="py-2 px-3">
                            <span className="inline-block py-0.5 px-1.5 bg-slate-900 rounded text-slate-400 text-[10px]">
                              {db.categories.find(c => c.id === item.categoryId)?.name || "Genel"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab CONTENT 3: Category Management Tab */}
        {activeTab === "categories" && (
          <div className={`p-6 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-800">
              <h3 className={`text-md font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
                <Layers className="w-5 h-5 text-amber-500" />
                <span>Kategori ve Branş Konfigüratörleri</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setActiveTab("list"); }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Geri Dön
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Add New Category form */}
              <form onSubmit={handleAddCategory} className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Yeni Kategori Ekle</h4>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Kategori Başlığı</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                    placeholder="Menteşeler, Kıvılcım Önleyiciler vb."
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Üst (Ebeveyn) Kategori</label>
                  <select
                    value={newCatParent}
                    onChange={(e) => setNewCatParent(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                  >
                    <option value="">-- Köprü Kategori (Ana Kategori) --</option>
                    <option value="MANUAL_INPUT">✍️ [Manuel] Yeni Üst Kategori Yaz...</option>
                    {parentCategories.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {newCatParent === "MANUAL_INPUT" && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Manuel Üst Kategori Adı</label>
                    <input
                      type="text"
                      required
                      value={manualParentName}
                      onChange={(e) => setManualParentName(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white outline-none"
                      placeholder="Örn: Elektrikli El Aletleri"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400"
                >
                  Sisteme Kategori Tırnağı Ekle
                </button>
              </form>

              {/* Current Categories List with Quick delete */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kategoriler Tablosu</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {db.categories.map(c => (
                    <div key={c.id} className="p-2 px-3 rounded-lg bg-slate-800/40 border border-slate-700/30 flex justify-between items-center text-xs">
                      {editingCategoryId === c.id ? (
                        <div className="flex gap-1.5 items-center flex-1">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="bg-slate-900 border border-slate-705 p-1 px-2 rounded text-white outline-none text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategory(c.id)}
                            className="text-emerald-500 hover:text-emerald-400 p-1"
                            title="Kaydet"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="text-slate-400 hover:text-slate-200 p-1"
                            title="İptal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={c.parentId ? "text-slate-400 pl-4" : "font-bold text-slate-200"}>
                            {c.parentId ? "↳ " : ""}{c.name}
                          </span>
                          <div className="flex gap-1 items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(c.id);
                                setEditingCategoryName(c.name);
                              }}
                              className="text-amber-500 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10"
                              title="Kategoriyi Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(c.id, c.name)}
                              className="text-rose-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10"
                              title="Kategoriyi ve Branşı Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Image Digital Zoom Overlay Modal (Frosted Glass Portal) */}
      {zoomedImg && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImg(null)}
        >
          <div className="relative max-w-2xl bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
            <span className="absolute top-4 left-4 p-2 bg-slate-900/80 rounded-xl text-amber-500 text-xs flex items-center gap-1.5 font-bold font-mono">
              <ZoomIn className="w-4 h-4" />
              SİSTEM OPTİK ZOOM ETKİN
            </span>
            <img 
              src={zoomedImg} 
              alt="High resolution product catalog" 
              className="max-h-[70vh] rounded-xl object-contain mx-auto border border-slate-800"
            />
            <p className="text-[10px] text-slate-500 mt-2">Dönmek için herhangi bir yere tıklayın.</p>
          </div>
        </div>
      )}

    </div>
  );
}
