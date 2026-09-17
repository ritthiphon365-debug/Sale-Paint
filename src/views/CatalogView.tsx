import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CatalogItem } from '../types';
import { exportCatalogToExcel, parseProductCatalogExcel } from '../services/excelService';

export const CatalogView: React.FC = () => {
  const {
    catalogItems,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    importCatalogItems,
    syncCatalogToGoogle,
    catalogSyncTime,
    googleConnected,
    connectGoogle,
    brandSettings,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'sku' | 'price'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedImportItems, setParsedImportItems] = useState<CatalogItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add/Edit
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formFilmColor, setFormFilmColor] = useState('');
  const [formSize, setFormSize] = useState('5GL');
  const [formBase, setFormBase] = useState('-');
  const [formColorCode, setFormColorCode] = useState('-');
  const [formPrice, setFormPrice] = useState<number>(0);

  // Unique filters from data
  const uniqueNames = useMemo(() => {
    return Array.from(new Set(catalogItems.map((c) => c.name))).sort();
  }, [catalogItems]);

  const uniqueSizes = useMemo(() => {
    return Array.from(new Set(catalogItems.map((c) => c.size))).sort();
  }, [catalogItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return catalogItems
      .filter((item) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          searchQuery === '' ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.sku || '').toLowerCase().includes(q) ||
          (item.colorCode && item.colorCode.toLowerCase().includes(q)) ||
          (item.filmColor && item.filmColor.toLowerCase().includes(q));

        const matchesCategory = selectedCategory === 'ALL' || item.name === selectedCategory;
        const matchesSize = selectedSizeFilter === 'ALL' || item.size === selectedSizeFilter;

        return matchesSearch && matchesCategory && matchesSize;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [catalogItems, searchQuery, selectedCategory, selectedSizeFilter, sortField, sortAsc]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormFilmColor('กึ่งเงา');
    setFormSize('5GL');
    setFormBase('A');
    setFormColorCode('-');
    setFormPrice(3200);
    setIsAddEditOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormSku(item.sku);
    setFormName(item.name);
    setFormFilmColor(item.filmColor || '-');
    setFormSize(item.size);
    setFormBase(item.base || '-');
    setFormColorCode(item.colorCode || '-');
    setFormPrice(item.price);
    setIsAddEditOpen(true);
  };

  // Save Add / Edit
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('กรุณาระบุชื่อสินค้า', 'error');
      return;
    }

    const payload: CatalogItem = {
      id: editingItem ? editingItem.id : `cat-${Date.now()}`,
      sku: formSku.trim() || `SKU-${Date.now()}`,
      name: formName.trim(),
      filmColor: formFilmColor.trim() || '-',
      size: formSize.trim() || '5GL',
      base: formBase.trim() || '-',
      colorCode: formColorCode.trim() || '-',
      price: Number(formPrice) || 0,
      brand: brandSettings.brandName,
      updatedAt: new Date().toISOString(),
    };

    if (editingItem) {
      updateCatalogItem(payload);
    } else {
      addCatalogItem(payload);
    }

    setIsAddEditOpen(false);
  };

  // Handle file select for Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setImportErrors([]);

    try {
      const result = await parseProductCatalogExcel(file);
      setParsedImportItems(result.items);
      setImportErrors(result.errors);
      setIsImportOpen(true);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + (err.message || ''), 'error');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedImportItems.length === 0) {
      showToast('ไม่มีรายการสินค้าที่สามารถนำเข้าได้', 'error');
      return;
    }

    importCatalogItems(parsedImportItems, importMode);
    setIsImportOpen(false);
    setParsedImportItems([]);
  };

  // Trigger Google Sheet sync
  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      const url = await syncCatalogToGoogle();
      if (url) setGoogleSheetUrl(url);
    } finally {
      setIsSyncing(false);
    }
  };

  // Smart preview stats for import
  const importSummary = useMemo(() => {
    if (!parsedImportItems.length) return { newCount: 0, existingCount: 0 };
    const existingSkus = new Set(catalogItems.map((c) => (c.sku || '').toLowerCase().trim()));
    const existingSigs = new Set(
      catalogItems.map((c) =>
        `${c.name.toLowerCase().trim()}_${(c.size || '').toLowerCase().trim()}_${(c.base || '').toLowerCase().trim()}_${(c.colorCode || '').toLowerCase().trim()}`
      )
    );

    let newCount = 0;
    let existingCount = 0;

    parsedImportItems.forEach((item) => {
      const hasSku = item.sku && existingSkus.has(item.sku.toLowerCase().trim());
      const sig = `${item.name.toLowerCase().trim()}_${(item.size || '').toLowerCase().trim()}_${(item.base || '').toLowerCase().trim()}_${(item.colorCode || '').toLowerCase().trim()}`;
      const hasSig = existingSigs.has(sig);

      if (hasSku || hasSig) {
        existingCount++;
      } else {
        newCount++;
      }
    });

    return { newCount, existingCount };
  }, [parsedImportItems, catalogItems]);

  return (
    <div id="catalog-view" className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                <Layers className="w-3.5 h-3.5" />
                Product Catalog Management
              </span>
              {catalogSyncTime && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ซิงค์ล่าสุด {catalogSyncTime}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ฐานข้อมูลสินค้า (PC Product Catalog)
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              จัดการรายการสินค้าเฉพาะประจำตัว PC รองรับการนำเข้าไฟล์ XLS ตรวจจับสินค้าใหม่อัตโนมัติ
              และซิงค์เชื่อมโยงกับ Google Sheets
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xls,.xlsx"
              className="hidden"
            />

            <button
              id="btn-import-excel"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isParsing ? 'กำลังอ่านไฟล์...' : 'นำเข้า Excel (.xls)'}
            </button>

            <button
              id="btn-export-excel"
              onClick={() => exportCatalogToExcel(catalogItems, `${brandSettings.brandName}_Catalog.xlsx`)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              ส่งออก Excel
            </button>

            <button
              id="btn-sync-sheets"
              onClick={handleSyncGoogle}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm border border-indigo-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Google Sheets'}
            </button>

            <button
              id="btn-add-product"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm transition-all shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              + เพิ่มสินค้าใหม่
            </button>
          </div>
        </div>

        {/* Sync alert / status banner */}
        {googleSheetUrl && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
            <span className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-indigo-600" />
              ฐานข้อมูลสินค้าเชื่อมต่อไปยัง Google Sheet ในบัญชีของคุณเรียบร้อย
            </span>
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold underline flex items-center gap-1 hover:text-indigo-700"
            >
              เปิดดู Spreadsheet <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3 rounded-xl">
            <span className="text-xs text-slate-500">จำนวนรายการในฐานข้อมูล</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{catalogItems.length} รายการ</p>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl">
            <span className="text-xs text-slate-500">กลุ่มซีรีส์สินค้า</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{uniqueNames.length} รุ่น</p>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl">
            <span className="text-xs text-slate-500">โครงสร้างขนาดบรรจุ</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{uniqueSizes.length} ขนาด</p>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl">
            <span className="text-xs text-slate-500">สถานะการจัดเก็บข้อมูล</span>
            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" /> ปลอดภัย (Local + Cloud)
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา SKU, ชื่อสินค้า, ฟิล์มสี, เบอร์สี..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Product Series Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">ทุกรุ่นสินค้า ({catalogItems.length})</option>
            {uniqueNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          {/* Size Filter */}
          <select
            value={selectedSizeFilter}
            onChange={(e) => setSelectedSizeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">ทุกขนาด</option>
            {uniqueSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort Switcher */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortAsc ? 'เรียง ก-ฮ' : 'เรียง ฮ-ก'}
          </button>
        </div>
      </div>

      {/* Catalog Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบรายการสินค้าที่ค้นหา</h3>
            <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มสินค้าใหม่" ด้านบน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">ชื่อสินค้า (Product)</th>
                  <th className="py-3.5 px-3">ฟิล์มสี</th>
                  <th className="py-3.5 px-3 text-center">ขนาด</th>
                  <th className="py-3.5 px-3 text-center">เบส</th>
                  <th className="py-3.5 px-4">เบอร์สี (Color Code)</th>
                  <th className="py-3.5 px-4 text-right">ราคาต่อหน่วย</th>
                  <th className="py-3.5 px-4 text-center">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.name}
                      {item.category && (
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {item.category}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">
                      {item.filmColor && item.filmColor !== '-' ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {item.filmColor}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        {item.size}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {item.base && item.base !== '-' ? (
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          เบส {item.base}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {item.colorCode && item.colorCode !== '-' ? item.colorCode : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      ฿{item.price.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`ต้องการลบรายการ ${item.name} (${item.sku}) หรือไม่?`)) {
                              deleteCatalogItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Import Excel with Smart Detect / Replace All */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  นำเข้าไฟล์ Excel ฐานข้อมูลสินค้า
                </h3>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">ชื่อไฟล์ที่เลือก:</p>
                <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{fileName}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  อ่านข้อมูลสำเร็จ {parsedImportItems.length} รายการ
                </p>
              </div>

              {/* Import Mode Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  เลือกรูปแบบการนำเข้า:
                </label>

                <div
                  onClick={() => setImportMode('append')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    importMode === 'append'
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        1. เพิ่มเฉพาะสินค้าใหม่ (ระบบตรวจจับอัตโนมัติ)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        ระบบจะตรวจจับ SKU และรายการสินค้าเดิม ไม่ลบรายการที่มีอยู่แล้ว
                        และเพิ่มเฉพาะสินค้าที่ยังไม่มีในฐานข้อมูล
                      </p>
                      <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-md inline-block">
                        ตรวจพบ: เพิ่มใหม่ {importSummary.newCount} รายการ | มีอยู่แล้ว {importSummary.existingCount} รายการ
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-1 text-emerald-600"
                    />
                  </div>
                </div>

                <div
                  onClick={() => setImportMode('replace')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-rose-500 bg-rose-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        2. แทนที่รายการเดิมทั้งหมด (Replace All)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        ลบรายการเดิมทั้งหมด และแทนที่ด้วย {parsedImportItems.length} รายการจากไฟล์ Excel นี้
                      </p>
                    </div>
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 text-rose-600"
                    />
                  </div>
                </div>
              </div>

              {/* Notice about Google Sheet sync */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  เมื่อกดยืนยัน ข้อมูลจะถูกบันทึกลงในระบบและซิงค์เชื่อมต่อไปยัง Google Sheet ในบัญชีของ PC ทันที
                  เพื่อให้รายการที่เพิ่มใหม่ผ่านแอปอยู่ในไฟล์ต้นฉบับเดียวกัน
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                ยืนยันการนำเข้าข้อมูล ({parsedImportItems.length} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Catalog Item */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'แก้ไขรายการสินค้า' : 'เพิ่มสินค้าใหม่ในแคตตาล็อก'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">รหัส SKU *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="เช่น WB-5GL-A"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">ชื่อสินค้า *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="เช่น WEATHERBOND"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">ขนาด (Size)</label>
                  <input
                    type="text"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="เช่น 5GL, 2.5GL, 1GL"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">เบส (Base)</label>
                  <input
                    type="text"
                    value={formBase}
                    onChange={(e) => setFormBase(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="A, B, C, D หรือ -"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">ฟิล์มสี (Film)</label>
                  <input
                    type="text"
                    value={formFilmColor}
                    onChange={(e) => setFormFilmColor(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="กึ่งเงา, ด้าน, เนียน หรือ -"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">เบอร์สี (Color Code)</label>
                  <input
                    type="text"
                    value={formColorCode}
                    onChange={(e) => setFormColorCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="OW-1002 หรือ -"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">ราคาต่อหน่วย (THB) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formPrice || ''}
                  onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="3450"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                💡 เมื่อเพิ่มหรือแก้ไขสินค้า ข้อมูลจะถูกเชื่อมเข้าหน้าบันทึกยอดขาย
                และบันทึกลง Google Sheet ประจำตัว PC โดยอัตโนมัติ
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
