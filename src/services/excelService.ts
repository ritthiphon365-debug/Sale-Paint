import { SaleItem, ProductConfig, StockInRecord, CatalogItem } from '../types';
import * as XLSX from 'xlsx';

export interface ImportPreviewResult<T> {
  validRows: T[];
  errors: { row: number; reason: string }[];
  duplicates: number;
}

// Export Product Catalog to standard Excel (matching PC's required columns)
export function exportCatalogToExcel(catalog: CatalogItem[], fileName = 'Nippon_Product_Catalog.xlsx'): void {
  const rows = catalog.map((item) => ({
    'SKU': item.sku,
    'ชื่อสินค้า': item.name,
    'ฟิล์มสี': item.filmColor || '-',
    'ขนาด': item.size,
    'เบส': item.base || '-',
    'เบอร์สี': item.colorCode || '-',
    'ราคา': item.price,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Catalog');
  XLSX.writeFile(workbook, fileName);
}

// Parse Product Catalog Excel with fuzzy column detection for Thai & English headers
export async function parseProductCatalogExcel(file: File): Promise<{
  items: CatalogItem[];
  errors: string[];
  rawCount: number;
}> {
  const rawRows = await parseExcelFile(file);
  const items: CatalogItem[] = [];
  const errors: string[] = [];

  rawRows.forEach((row: any, index: number) => {
    // Helper to find value from multiple possible header keys
    const findKey = (possibleNames: string[]): any => {
      for (const name of possibleNames) {
        if (row[name] !== undefined) return row[name];
        // Case-insensitive / trimmed match
        for (const k of Object.keys(row)) {
          if (k.trim().toLowerCase() === name.trim().toLowerCase()) {
            return row[k];
          }
        }
      }
      return undefined;
    };

    const skuVal = findKey(['SKU', 'sku', 'รหัส SKU', 'รหัสสินค้า', 'Barcode', 'Item Code']);
    const nameVal = findKey(['ชื่อสินค้า', 'Product Name', 'ชื่อ', 'รายการ', 'Item Name', 'Name']);
    const filmVal = findKey(['ฟิล์มสี', 'Film Color', 'ฟิล์ม', 'ชนิดฟิล์ม', 'Sheen', 'Finish']);
    const sizeVal = findKey(['ขนาด', 'Size', 'บรรจุ', 'ขนาดบรรจุ']);
    const baseVal = findKey(['เบส', 'Base', 'BASE']);
    const colorVal = findKey(['เบอร์สี', 'Color Code', 'รหัสสี', 'เฉดสี', 'Color']);
    const priceVal = findKey(['ราคา', 'Price', 'ราคาขาย', 'Unit Price', 'ราคา/หน่วย']);

    if (!nameVal && !skuVal) {
      errors.push(`แถวที่ ${index + 2}: ไม่พบชื่อสินค้าหรือ SKU`);
      return;
    }

    const cleanStr = (v: any) => (v !== undefined && v !== null ? String(v).trim() : '');
    const cleanPrice = (v: any) => {
      if (typeof v === 'number') return v;
      if (!v) return 0;
      const num = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? 0 : num;
    };

    const name = cleanStr(nameVal) || 'สินค้าไม่ระบุชื่อ';
    const sku = cleanStr(skuVal) || `SKU-${Date.now()}-${index}`;
    const size = cleanStr(sizeVal) || '5GL';
    const base = cleanStr(baseVal) || '-';
    const filmColor = cleanStr(filmVal) || '-';
    const colorCode = cleanStr(colorVal) || '-';
    const price = cleanPrice(priceVal);

    items.push({
      id: `cat-${sku.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${Date.now().toString(36)}-${index}`,
      sku,
      name,
      filmColor,
      size,
      base,
      colorCode,
      price,
      brand: 'NIPPON PAINT',
      updatedAt: new Date().toISOString(),
    });
  });

  return { items, errors, rawCount: rawRows.length };
}

// Helper to parse Excel dates (serial numbers, DD/MM/YYYY, YYYY-MM-DD, and Buddhist Era years)
export function parseExcelDate(val: any): string | null {
  if (val === undefined || val === null || String(val).trim() === '') return null;

  const toIso = (year: number, month: number, day: number): string | null => {
    if (year > 2400) year -= 543;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  if (val instanceof Date && !isNaN(val.getTime())) {
    return toIso(val.getFullYear(), val.getMonth() + 1, val.getDate());
  }

  if (typeof val === 'number' && isFinite(val)) {
    // Excel's 1900 date system. XLSX is configured with cellDates=true below,
    // but keep this fallback for numeric serials in exported/converted files.
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(epoch.getTime() + Math.round(val * 86400000));
    if (!isNaN(dateObj.getTime())) {
      return toIso(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, dateObj.getUTCDate());
    }
  }

  const str = String(val).trim();

  // Excel serial stored as a string.
  if (/^\d{5}(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num >= 1 && num <= 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(epoch.getTime() + Math.round(num * 86400000));
      return toIso(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, dateObj.getUTCDate());
    }
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (also accepts a time suffix).
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmyMatch) {
    return toIso(Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1]));
  }

  // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD.
  const ymdMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (ymdMatch) {
    return toIso(Number(ymdMatch[1]), Number(ymdMatch[2]), Number(ymdMatch[3]));
  }

  // Thai date text such as 15 ส.ค. 2569 / 15 สิงหาคม 2569.
  const thaiMonths: Record<string, number> = {
    'ม.ค.': 1, 'มกราคม': 1, 'ก.พ.': 2, 'กุมภาพันธ์': 2,
    'มี.ค.': 3, 'มีนาคม': 3, 'เม.ย.': 4, 'เมษายน': 4,
    'พ.ค.': 5, 'พฤษภาคม': 5, 'มิ.ย.': 6, 'มิถุนายน': 6,
    'ก.ค.': 7, 'กรกฎาคม': 7, 'ส.ค.': 8, 'สิงหาคม': 8,
    'ก.ย.': 9, 'กันยายน': 9, 'ต.ค.': 10, 'ตุลาคม': 10,
    'พ.ย.': 11, 'พฤศจิกายน': 11, 'ธ.ค.': 12, 'ธันวาคม': 12,
  };
  const thaiMatch = str.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (thaiMatch) {
    const month = thaiMonths[thaiMatch[2]];
    if (month) return toIso(Number(thaiMatch[3]), month, Number(thaiMatch[1]));
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return toIso(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

function cleanNumeric(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isFinite(val) ? val : fallback;
  const text = String(val).trim().replace(/,/g, '');
  const cleaned = text.replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return isFinite(num) ? num : fallback;
}

const HEADER_ALIASES = {
  date: ['วันที่ (Date)', 'วันที่ขาย', 'วันที่ทำรายการ', 'วัน-เวลา', 'Date/Time', 'Sale Date', 'Created Date', 'วันที่', 'Date'],
  billId: ['รหัสบิล (Bill ID)', 'เลขที่ใบเสร็จ', 'เลขที่บิล', 'เลขบิล', 'Bill No', 'Bill ID', 'BillID', 'Invoice', 'Order ID', 'Receipt No', 'รหัสบิล', 'บิล'],
  productName: ['ชื่อสินค้า (Product)', 'ชื่อสินค้า', 'Product Name', 'Item Name', 'รายการสินค้า', 'Product', 'ชื่อสี', 'รายการ', 'ชื่อ'],
  sku: ['รหัส SKU', 'SKU', 'รหัสสินค้า', 'Item Code', 'Barcode', 'Code', 'บาร์โค้ด'],
  size: ['ขนาด (Size)', 'ขนาดบรรจุ', 'Size (GL)', 'Size', 'ขนาด', 'บรรจุ'],
  base: ['เบส (Base)', 'เบสสี', 'Base', 'BASE', 'เบส'],
  filmColor: ['ฟิล์มสี (Film Color)', 'ฟิล์มสี', 'Film Color', 'Film', 'ชนิดฟิล์ม', 'Sheen', 'Finish', 'ฟิล์ม'],
  colorCode: ['รหัสเฉดสี (Color Code)', 'รหัสเฉดสี', 'Color Code', 'เบอร์สี', 'เฉดสี', 'รหัสสี', 'Shade', 'Color'],
  price: ['ราคา/หน่วย (Price)', 'ราคาต่อหน่วย', 'Unit Price', 'ราคาขาย', 'ราคา/หน่วย', 'Price'],
  tintPrice: ['ค่าผสมสี (Tint Price)', 'ค่าผสมสี', 'Tint Price', 'ค่าแม่สี', 'ค่าสี', 'Tint'],
  quantity: ['จำนวน (Qty)', 'จำนวนถัง', 'จำนวนชิ้น', 'Quantity', 'Qty', 'จำนวน', 'ชิ้น', 'ถัง'],
  total: ['ยอดรวม (Total THB)', 'ยอดรวมสุทธิ', 'รวมทั้งสิ้น', 'Total Amount', 'Total THB', 'ยอดรวม', 'รวมเงิน', 'เป็นเงิน', 'จำนวนเงิน', 'Total'],
  customerName: ['ชื่อลูกค้า/ช่าง', 'ชื่อลูกค้า', 'Customer Name', 'Customer', 'ชื่อช่าง', 'ช่าง/ผู้รับเหมา', 'ผู้ซื้อ', 'ลูกค้า'],
  customerPhone: ['เบอร์โทรศัพท์', 'เบอร์โทร', 'Telephone', 'Phone', 'Tel', 'Mobile', 'เบอร์ติดต่อ'],
  salesperson: ['พนักงานขาย', 'Salesperson', 'Seller', 'ผู้ขาย', 'PC'],
  brand: ['ยี่ห้อ', 'แบรนด์', 'Brand'],
};

type SalesColumnKey = keyof typeof HEADER_ALIASES;
type SalesColumnMap = Partial<Record<SalesColumnKey, string>>;

const normalizeHeader = (value: any): string => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[()\[\]{}:：/\\|_\-.,]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function buildSalesColumnMap(row: Record<string, any>): SalesColumnMap {
  const headers = Object.keys(row);
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  const map: SalesColumnMap = {};

  const forbiddenByField: Partial<Record<SalesColumnKey, string[]>> = {
    price: ['ต้นทุน', 'cost', 'ทุน'],
    total: ['ต้นทุน', 'cost'],
    quantity: ['คงเหลือ', 'stock', 'สต็อก'],
  };

  (Object.keys(HEADER_ALIASES) as SalesColumnKey[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader).filter(Boolean);
    const forbidden = forbiddenByField[field] || [];

    const candidates = normalized
      .map(({ header, key }) => {
        if (forbidden.some((word) => key.includes(normalizeHeader(word)))) return null;
        let score = 0;
        if (aliases.includes(key)) score = 1000 - key.length;
        else {
          for (const alias of aliases) {
            if (key === alias) score = Math.max(score, 900);
            else if (key.startsWith(alias + ' ')) score = Math.max(score, 700 - Math.max(0, key.length - alias.length));
            else if (key.includes(' ' + alias + ' ')) score = Math.max(score, 650 - Math.max(0, key.length - alias.length));
            else if (key.includes(alias) && alias.length >= 4) score = Math.max(score, 500 - Math.max(0, key.length - alias.length));
          }
        }
        return score > 0 ? { header, score } : null;
      })
      .filter(Boolean) as { header: string; score: number }[];

    candidates.sort((a, b) => b.score - a.score || a.header.length - b.header.length);
    if (candidates[0]) map[field] = candidates[0].header;
  });

  return map;
}

function getMappedValue(row: Record<string, any>, map: SalesColumnMap, field: SalesColumnKey): any {
  const header = map[field];
  return header ? row[header] : undefined;
}

export interface ParseSalesResult {
  items: SaleItem[];
  errors: string[];
  rawCount: number;
  totalRevenue: number;
  totalQuantity: number;
  earliestDate: string | null;
  latestDate: string | null;
}

// Parse Historical Sales Excel with robust Thai/English header mapping.
export async function parseSalesHistoryExcel(file: File): Promise<ParseSalesResult> {
  const rawRows = await parseExcelFile(file);
  const items: SaleItem[] = [];
  const errors: string[] = [];
  const firstRow = rawRows.find((row: any) => Object.keys(row).length > 0) || {};
  const columnMap = buildSalesColumnMap(firstRow);
  const requiredFields: SalesColumnKey[] = ['date', 'productName'];

  for (const field of requiredFields) {
    if (!columnMap[field]) errors.push(`ไม่พบคอลัมน์สำคัญ: ${field === 'date' ? 'วันที่' : 'ชื่อสินค้า'}`);
  }

  let previousBillId: string | undefined;
  let previousBillWasExplicit = false;
  let previousDate: string | null = null;
  let generatedSeq = 0;

  rawRows.forEach((row: any, index: number) => {
    const rowNum = index + 2;
    const dateVal = getMappedValue(row, columnMap, 'date');
    const parsedDate = parseExcelDate(dateVal);
    if (!parsedDate) {
      errors.push(`แถวที่ ${rowNum}: วันที่ไม่ถูกต้องหรือว่าง`);
      return;
    }

    const explicitBill = getMappedValue(row, columnMap, 'billId');
    let billId = explicitBill !== undefined && String(explicitBill).trim() !== '' ? String(explicitBill).trim() : '';

    // Excel exports often merge the Bill ID cell vertically. XLSX returns blanks
    // for those continuation rows, so carry the previous bill only when the date matches.
    if (!billId && previousBillWasExplicit && previousBillId && previousDate === parsedDate) {
      billId = previousBillId;
    }
    const billWasExplicit = Boolean(billId);
    if (!billId) {
      generatedSeq++;
      billId = `BILL-IMP-${parsedDate.replace(/-/g, '')}-${String(generatedSeq).padStart(5, '0')}`;
    }
    previousBillId = billId;
    previousBillWasExplicit = billWasExplicit;
    previousDate = parsedDate;

    const text = (field: SalesColumnKey, fallback = '') => {
      const value = getMappedValue(row, columnMap, field);
      return value === undefined || value === null ? fallback : String(value).trim() || fallback;
    };

    const productName = text('productName', 'สินค้าจากแอปเดิม');
    const sku = text('sku', `SKU-IMP-${index + 1}`).toUpperCase();
    const rawSize = text('size', '5GL');
    let size = rawSize;
    if (/2[.,]?5/.test(rawSize)) size = '2.5GL';
    else if (/1\s*\/\s*4|0[.,]?25/.test(rawSize)) size = '1/4GL';
    else if (/\b5(?:\s*GL|\s*แกลลอน)?\b/i.test(rawSize)) size = '5GL';
    else if (/\b1(?:\s*GL|\s*แกลลอน)?\b/i.test(rawSize)) size = '1GL';

    const baseRaw = text('base', '-');
    const filmRaw = text('filmColor', '-');
    const colorRaw = text('colorCode', '-');
    const priceVal = getMappedValue(row, columnMap, 'price');
    const tintVal = getMappedValue(row, columnMap, 'tintPrice');
    const qtyVal = getMappedValue(row, columnMap, 'quantity');
    const totalVal = getMappedValue(row, columnMap, 'total');
    let price = cleanNumeric(priceVal, 0);
    const tintPrice = cleanNumeric(tintVal, 0);
    let quantity = cleanNumeric(qtyVal, 1);
    if (quantity <= 0) quantity = 1;
    let total = cleanNumeric(totalVal, 0);

    if (total <= 0 && price > 0) total = (price + tintPrice) * quantity;
    else if (price <= 0 && total > 0) price = Math.max(0, total / quantity - tintPrice);

    if (total <= 0) {
      errors.push(`แถวที่ ${rowNum}: ไม่พบยอดรวม/ราคา สำหรับสินค้า "${productName}"`);
      return;
    }

    const customerName = text('customerName', '') || undefined;
    const customerPhone = text('customerPhone', '') || undefined;
    const salesperson = text('salesperson', '') || undefined;
    const brand = text('brand', 'NIPPON PAINT');
    const safeSku = sku.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const saleId = `sale-imp-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = `${parsedDate}T12:00:00.000Z`;

    items.push({
      id: saleId,
      billId,
      date: parsedDate,
      productId: `prod-imp-${safeSku}`,
      productName,
      brand,
      sku,
      size,
      base: baseRaw !== '-' ? baseRaw.toUpperCase() : undefined,
      filmColor: filmRaw !== '-' ? filmRaw : undefined,
      colorCode: colorRaw !== '-' ? colorRaw : undefined,
      price,
      tintPrice,
      quantity,
      total,
      customerName,
      customerPhone,
      salesperson,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  const totalRevenue = items.reduce((sum, item) => sum + item.total, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const sortedDates = items.map((i) => i.date).sort();

  return {
    items,
    errors,
    rawCount: rawRows.length,
    totalRevenue,
    totalQuantity,
    earliestDate: sortedDates[0] || null,
    latestDate: sortedDates[sortedDates.length - 1] || null,
  };
}

// Download Sample Sales Excel Template for historical data
export function downloadSampleSalesExcel(): void {
  const sampleData = [
    {
      'วันที่ (Date)': '2026-08-15',
      'รหัสบิล (Bill ID)': 'BILL-20260815-001',
      'ชื่อสินค้า (Product)': 'Nippon Weatherbond',
      'รหัส SKU': 'NP-WB-5GL-A',
      'ขนาด (Size)': '5GL',
      'เบส (Base)': 'A',
      'ฟิล์มสี (Film Color)': 'กึ่งเงา',
      'รหัสเฉดสี (Color Code)': 'OW-1001',
      'ราคา/หน่วย (Price)': 3450,
      'ค่าผสมสี (Tint Price)': 150,
      'จำนวน (Qty)': 2,
      'ยอดรวม (Total THB)': 7200,
      'ชื่อลูกค้า/ช่าง': 'ช่างสมหมาย การช่าง',
      'เบอร์โทรศัพท์': '081-234-5678',
      'พนักงานขาย': 'พนักงาน PC',
    },
    {
      'วันที่ (Date)': '2026-08-20',
      'รหัสบิล (Bill ID)': 'BILL-20260820-002',
      'ชื่อสินค้า (Product)': 'Nippon AirCare',
      'รหัส SKU': 'NP-AC-25GL-B',
      'ขนาด (Size)': '2.5GL',
      'เบส (Base)': 'B',
      'ฟิล์มสี (Film Color)': 'เนียน',
      'รหัสเฉดสี (Color Code)': 'OW-2005',
      'ราคา/หน่วย (Price)': 1850,
      'ค่าผสมสี (Tint Price)': 0,
      'จำนวน (Qty)': 3,
      'ยอดรวม (Total THB)': 5550,
      'ชื่อลูกค้า/ช่าง': 'คุณวิภาวรรณ',
      'เบอร์โทรศัพท์': '089-876-5432',
      'พนักงานขาย': 'พนักงาน PC',
    },
    {
      'วันที่ (Date)': '2026-09-02',
      'รหัสบิล (Bill ID)': 'BILL-20260902-001',
      'ชื่อสินค้า (Product)': 'Nippon Vinilex Acrylic',
      'รหัส SKU': 'NP-VN-5GL-WHITE',
      'ขนาด (Size)': '5GL',
      'เบส (Base)': '-',
      'ฟิล์มสี (Film Color)': 'ด้าน',
      'รหัสเฉดสี (Color Code)': 'ขาว #100',
      'ราคา/หน่วย (Price)': 2150,
      'ค่าผสมสี (Tint Price)': 0,
      'จำนวน (Qty)': 5,
      'ยอดรวม (Total THB)': 10750,
      'ชื่อลูกค้า/ช่าง': 'หจก. เมืองทองวิศวกรรม',
      'เบอร์โทรศัพท์': '082-999-1122',
      'พนักงานขาย': 'พนักงาน PC',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales History');
  XLSX.writeFile(workbook, 'Template_ประวัติยอดขาย_แอปเดิม.xlsx');
}

export function exportSalesToExcel(sales: SaleItem[], fileName = 'sales_history.xlsx'): void {
  const rows = sales.map((s) => ({
    'รหัสบิล (Bill ID)': s.billId,
    'วันที่ (Date)': s.date,
    'ชื่อสินค้า (Product)': s.productName,
    'รหัส SKU': s.sku,
    'ขนาด (Size)': s.size,
    'เบส (Base)': s.base || '-',
    'ฟิล์มสี (Film Color)': s.filmColor || '-',
    'รหัสเฉดสี (Color Code)': s.colorCode || '-',
    'ราคา/หน่วย (Price)': s.price,
    'ค่าผสมสี (Tint Price)': s.tintPrice,
    'จำนวน (Qty)': s.quantity,
    'ยอดรวม (Total THB)': s.total,
    'ชื่อลูกค้า/ช่าง': s.customerName || '-',
    'เบอร์โทรศัพท์': s.customerPhone || '-',
    'สร้างเมื่อ': s.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
  XLSX.writeFile(workbook, fileName);
}

export function exportStockToExcel(stockList: any[], fileName = 'stock_inventory.xlsx'): void {
  const rows = stockList.map((item) => ({
    'รหัส SKU': item.sku,
    'ชื่อสินค้า': item.productName,
    'ขนาด': item.size,
    'เบส': item.base || '-',
    'คงเหลือ (Remaining)': item.remainingStock,
    'ขายไปแล้ว (Sold)': item.soldQuantity,
    'รับเข้า (Stock In)': item.stockIn,
    'สต็อกตั้งต้น (Initial)': item.initialStock,
    'ขายเฉลี่ย/วัน (14d)': item.avgDailySales14d,
    'คงเหลือขายได้ (วัน)': item.daysLeft === 999 ? 'เพียงพอ' : `${item.daysLeft} วัน`,
    'สถานะ': item.isOversold ? 'ขายเกิน (Oversold)' : item.isLowStock ? 'สต็อกต่ำ (Low Stock)' : 'ปกติ (Normal)',
    'มูลค่าสต็อก (THB)': item.totalValue,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Data');
  XLSX.writeFile(workbook, fileName);
}

export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (!workbook.SheetNames?.length) return resolve([]);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) return resolve([]);
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json || []);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
