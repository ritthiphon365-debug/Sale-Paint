import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  User,
  Phone,
  Check,
  Tag,
  Sparkles,
  Layers,
  Palette,
  FileCheck,
  AlertCircle,
  X,
  Info,
  ChevronRight,
  Zap,
  Clock,
  RotateCcw,
  Receipt,
  History,
  ArrowRight,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SizeOption, BaseOption, CartItem, ProductConfig, SaleItem } from '../types';

export const SalesEntryView: React.FC = () => {
  const {
    catalogItems,
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    saveBill,
    setActiveTab,
    showToast,
    sales,
    deleteSale,
  } = useApp();

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Group catalog items by Product Name
  const productGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        name: string;
        category: string;
        sizes: string[];
        bases: string[];
        filmColors: string[];
        colorCodes: string[];
        minPrice: number;
        maxPrice: number;
        items: typeof catalogItems;
      }
    > = {};

    catalogItems.forEach((item) => {
      const key = item.name.trim();
      if (!groups[key]) {
        groups[key] = {
          name: key,
          category: item.category || 'สีและเคมีภัณฑ์ก่อสร้าง',
          sizes: [],
          bases: [],
          filmColors: [],
          colorCodes: [],
          minPrice: item.price,
          maxPrice: item.price,
          items: [],
        };
      }
      groups[key].items.push(item);
      if (item.size && !groups[key].sizes.includes(item.size)) groups[key].sizes.push(item.size);
      if (item.base && item.base !== '-' && !groups[key].bases.includes(item.base)) groups[key].bases.push(item.base);
      if (item.filmColor && item.filmColor !== '-' && !groups[key].filmColors.includes(item.filmColor)) {
        groups[key].filmColors.push(item.filmColor);
      }
      if (item.colorCode && item.colorCode !== '-' && !groups[key].colorCodes.includes(item.colorCode)) {
        groups[key].colorCodes.push(item.colorCode);
      }
      groups[key].minPrice = Math.min(groups[key].minPrice, item.price);
      groups[key].maxPrice = Math.max(groups[key].maxPrice, item.price);
    });

    return Object.values(groups);
  }, [catalogItems]);

  // Active selected product group
  const [selectedGroupName, setSelectedGroupName] = useState<string>(() => {
    return productGroups[0]?.name || 'WEATHERBOND';
  });

  const activeGroup = useMemo(() => {
    return productGroups.find((g) => g.name === selectedGroupName) || productGroups[0];
  }, [productGroups, selectedGroupName]);

  // Dynamic selection attributes
  const [selectedSize, setSelectedSize] = useState<string>('5GL');
  const [selectedBase, setSelectedBase] = useState<string>('A');
  const [selectedFilmColor, setSelectedFilmColor] = useState<string>('');
  const [selectedColorCode, setSelectedColorCode] = useState<string>('');
  const [customColorCode, setCustomColorCode] = useState<string>('');
  const [tintPrice, setTintPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  // Customer state
  const [customerName, setCustomerName] = useState<string>('ลูกค้าทั่วไป (Walk-in)');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [lastSavedBillInfo, setLastSavedBillInfo] = useState<{
    billId: string;
    customer: string;
    amount: number;
    itemCount: number;
    time: string;
  } | null>(null);

  // Auto initialize attributes when active group changes
  useEffect(() => {
    if (!activeGroup) return;
    setSelectedSize(activeGroup.sizes[0] || '5GL');
    setSelectedBase(activeGroup.bases.length > 0 ? activeGroup.bases[0] : '-');
    setSelectedFilmColor(activeGroup.filmColors.length > 0 ? activeGroup.filmColors[0] : '-');
    setSelectedColorCode(activeGroup.colorCodes.length > 0 ? activeGroup.colorCodes[0] : '-');
    setCustomColorCode('');
    setTintPrice(0);
    setQuantity(1);
  }, [selectedGroupName]);

  // Compute matching catalog item for price and SKU
  const matchedCatalogItem = useMemo(() => {
    if (!activeGroup) return null;

    // Best match search
    const found = activeGroup.items.find((item) => {
      const matchSize = !item.size || item.size === selectedSize;
      const matchBase =
        activeGroup.bases.length === 0 || !item.base || item.base === '-' || item.base === selectedBase;
      const matchFilm =
        activeGroup.filmColors.length === 0 || !item.filmColor || item.filmColor === '-' || item.filmColor === selectedFilmColor;
      const matchColor =
        activeGroup.colorCodes.length === 0 || !item.colorCode || item.colorCode === '-' || item.colorCode === selectedColorCode;
      return matchSize && matchBase && matchFilm && matchColor;
    });

    if (found) return found;

    // Fallback: match by size
    return activeGroup.items.find((item) => item.size === selectedSize) || activeGroup.items[0];
  }, [activeGroup, selectedSize, selectedBase, selectedFilmColor, selectedColorCode]);

  const unitBasePrice = matchedCatalogItem?.price || 0;
  const unitFinalPrice = unitBasePrice + tintPrice;
  const lineTotal = unitFinalPrice * quantity;

  // Search filtered product groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return productGroups;
    const q = searchQuery.toLowerCase();
    return productGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.items.some((i) => i.sku.toLowerCase().includes(q))
    );
  }, [productGroups, searchQuery]);

  // Add current configuration to cart
  const handleAddToCart = () => {
    if (!activeGroup) return;

    const sku = matchedCatalogItem?.sku || `SKU-${Date.now().toString().slice(-4)}`;
    const effectiveColor =
      customColorCode.trim() !== ''
        ? customColorCode.trim()
        : selectedColorCode && selectedColorCode !== '-'
        ? selectedColorCode
        : undefined;

    // Create synthetic ProductConfig compatible with cart
    const prodConfig: ProductConfig = {
      id: matchedCatalogItem?.id || `prod-${sku}`,
      sku,
      name: activeGroup.name,
      brand: 'NIPPON PAINT',
      category: activeGroup.category,
      availableSizes: activeGroup.sizes,
      hasBases: activeGroup.bases.length > 0,
      availableBases: activeGroup.bases,
      hasFilmColor: activeGroup.filmColors.length > 0,
      filmColors: activeGroup.filmColors,
      hasColorCode: true,
      basePrices: { [selectedSize]: unitBasePrice },
      initialStock: { '5GL': 10, '2.5GL': 10, '1GL': 10, '1/4GL': 10 },
      isQuickPick: true,
    };

    const newItem: CartItem = {
      tempId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product: prodConfig,
      size: selectedSize,
      base: activeGroup.bases.length > 0 && selectedBase !== '-' ? (selectedBase as BaseOption) : undefined,
      filmColor: activeGroup.filmColors.length > 0 && selectedFilmColor !== '-' ? selectedFilmColor : undefined,
      colorCode: effectiveColor,
      price: unitBasePrice,
      tintPrice,
      quantity,
      total: lineTotal,
    };

    addToCart(newItem);
    setQuantity(1);
    setTintPrice(0);
    setCustomColorCode('');
  };

  // Cart statistics
  const cartTotalAmount = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const cartTotalQty = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleSaveBill = () => {
    if (cart.length === 0) return;
    const finalCust = customerName.trim() || 'ลูกค้าทั่วไป (Walk-in)';
    const totalAmt = cartTotalAmount;
    const totalCount = cartTotalQty;
    const billId = saveBill(finalCust, customerPhone.trim() || undefined);
    setIsMobileCartOpen(false);

    if (billId) {
      setLastSavedBillInfo({
        billId,
        customer: finalCust,
        amount: totalAmt,
        itemCount: totalCount,
        time: new Date().toLocaleTimeString('th-TH'),
      });
    }
  };

  // Recent Sales & Today's Summary
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaySales = useMemo(() => {
    return sales.filter((s) => s.date === todayStr);
  }, [sales, todayStr]);

  const todayTotalAmount = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.total, 0);
  }, [todaySales]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [sales]);

  const handleReorder = (sale: SaleItem) => {
    const prodConfig: ProductConfig = {
      id: sale.productId || `prod-${sale.sku}`,
      sku: sale.sku,
      name: sale.productName,
      brand: sale.brand || 'NIPPON PAINT',
      category: 'สีและเคมีภัณฑ์ก่อสร้าง',
      availableSizes: [sale.size],
      hasBases: Boolean(sale.base),
      availableBases: sale.base ? [sale.base] : [],
      hasFilmColor: Boolean(sale.filmColor),
      filmColors: sale.filmColor ? [sale.filmColor] : [],
      hasColorCode: Boolean(sale.colorCode),
      basePrices: { [sale.size]: sale.price },
      initialStock: { '5GL': 10, '2.5GL': 10, '1GL': 10, '1/4GL': 10 },
      isQuickPick: true,
    };

    const newItem: CartItem = {
      tempId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product: prodConfig,
      size: sale.size,
      base: sale.base,
      filmColor: sale.filmColor,
      colorCode: sale.colorCode,
      price: sale.price,
      tintPrice: sale.tintPrice || 0,
      quantity: sale.quantity || 1,
      total: sale.total,
    };

    addToCart(newItem);
    showToast(`เพิ่ม "${sale.productName}" (${sale.size}) ลงตะกร้าแล้ว`, 'success');
  };

  const handleDeleteRecentSale = (sale: SaleItem) => {
    if (window.confirm(`ยืนยันการลบรายการขาย "${sale.productName}" (บิล ${sale.billId}) ออกจากระบบหรือไม่?`)) {
      deleteSale(sale.id);
    }
  };

  return (
    <div id="sales-entry-view" className="space-y-4 pb-28">
      {/* Last Saved Bill Alert & Tab Guidance Notice */}
      {lastSavedBillInfo && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md border border-emerald-500/30 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  ลงยอดขายสำเร็จแล้ว
                </span>
                <span className="text-xs text-emerald-100">{lastSavedBillInfo.time}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                บิล {lastSavedBillInfo.billId} • ฿{lastSavedBillInfo.amount.toLocaleString()} ({lastSavedBillInfo.customer})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setLastSavedBillInfo(null)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition-colors ml-1"
                title="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Quick Customer Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
              <Zap className="w-3.5 h-3.5" />
              Easy Sales Entry POS
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              บันทึกยอดขายสินค้า
            </h1>
            <p className="text-xs text-slate-500">
              เลือกสินค้ารายการเดียว ปรับขนาด/เบส/สีได้ใน 1 หน้าจอ พร้อมคำนวณราคาและคอมมิชชันทันที
            </p>
          </div>

          {/* Customer Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <User className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ชื่อลูกค้า/ช่าง..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-2.5 py-1 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="เบอร์โทร (ถ้ามี)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-2.5 py-1 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 w-28"
            />
          </div>
        </div>

        {/* Quick Customer Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600 scrollbar-none">
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">ลูกค้าด่วน:</span>
          {['ลูกค้าทั่วไป (Walk-in)', 'ช่างสมชาย รับเหมาพรีเมียม', 'คุณวิภาวรรณ สถาปนิก', 'โครงการ พลีโน่'].map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCustomerName(c)}
                className={`px-2.5 py-1 rounded-full text-xs shrink-0 transition-colors ${
                  customerName === c
                    ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {c}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid: Selection Area (Left 7 cols) & Cart Summary (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Product Selection & Configurator */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step 1: Product Line Selector */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. เลือกรุ่นสินค้า (Product Series)
              </label>
              <button
                onClick={() => setActiveTab('catalog')}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
              >
                จัดการฐานข้อมูลสินค้า <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารุ่นสินค้า เช่น Weatherbond, Hybrid Shield, Vinilex..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Product Cards Carousel / Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredGroups.map((g) => {
                const isSelected = selectedGroupName === g.name;
                return (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => setSelectedGroupName(g.name)}
                    className={`p-3 text-left rounded-xl border-2 transition-all relative ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-2 ring-rose-500/20'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{g.name}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{g.category}</div>
                    <div className="mt-2 text-[11px] font-bold text-rose-600 font-mono">
                      ฿{g.minPrice.toLocaleString()} - ฿{g.maxPrice.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Dynamic Attribute Options (Adapts to Active Product) */}
          {activeGroup && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{activeGroup.name}</h3>
                  <p className="text-xs text-slate-500">
                    SKU ที่ตรงเงื่อนไข: <span className="font-mono font-bold text-slate-800">{matchedCatalogItem?.sku || '-'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">ราคาต่อหน่วย</span>
                  <div className="text-xl font-bold text-rose-600 font-mono">
                    ฿{unitFinalPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Size Selector */}
              {activeGroup.sizes.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">ขนาดบรรจุ (Size)</label>
                  <div className="flex flex-wrap gap-2">
                    {activeGroup.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedSize === s
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Base Selector (Only if product has bases, e.g. Weatherbond. Hides for Hybrid Shield สีทาฝ้า) */}
              {activeGroup.bases.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    เบสแม่สี (Base) <span className="text-[11px] text-slate-400 font-normal">(สินค้าซีรีส์ผสมสี)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeGroup.bases.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBase(b)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedBase === b
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        เบส {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Film Color Selector (Only if product has film options) */}
              {activeGroup.filmColors.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">ชนิดฟิล์มสี (Finish)</label>
                  <div className="flex flex-wrap gap-2">
                    {activeGroup.filmColors.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedFilmColor(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          selectedFilmColor === f
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Code Selector (Preset buttons from catalog or custom input) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">เบอร์สี / รหัสเฉดสี</label>
                {activeGroup.colorCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {activeGroup.colorCodes.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedColorCode(c);
                          setCustomColorCode('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          selectedColorCode === c && customColorCode === ''
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="หรือพิมพ์ระบุเบอร์สีเอง เช่น OW-1002, 100 ขาวเนียน..."
                  value={customColorCode}
                  onChange={(e) => setCustomColorCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Tinting Cost Options */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">ค่าผสมสี/แม่สีต่อถัง</label>
                  <span className="text-xs font-mono font-semibold text-rose-600">+฿{tintPrice}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 30, 50, 80, 100, 150].map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setTintPrice(tp)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        tintPrice === tp
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tp === 0 ? 'ฟรี ฿0' : `+฿${tp}`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    placeholder="ระบุเอง..."
                    value={tintPrice || ''}
                    onChange={(e) => setTintPrice(Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-center font-mono"
                  />
                </div>
              </div>

              {/* Quantity Selector & Large Add To Cart Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-700">จำนวน:</span>
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs font-bold text-slate-700 flex items-center justify-center active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center text-sm font-bold bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs font-bold text-slate-700 flex items-center justify-center active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[2, 5, 10].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className="px-2 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                      >
                        {q} ถัง
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="btn-add-to-cart"
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มลงบิล • ฿{lineTotal.toLocaleString()}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Desktop Cart Summary */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm sticky top-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-600" />
                <h2 className="font-bold text-base text-slate-900">
                  รายการในบิล ({cart.length})
                </h2>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-rose-600 hover:underline">
                  ล้างบิล
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                <p className="text-sm font-medium">ยังไม่มีสินค้าในบิล</p>
                <p className="text-xs text-slate-400">เลือกสินค้าแล้วกดปุ่ม "เพิ่มลงบิล"</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.tempId} className="py-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-1 items-center">
                        <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                          {item.size}
                        </span>
                        {item.base && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[11px]">เบส {item.base}</span>}
                        {item.filmColor && <span>• {item.filmColor}</span>}
                        {item.colorCode && (
                          <span className="text-slate-700 font-mono text-[11px]">[{item.colorCode}]</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @฿{item.price.toLocaleString()}
                        {item.tintPrice > 0 && ` + แม่สี ฿${item.tintPrice}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <button
                          onClick={() => updateCartQuantity(item.tempId, item.quantity - 1)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.tempId, item.quantity + 1)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          ฿{item.total.toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.tempId)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>จำนวนสินค้า</span>
                    <span className="font-semibold text-slate-800">{cartTotalQty} ถัง/หน่วย</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>ลูกค้า</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {customerName || 'ลูกค้าทั่วไป'}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span>ยอดสุทธิทั้งสิ้น</span>
                    <span className="text-rose-600 text-xl font-mono">
                      ฿{cartTotalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  id="btn-checkout-desktop"
                  onClick={handleSaveBill}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-sm shadow-md shadow-rose-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <FileCheck className="w-4 h-4" />
                  บันทึกการขาย (Save Bill)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div id="recent-sales-section" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  รายการขายล่าสุด (Recent Sales)
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {recentSales.length} รายการล่าสุด
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ตรวจสอบรายการที่เพิ่งบันทึก สั่งซื้อซ้ำลงตะกร้า หรือจัดการบิลได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="text-slate-500">ยอดขายวันนี้:</span>
              <span className="font-bold font-mono text-emerald-600">
                ฿{todayTotalAmount.toLocaleString()}
              </span>
              <span className="text-slate-400">({todaySales.length} รายการ)</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <span>ดูประวัติทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Empty State */}
        {recentSales.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <Receipt className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <span className="text-xs font-semibold text-slate-600">ยังไม่มีรายการขายล่าสุด</span>
            <span className="text-[11px] text-slate-400 max-w-xs">
              เมื่อคุณกด "บันทึกการขาย" รายการขายล่าสุดจะปรากฏที่นี่ เพื่อให้คุณตรวจสอบหรือสั่งซื้อซ้ำได้สะดวก
            </span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 uppercase font-semibold">
                    <th className="py-2.5 px-3 whitespace-nowrap">วันที่ / บิล</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ลูกค้า</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">สินค้า / สเปก</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">ขนาด & เบส</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">จำนวน</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ยอดรวม (THB)</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 font-mono flex items-center gap-1.5">
                          {sale.date === todayStr ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px]">
                              วันนี้
                            </span>
                          ) : (
                            <span>{sale.date}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-slate-300" />
                          <span>{sale.billId}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {sale.customerName || 'ลูกค้าทั่วไป'}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[11px] text-slate-400">{sale.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{sale.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {sale.sku}
                          {sale.filmColor && ` • ${sale.filmColor}`}
                          {sale.colorCode && ` [${sale.colorCode}]`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-mono">
                          {sale.size}
                        </span>
                        {sale.base && (
                          <span className="ml-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
                            เบส {sale.base}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-slate-800 font-mono">
                        {sale.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 text-sm">
                        ฿{sale.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReorder(sale)}
                            title="สั่งซื้อซ้ำ (เพิ่มลงในตะกร้า)"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>สั่งซ้ำ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecentSale(sale)}
                            title="ลบรายการขายนี้"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-2.5">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{sale.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {sale.billId} • {sale.date === todayStr ? 'วันนี้' : sale.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600 text-sm">
                        ฿{sale.total.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sale.quantity} หน่วย
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                        {sale.size}
                      </span>
                      {sale.base && (
                        <span className="text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded font-mono">
                          เบส {sale.base}
                        </span>
                      )}
                      <span className="text-slate-500 truncate max-w-[120px]">
                        {sale.customerName || 'ลูกค้าทั่วไป'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReorder(sale)}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold flex items-center gap-1 active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>สั่งซ้ำ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecentSale(sale)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating Sticky Bottom Cart Bar for Mobile */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="relative p-2 rounded-xl bg-rose-50 text-rose-600">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartTotalQty}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">ยอดรวมบิล</span>
                <span className="text-base font-bold text-rose-600 font-mono">
                  ฿{cartTotalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveBill}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/25 flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              บันทึกบิลด่วน ⚡
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Sheet Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs lg:hidden">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col p-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">
                  รายการในบิล ({cart.length})
                </h3>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 my-3">
              {cart.map((item) => (
                <div key={item.tempId} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.size} {item.base && `• เบส ${item.base}`} {item.colorCode && `• ${item.colorCode}`}
                    </p>
                    <p className="text-xs font-mono text-rose-600 font-semibold">
                      ฿{item.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <button
                        onClick={() => updateCartQuantity(item.tempId, item.quantity - 1)}
                        className="px-2 py-1 bg-slate-50"
                      >
                        -
                      </button>
                      <span className="px-2 font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.tempId, item.quantity + 1)}
                        className="px-2 py-1 bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.tempId)}
                      className="p-1 text-slate-300 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-base font-bold text-slate-900">
                <span>ยอดสุทธิ</span>
                <span className="text-xl text-rose-600 font-mono">฿{cartTotalAmount.toLocaleString()}</span>
              </div>
              <button
                onClick={handleSaveBill}
                className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-sm shadow-md"
              >
                ยืนยันบันทึกการขาย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
