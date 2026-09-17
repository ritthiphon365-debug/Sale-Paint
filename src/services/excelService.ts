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
export function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date && !isNaN(val.getTime())) {
    let y = val.getFullYear();
    if (y > 2400) y -= 543;
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel numeric date serial
  if (typeof val === 'number') {
    // 25569 days offset between 1900-01-01 and 1970-01-01
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      let y = dateObj.getFullYear();
      if (y > 2400) y -= 543;
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();

  // Excel serial stored as string digits
  if (/^\d{5}$/.test(str)) {
    const num = Number(str);
    const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      let y = dateObj.getFullYear();
      if (y > 2400) y -= 543;
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y > 2400) y -= 543; // Convert Buddhist Era (e.g. 2567 -> 2024)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Match YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    let y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y > 2400) y -= 543;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Fallback native parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    let y = parsed.getFullYear();
    if (y > 2400) y -= 543;
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

// Clean number strings with commas, currency symbols, and whitespace
function cleanNumeric(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
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

// Parse Historical Sales Excel with multi-dialect Thai & English column matching
export async function parseSalesHistoryExcel(file: File): Promise<ParseSalesResult> {
  const rawRows = await parseExcelFile(file);
  const items: SaleItem[] = [];
  const errors: string[] = [];

  let lastGeneratedBillDate = '';
  let lastGeneratedBillSeq = 1;

  rawRows.forEach((row: any, index: number) => {
    const rowNum = index + 2; // 1-indexed plus header

    const findKey = (possibleNames: string[]): any => {
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== '') {
          return row[name];
        }
        for (const k of Object.keys(row)) {
          const cleanK = k.trim().toLowerCase();
          const cleanName = name.trim().toLowerCase();
          if (cleanK === cleanName || cleanK.includes(cleanName)) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return row[k];
            }
          }
        }
      }
      return undefined;
    };

    // Date
    const dateVal = findKey([
      'วันที่ (Date)',
      'วันที่',
      'Date',
      'Sale Date',
      'วันที่ขาย',
      'วันที่ทำรายการ',
      'วัน-เวลา',
      'Created Date',
      'Time',
      'Date/Time',
    ]);
    const parsedDate = parseExcelDate(dateVal);

    // Bill ID
    let billId = findKey([
      'รหัสบิล (Bill ID)',
      'รหัสบิล',
      'Bill ID',
      'Bill No',
      'BillID',
      'Invoice',
      'เลขที่บิล',
      'เลขบิล',
      'บิล',
      'Order ID',
      'Receipt No',
      'เลขที่ใบเสร็จ',
    ]);

    if (!billId) {
      if (parsedDate !== lastGeneratedBillDate) {
        lastGeneratedBillDate = parsedDate;
        lastGeneratedBillSeq = 1;
      } else {
        lastGeneratedBillSeq++;
      }
      billId = `BILL-IMP-${parsedDate.replace(/-/g, '')}-${String(lastGeneratedBillSeq).padStart(3, '0')}`;
    } else {
      billId = String(billId).trim();
    }

    // Product Name
    const nameVal = findKey([
      'ชื่อสินค้า (Product)',
      'ชื่อสินค้า',
      'Product Name',
      'Product',
      'ชื่อ',
      'รายการ',
      'Item Name',
      'รายการสินค้า',
      'ชื่อสี',
    ]);
    const productName = nameVal ? String(nameVal).trim() : 'สินค้าจากแอปเดิม';

    // SKU
    const skuVal = findKey([
      'รหัส SKU',
      'SKU',
      'sku',
      'รหัสสินค้า',
      'Barcode',
      'Item Code',
      'Code',
      'บาร์โค้ด',
    ]);
    const sku = skuVal ? String(skuVal).trim().toUpperCase() : `SKU-IMP-${index + 1}`;

    // Size
    const sizeVal = findKey(['ขนาด (Size)', 'ขนาด', 'Size', 'บรรจุ', 'ขนาดบรรจุ', 'Size (GL)']);
    let size = sizeVal ? String(sizeVal).trim() : '5GL';
    // Normalize size text
    if (size.includes('5') && !size.includes('2.5') && !size.includes('.5')) size = '5GL';
    else if (size.includes('2.5')) size = '2.5GL';
    else if (size.includes('1/4') || size.includes('0.25')) size = '1/4GL';
    else if (size.includes('1')) size = '1GL';

    // Base
    const baseVal = findKey(['เบส (Base)', 'เบส', 'Base', 'BASE', 'เบสสี']);
    const base = baseVal ? String(baseVal).trim().toUpperCase() : '-';

    // Film Color
    const filmVal = findKey([
      'ฟิล์มสี (Film Color)',
      'ฟิล์มสี',
      'ชนิดฟิล์ม',
      'Film Color',
      'Film',
      'Sheen',
      'Finish',
      'ฟิล์ม',
    ]);
    const filmColor = filmVal ? String(filmVal).trim() : '-';

    // Color Code
    const colorVal = findKey([
      'รหัสเฉดสี (Color Code)',
      'เบอร์สี',
      'รหัสเฉดสี',
      'Color Code',
      'Color',
      'เฉดสี',
      'รหัสสี',
      'Shade',
    ]);
    const colorCode = colorVal ? String(colorVal).trim() : '-';

    // Numbers: Price, Tint, Qty, Total
    const priceVal = findKey(['ราคา/หน่วย (Price)', 'ราคา', 'ราคาขาย', 'Price', 'Unit Price', 'ราคาต่อหน่วย', 'ราคา/หน่วย']);
    const tintVal = findKey(['ค่าผสมสี (Tint Price)', 'ค่าผสมสี', 'Tint Price', 'ค่าสี', 'ค่าแม่สี', 'Tint']);
    const qtyVal = findKey(['จำนวน (Qty)', 'จำนวน', 'Qty', 'Quantity', 'จำนวนถัง', 'จำนวนชิ้น', 'ชิ้น', 'ถัง']);
    const totalVal = findKey(['ยอดรวม (Total THB)', 'ยอดรวม', 'Total THB', 'Total', 'Total Amount', 'รวมเงิน', 'รวมทั้งสิ้น', 'เป็นเงิน', 'จำนวนเงิน']);

    let price = cleanNumeric(priceVal, 0);
    const tintPrice = cleanNumeric(tintVal, 0);
    let quantity = cleanNumeric(qtyVal, 1);
    if (quantity <= 0) quantity = 1;

    let total = cleanNumeric(totalVal, 0);

    // If total is missing or zero, compute from (price + tintPrice) * quantity
    if (total <= 0 && price > 0) {
      total = (price + tintPrice) * quantity;
    } else if (price <= 0 && total > 0 && quantity > 0) {
      // If price was missing but total was present
      price = Math.max(0, Math.round(total / quantity) - tintPrice);
    }

    if (total <= 0) {
      errors.push(`แถวที่ ${rowNum}: ไม่พบยอดรวมเงิน (Total) หรือราคาเป็น 0 สำหรับสินค้า "${productName}"`);
    }

    // Customer Name & Phone
    const custVal = findKey([
      'ชื่อลูกค้า/ช่าง',
      'ชื่อลูกค้า',
      'Customer',
      'Customer Name',
      'ลูกค้า',
      'ชื่อช่าง',
      'ช่าง/ผู้รับเหมา',
      'ผู้ซื้อ',
    ]);
    const customerName = custVal ? String(custVal).trim() : undefined;

    const phoneVal = findKey(['เบอร์โทรศัพท์', 'เบอร์โทร', 'Phone', 'Tel', 'Telephone', 'เบอร์ติดต่อ', 'Mobile']);
    const customerPhone = phoneVal ? String(phoneVal).trim() : undefined;

    // Salesperson
    const salesPersonVal = findKey(['พนักงานขาย', 'Salesperson', 'Seller', 'PC', 'ผู้ขาย']);
    const salesperson = salesPersonVal ? String(salesPersonVal).trim() : undefined;

    const saleId = `sale-imp-${Date.now().toString(36)}-${index}-${Math.random().toString(36).substring(2, 6)}`;

    items.push({
      id: saleId,
      billId,
      date: parsedDate,
      productId: `prod-imp-${sku.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      productName,
      brand: 'NIPPON PAINT',
      sku,
      size,
      base: base !== '-' ? base : undefined,
      filmColor: filmColor !== '-' ? filmColor : undefined,
      colorCode: colorCode !== '-' ? colorCode : undefined,
      price,
      tintPrice,
      quantity,
      total,
      customerName,
      customerPhone,
      salesperson,
      createdAt: `${parsedDate}T12:00:00.000Z`,
      updatedAt: `${parsedDate}T12:00:00.000Z`,
    });
  });

  // Calculate stats
  const totalRevenue = items.reduce((sum, item) => sum + item.total, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const sortedDates = items
    .map((i) => i.date)
    .filter(Boolean)
    .sort();
  const earliestDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  return {
    items,
    errors,
    rawCount: rawRows.length,
    totalRevenue,
    totalQuantity,
    earliestDate,
    latestDate,
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
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve([]);
          return;
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          resolve([]);
          return;
        }
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json || []);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
