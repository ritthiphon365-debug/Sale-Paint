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
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
