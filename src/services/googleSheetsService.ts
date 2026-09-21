// Google Workspace Sheets integration service
// Multi-Tab Single Spreadsheet synchronization & 1-Click Backup
import * as XLSX from 'xlsx';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveSpreadsheetItem } from '../types';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { GoogleAuthProvider } from 'firebase/auth';

const OAUTH_CLIENT_ID =
  firebaseConfig.oAuthClientId || '642619463136-if4cgcaei5u8spjla2tqmtm67pkl6cep.apps.googleusercontent.com';
const OAUTH_SCOPES =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

export interface GoogleSyncConfig {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  webhookUrl?: string;
  lastSyncTime?: string;
  autoSync: boolean;
}

export interface MultiTabDataPayload {
  sales?: any[];
  customers?: any[];
  catalog?: any[];
  stock?: any[];
  commission?: any;
  salesperson?: string;
  branch?: string;
}

export class GoogleSheetsService {
  // Enhanced Multi-Tab Google Apps Script Template
  // Manages 5 distinct sheets in the same Google Spreadsheet automatically:
  // 1. Sales_Transactions
  // 2. Customers
  // 3. Products_Catalog
  // 4. Stock_Inventory
  // 5. Commission_Summary
  static readonly APPS_SCRIPT_TEMPLATE = `// === Google Apps Script: ระบบรวม 5 ชีตในสเปรดชีตเดียว (Single Spreadsheet Multi-Tab) ===
// แอปบริหารงานขายสี Nippon Paint PC
// 
// วิธีติดตั้งง่ายๆ ใน 1 นาที:
// 1. เปิด Google Sheet ของคุณ (สร้างใหม่หรือไฟล์เดิม)
// 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
// 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดชุดนี้ลงไป
// 4. กดปุ่มสีน้ำเงิน "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
// 5. เลือกประเภท "เว็บแอป" (Web app)
// 6. ตั้งค่า:
//    - คำอธิบาย: Multi-Tab Sales Sync
//    - เรียกใช้ในฐานะ (Execute as): "ฉัน (Me)"
//    - ผู้มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)"
// 7. กด Deploy แล้วคัดลอก "URL เว็บแอป" มาใส่ในช่อง Webhook URL ในแอป

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var contents = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(contents);
    var action = data.action || (data.type ? data.type : 'appendSales');
    var timestamp = new Date().toLocaleString('th-TH');

    // 1. ชีต: Sales_Transactions (รายการขายและบิล)
    if (data.sales && data.sales.length > 0) {
      var salesSheet = getOrCreateSheet(ss, 'Sales_Transactions', [
        'Bill ID', 'วันที่', 'ชื่อสินค้า', 'แบรนด์', 'SKU', 'ขนาด', 'เบส', 'ฟิล์มสี', 'รหัสสี',
        'ราคาขาย', 'ค่าแม่สี', 'จำนวน', 'รวมเงิน', 'ลูกค้า', 'เบอร์โทร', 'พนักงานขาย (PC)', 'อีเมล', 'เวลาบันทึก'
      ], '#f43f5e');

      // หากเป็นการ sync ทั้งหมด (syncAllTabs) ให้ล้างข้อมูลเดิมเพื่ออัปเดตให้ตรงกัน 100% หรือต่อท้าย
      if (action === 'syncAllTabs' || action === 'replaceSales') {
        clearSheetDataPreserveHeader(salesSheet);
      }

      data.sales.forEach(function(s) {
        salesSheet.appendRow([
          s.billId || '',
          s.date || '',
          s.productName || '',
          s.brand || 'NIPPON PAINT',
          s.sku || '',
          s.size || '',
          s.base || '-',
          s.filmColor || '-',
          s.colorCode || '-',
          Number(s.price) || 0,
          Number(s.tintPrice) || 0,
          Number(s.quantity) || 1,
          Number(s.total) || 0,
          s.customerName || 'ลูกค้าทั่วไป',
          s.customerPhone || '-',
          s.salesperson || '-',
          s.salespersonEmail || '-',
          timestamp
        ]);
      });
    }

    // 2. ชีต: Customers (รายชื่อลูกค้าและช่าง)
    if (data.customers && data.customers.length > 0) {
      var custSheet = getOrCreateSheet(ss, 'Customers', [
        'รหัสลูกค้า', 'ชื่อ-นามสกุล / ชื่อช่าง', 'เบอร์โทรศัพท์', 'ประเภทลูกค้า', 'จำนวนครั้งที่ซื้อ',
        'ยอดซื้อสะสม (บาท)', 'ที่อยู่ / ไซต์งาน', 'หมายเหตุ', 'อัปเดตล่าสุด'
      ], '#3b82f6');

      clearSheetDataPreserveHeader(custSheet);
      data.customers.forEach(function(c) {
        custSheet.appendRow([
          c.id || '',
          c.name || '',
          c.phone || '-',
          c.type || 'ทั่วไป',
          Number(c.orderCount) || 0,
          Number(c.totalSpent) || 0,
          c.address || '-',
          c.notes || '-',
          timestamp
        ]);
      });
    }

    // 3. ชีต: Products_Catalog (ข้อมูลสินค้าและราคามาตรฐาน)
    if (data.catalog && data.catalog.length > 0) {
      var prodSheet = getOrCreateSheet(ss, 'Products_Catalog', [
        'SKU', 'ชื่อผลิตภัณฑ์', 'แบรนด์', 'หมวดหมู่', 'ขนาดบรรจุ', 'เบส', 'ฟิล์มสี', 'รหัสสี', 'ราคาตั้ง (บาท)', 'ราคาขายต่ำสุด', 'อัปเดตล่าสุด'
      ], '#8b5cf6');

      clearSheetDataPreserveHeader(prodSheet);
      data.catalog.forEach(function(p) {
        prodSheet.appendRow([
          p.sku || '',
          p.name || '',
          p.brand || 'NIPPON PAINT',
          p.category || 'สีทับหน้า',
          p.size || '',
          p.base || '-',
          p.filmColor || '-',
          p.colorCode || '-',
          Number(p.price) || 0,
          Number(p.minPrice) || 0,
          timestamp
        ]);
      });
    }

    // 4. ชีต: Stock_Inventory (สต็อกคงเหลือ)
    if (data.stock && data.stock.length > 0) {
      var stockSheet = getOrCreateSheet(ss, 'Stock_Inventory', [
        'SKU', 'ชื่อสินค้า', 'ขนาด', 'เบส', 'ฟิล์มสี', 'สต็อกคงเหลือ (ถัง)', 'ยอดรับเข้าสะสม', 'ยอดขายสะสม', 'สถานะสต็อก', 'อัปเดตล่าสุด'
      ], '#10b981');

      clearSheetDataPreserveHeader(stockSheet);
      data.stock.forEach(function(st) {
        stockSheet.appendRow([
          st.sku || '',
          st.name || '',
          st.size || '',
          st.base || '-',
          st.filmColor || '-',
          Number(st.currentStock) || 0,
          Number(st.totalStockIn) || 0,
          Number(st.totalSold) || 0,
          st.status || 'ปกติ',
          timestamp
        ]);
      });
    }

    // 5. ชีต: Commission_Summary (สรุปยอดและคอมมิชชั่น)
    if (data.commission) {
      var commSheet = getOrCreateSheet(ss, 'Commission_Summary', [
        'เดือน/ปี', 'พนักงานขาย (PC)', 'สาขา', 'เป้าหมายยอดขาย (บาท)', 'ยอดขายทำได้จริง (บาท)',
        'อัตราบรรลุเป้า (%)', 'เงินรางวัลรายแกลลอน (บาท)', 'ค่าคอมมิชชั่นยอดรวม (บาท)', 'รวมรายได้พิเศษ (บาท)', 'เวลาสรุป'
      ], '#f59e0b');

      var com = data.commission;
      commSheet.appendRow([
        com.monthYear || new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
        data.salesperson || com.salesperson || '-',
        data.branch || com.branch || '-',
        Number(com.target) || 0,
        Number(com.totalSalesAmount) || 0,
        (Number(com.achievementPercent) || 0) + '%',
        Number(com.gallonIncentiveEarnedTotal) || 0,
        Number(com.commissionAmount) || 0,
        Number(com.netCommission) || 0,
        timestamp
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'ซิงค์ข้อมูลลง 5 แท็บของ Google Sheet สำเร็จ',
      spreadsheetName: ss.getName(),
      timestamp: timestamp
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันช่วยสร้างหรือเลือกชีต พร้อมตกแต่งหัวตาราง
function getOrCreateSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground(headerColor);
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  return sheet;
}

// ฟังก์ชันช่วยล้างข้อมูลเดิมโดยเก็บหัวตารางไว้
function clearSheetDataPreserveHeader(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}
`;

  // Parse spreadsheet ID from raw ID or full Google Sheet URL
  static extractSpreadsheetId(input: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    // Pattern: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Bare ID
    if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed;
  }

  // Generate web URL for spreadsheet
  static getSpreadsheetUrl(spreadsheetIdOrUrl: string): string {
    if (!spreadsheetIdOrUrl) return '';
    if (spreadsheetIdOrUrl.startsWith('http://') || spreadsheetIdOrUrl.startsWith('https://')) {
      return spreadsheetIdOrUrl;
    }
    const cleanId = this.extractSpreadsheetId(spreadsheetIdOrUrl);
    return cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '';
  }

  // Send single sale bill or batch of sales via Webhook
  static async pushSalesViaWebhook(
    webhookUrl: string,
    sales: any[]
  ): Promise<{ success: boolean; count: number; message?: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
      throw new Error('กรุณาระบุ Webhook URL ของ Google Apps Script');
    }
    if (!sales || sales.length === 0) {
      return { success: true, count: 0 };
    }

    const payload = {
      action: 'appendSales',
      sales: sales.map((s) => ({
        billId: s.billId,
        date: s.date,
        productName: s.productName,
        brand: s.brand || 'NIPPON PAINT',
        sku: s.sku,
        size: s.size,
        base: s.base || '-',
        filmColor: s.filmColor || '-',
        colorCode: s.colorCode || '-',
        price: Number(s.price) || 0,
        tintPrice: Number(s.tintPrice) || 0,
        quantity: Number(s.quantity) || 1,
        total: Number(s.total) || 0,
        customerName: s.customerName || 'ลูกค้าทั่วไป',
        customerPhone: s.customerPhone || '-',
        salesperson: s.salesperson || '-',
        salespersonEmail: s.salespersonEmail || '-',
      })),
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      return { success: true, count: sales.length };
    } catch (err: any) {
      console.error('Webhook sales push error:', err);
      throw new Error(`ส่งข้อมูลไปยัง Google Sheet ไม่สำเร็จ: ${err.message || 'Network Error'}`);
    }
  }

  // Multi-Tab Full Sync via Google Apps Script Webhook (One-Click)
  // Sends Sales, Customers, Catalog, Stock, and Commission into their respective tabs
  static async pushAllTabsViaWebhook(
    webhookUrl: string,
    data: MultiTabDataPayload
  ): Promise<{ success: boolean; message: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
      throw new Error('กรุณาระบุ Webhook URL ของ Google Apps Script');
    }

    const payload = {
      action: 'syncAllTabs',
      salesperson: data.salesperson || 'พนักงาน PC',
      branch: data.branch || 'สาขาหลัก',
      sales: (data.sales || []).map((s) => ({
        billId: s.billId,
        date: s.date,
        productName: s.productName,
        brand: s.brand || 'NIPPON PAINT',
        sku: s.sku,
        size: s.size,
        base: s.base || '-',
        filmColor: s.filmColor || '-',
        colorCode: s.colorCode || '-',
        price: Number(s.price) || 0,
        tintPrice: Number(s.tintPrice) || 0,
        quantity: Number(s.quantity) || 1,
        total: Number(s.total) || 0,
        customerName: s.customerName || 'ลูกค้าทั่วไป',
        customerPhone: s.customerPhone || '-',
        salesperson: s.salesperson || data.salesperson || '-',
        salespersonEmail: s.salespersonEmail || '-',
      })),
      customers: (data.customers || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '-',
        type: c.type || 'ทั่วไป',
        orderCount: c.orderCount || 0,
        totalSpent: c.totalSpent || 0,
        address: c.address || '-',
        notes: c.notes || '-',
      })),
      catalog: (data.catalog || []).map((p) => ({
        sku: p.sku,
        name: p.name,
        brand: p.brand || 'NIPPON PAINT',
        category: p.category || 'สีทับหน้า',
        size: p.size,
        base: p.base || '-',
        filmColor: p.filmColor || '-',
        colorCode: p.colorCode || '-',
        price: Number(p.price) || 0,
        minPrice: Number(p.minPrice) || 0,
      })),
      stock: (data.stock || []).map((st) => ({
        sku: st.sku,
        name: st.name,
        size: st.size,
        base: st.base || '-',
        filmColor: st.filmColor || '-',
        currentStock: Number(st.currentStock) || 0,
        totalStockIn: Number(st.totalStockIn) || 0,
        totalSold: Number(st.totalSold) || 0,
        status: st.status || 'ปกติ',
      })),
      commission: data.commission ? {
        monthYear: data.commission.monthYear,
        target: data.commission.target || 0,
        totalSalesAmount: data.commission.totalSalesAmount || 0,
        achievementPercent: data.commission.achievementPercent || 0,
        gallonIncentiveEarnedTotal: data.commission.gallonIncentiveEarnedTotal || 0,
        commissionAmount: data.commission.commissionAmount || 0,
        netCommission: data.commission.netCommission || 0,
      } : null,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      return { success: true, message: 'ส่งข้อมูลครบทั้ง 5 แท็บไปยัง Google Sheet เรียบร้อยแล้ว' };
    } catch (err: any) {
      console.error('All tabs sync error:', err);
      throw new Error(`ส่งข้อมูลครบชุดไม่สำเร็จ: ${err.message || 'Network Error'}`);
    }
  }

  // 1-Click Excel (.xlsx) Multi-Tab Export (5 Tabs in 1 Workbook)
  // Can be opened in Excel, Google Sheets (File > Import), or uploaded directly to Google Drive
  static exportMultiTabExcel(
    data: MultiTabDataPayload,
    filename = 'Sale_Paint_Pro_Master_Data.xlsx'
  ): void {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Sales_Transactions
    const salesRows = (data.sales || []).map((s) => ({
      'Bill ID': s.billId || '',
      'วันที่': s.date || '',
      'ชื่อสินค้า': s.productName || '',
      'แบรนด์': s.brand || 'NIPPON PAINT',
      'SKU': s.sku || '',
      'ขนาด': s.size || '',
      'เบส': s.base || '-',
      'ฟิล์มสี': s.filmColor || '-',
      'รหัสสี': s.colorCode || '-',
      'ราคาขาย': Number(s.price) || 0,
      'ค่าแม่สี': Number(s.tintPrice) || 0,
      'จำนวน': Number(s.quantity) || 1,
      'รวมเงิน': Number(s.total) || 0,
      'ลูกค้า': s.customerName || 'ลูกค้าทั่วไป',
      'เบอร์โทร': s.customerPhone || '-',
      'พนักงานขาย': s.salesperson || '-',
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesRows.length > 0 ? salesRows : [{ 'สถานะ': 'ไม่มียอดขาย' }]);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Transactions');

    // 2. Sheet: Customers
    const customerRows = (data.customers || []).map((c) => ({
      'รหัสลูกค้า': c.id || '',
      'ชื่อ-สกุล / ชื่อช่าง': c.name || '',
      'เบอร์โทร': c.phone || '-',
      'ประเภทลูกค้า': c.type || 'ทั่วไป',
      'จำนวนครั้งที่ซื้อ': Number(c.orderCount) || 0,
      'ยอดซื้อสะสม': Number(c.totalSpent) || 0,
      'ที่อยู่': c.address || '-',
      'หมายเหตุ': c.notes || '-',
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customerRows.length > 0 ? customerRows : [{ 'สถานะ': 'ไม่มีข้อมูลลูกค้า' }]);
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

    // 3. Sheet: Products_Catalog
    const catalogRows = (data.catalog || []).map((p) => ({
      'SKU': p.sku || '',
      'ชื่อสินค้า': p.name || '',
      'แบรนด์': p.brand || 'NIPPON PAINT',
      'หมวดหมู่': p.category || 'สีทับหน้า',
      'ขนาด': p.size || '',
      'เบส': p.base || '-',
      'ฟิล์มสี': p.filmColor || '-',
      'ราคาตั้ง': Number(p.price) || 0,
      'ราคาขั้นต่ำ': Number(p.minPrice) || 0,
    }));
    const wsCatalog = XLSX.utils.json_to_sheet(catalogRows.length > 0 ? catalogRows : [{ 'สถานะ': 'ไม่มีข้อมูลสินค้า' }]);
    XLSX.utils.book_append_sheet(wb, wsCatalog, 'Products_Catalog');

    // 4. Sheet: Stock_Inventory
    const stockRows = (data.stock || []).map((st) => ({
      'SKU': st.sku || '',
      'ชื่อสินค้า': st.name || '',
      'ขนาด': st.size || '',
      'เบส': st.base || '-',
      'ฟิล์มสี': st.filmColor || '-',
      'สต็อกคงเหลือ': Number(st.currentStock) || 0,
      'รับเข้าสะสม': Number(st.totalStockIn) || 0,
      'ขายออกสะสม': Number(st.totalSold) || 0,
      'สถานะ': st.status || 'ปกติ',
    }));
    const wsStock = XLSX.utils.json_to_sheet(stockRows.length > 0 ? stockRows : [{ 'สถานะ': 'ไม่มีข้อมูลสต็อก' }]);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock_Inventory');

    // 5. Sheet: Commission_Summary
    const com = data.commission || {};
    const commissionRows = [
      {
        'เดือน/ปี': com.monthYear || new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
        'พนักงานขาย': data.salesperson || '-',
        'สาขา': data.branch || '-',
        'เป้าหมาย': Number(com.target) || 0,
        'ยอดขายทำได้จริง': Number(com.totalSalesAmount) || 0,
        '% บรรลุเป้า': (Number(com.achievementPercent) || 0) + '%',
        'เงินรางวัลแกลลอน': Number(com.gallonIncentiveEarnedTotal) || 0,
        'คอมมิชชั่นยอดรวม': Number(com.commissionAmount) || 0,
        'รวมรายได้พิเศษ': Number(com.netCommission) || 0,
      },
    ];
    const wsCommission = XLSX.utils.json_to_sheet(commissionRows);
    XLSX.utils.book_append_sheet(wb, wsCommission, 'Commission_Summary');

    // Trigger download in browser
    XLSX.writeFile(wb, filename);
  }

  // Quick clipboard TSV copy for instant paste into Google Sheet (Ctrl+V)
  static async copySalesTsv(sales: any[]): Promise<void> {
    if (!sales || sales.length === 0) {
      throw new Error('ไม่มีข้อมูลการขายที่จะคัดลอก');
    }

    const header = [
      'Bill ID',
      'วันที่',
      'ชื่อสินค้า',
      'แบรนด์',
      'SKU',
      'ขนาด',
      'เบส',
      'ฟิล์มสี',
      'รหัสสี',
      'ราคาขาย',
      'ค่าแม่สี',
      'จำนวน',
      'รวมเงิน',
      'ลูกค้า',
      'เบอร์โทร',
      'พนักงานขาย (PC)',
    ];

    const rows = sales.map((s) => [
      s.billId,
      s.date,
      s.productName,
      s.brand || 'NIPPON PAINT',
      s.sku,
      s.size,
      s.base || '-',
      s.filmColor || '-',
      s.colorCode || '-',
      s.price,
      s.tintPrice,
      s.quantity,
      s.total,
      s.customerName || 'ลูกค้าทั่วไป',
      s.customerPhone || '-',
      s.salesperson || '-',
    ]);

    const tsvContent = [header.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tsvContent);
    } else {
      throw new Error('เบราว์เซอร์ไม่รองรับการคัดลอกลง Clipboard');
    }
  }

  // Google OAuth 2.0 Token Management
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('nippon_google_oauth_token');
    const expires = localStorage.getItem('nippon_google_oauth_expires');
    if (!token) return null;
    if (expires && Date.now() > Number(expires)) {
      localStorage.removeItem('nippon_google_oauth_token');
      localStorage.removeItem('nippon_google_oauth_expires');
      return null;
    }
    return token;
  }

  static setToken(token: string, expiresInSeconds = 3599): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nippon_google_oauth_token', token);
    localStorage.setItem('nippon_google_oauth_expires', String(Date.now() + expiresInSeconds * 1000));
  }

  static clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('nippon_google_oauth_token');
    localStorage.removeItem('nippon_google_oauth_expires');
    localStorage.removeItem('nippon_google_user_email');
  }

  static isTokenValid(): boolean {
    return Boolean(this.getToken());
  }

  // Request OAuth Access Token with Google Identity Services (GIS) & Firebase Auth fallback
  static async requestOAuthToken(promptConsent = false): Promise<string> {
    // 1. Google Identity Services (GIS) Token Client
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: OAUTH_CLIENT_ID,
              scope: OAUTH_SCOPES,
              prompt: promptConsent ? 'consent' : '',
              callback: (response: any) => {
                if (response.access_token) {
                  const expiresIn = response.expires_in ? Number(response.expires_in) : 3599;
                  GoogleSheetsService.setToken(response.access_token, expiresIn);
                  resolve(response.access_token);
                } else if (response.error) {
                  reject(new Error(response.error_description || response.error));
                } else {
                  reject(new Error('ไม่ได้รับ Access Token จาก Google'));
                }
              },
              error_callback: (err: any) => {
                reject(new Error(err.message || 'เกิดข้อผิดพลาดในการเรียก Google OAuth Client'));
              },
            });
            client.requestAccessToken();
          } catch (initErr) {
            reject(initErr);
          }
        });
        if (token) return token;
      } catch (gisError) {
        console.warn('GIS token request failed, falling back to Firebase popup:', gisError);
      }
    }

    // 2. Firebase Auth popup fallback
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      if (promptConsent) {
        provider.setCustomParameters({ prompt: 'select_account consent' });
      }
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        GoogleSheetsService.setToken(token, 3599);
        if (result.user.email) {
          localStorage.setItem('nippon_google_user_email', result.user.email);
        }
        return token;
      }
      throw new Error('ไม่พบ Access Token จากการเข้าสู่ระบบ Google');
    } catch (fbErr: any) {
      console.error('OAuth token request failed:', fbErr);
      throw new Error(`เชื่อมต่อ Google ไม่สำเร็จ: ${fbErr.message || 'ตรวจพบปัญหาการขอสิทธิ์'}`);
    }
  }

  // List user's spreadsheets from Google Drive
  static async listSpreadsheetsFromDrive(token?: string): Promise<DriveSpreadsheetItem[]> {
    let activeToken = token || this.getToken();
    if (!activeToken) {
      try {
        activeToken = await this.requestOAuthToken(false);
      } catch (authErr: any) {
        throw new Error('กรุณาเข้าสู่ระบบบัญชี Google ก่อนค้นหาไฟล์สเปรดชีต');
      }
    }

    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('เซสชัน Google หมดอายุ กรุณากดเชื่อมต่อบัญชี Google ใหม่อีกครั้ง');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(`ไม่สามารถโหลดสเปรดชีตจาก Drive: ${errData.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name || 'ไม่มีชื่อสเปรดชีต',
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    }));
  }

  // 1-Click Create new Google Spreadsheet with all 5 Tabs and pre-formatted headers
  static async createSpreadsheet(
    title: string,
    brandName = 'NIPPON PAINT',
    token?: string
  ): Promise<{ id: string; url: string; title: string }> {
    let activeToken = token || this.getToken();
    if (!activeToken) {
      try {
        activeToken = await this.requestOAuthToken(false);
      } catch (authErr: any) {
        throw new Error('กรุณากดเชื่อมต่อบัญชี Google เพื่ออนุญาตการสร้างไฟล์สเปรดชีตใน Google Drive ของคุณ');
      }
    }

    const sheetPayload = {
      properties: {
        title: title || `${brandName} — ระบบบันทึกยอดขาย & รายงาน (Real-time)`,
      },
      sheets: [
        {
          properties: {
            title: 'Sales_Transactions',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.95, green: 0.25, blue: 0.35 },
          },
        },
        {
          properties: {
            title: 'Customers',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.23, green: 0.51, blue: 0.96 },
          },
        },
        {
          properties: {
            title: 'Products_Catalog',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.55, green: 0.36, blue: 0.96 },
          },
        },
        {
          properties: {
            title: 'Stock_Inventory',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.06, green: 0.73, blue: 0.51 },
          },
        },
        {
          properties: {
            title: 'Commission_Summary',
            gridProperties: { frozenRowCount: 1 },
            tabColor: { red: 0.96, green: 0.62, blue: 0.04 },
          },
        },
      ],
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sheetPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(`สร้างสเปรดชีตไม่สำเร็จ: ${err.error?.message || createRes.statusText}`);
    }

    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;

    // Populate headers in all 5 tabs
    const headersBatch = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: "'Sales_Transactions'!A1:R1",
          values: [[
            'Bill ID', 'วันที่', 'ชื่อสินค้า', 'แบรนด์', 'SKU', 'ขนาด', 'เบส', 'ฟิล์มสี', 'รหัสสี',
            'ราคาขาย', 'ค่าแม่สี', 'จำนวน', 'รวมเงิน', 'ลูกค้า', 'เบอร์โทร', 'พนักงานขาย', 'อีเมล', 'เวลาบันทึก'
          ]],
        },
        {
          range: "'Customers'!A1:I1",
          values: [[
            'รหัสลูกค้า', 'ชื่อ-นามสกุล / ชื่อช่าง', 'เบอร์โทรศัพท์', 'ประเภทลูกค้า', 'จำนวนครั้งที่ซื้อ',
            'ยอดซื้อสะสม (บาท)', 'ที่อยู่ / ไซต์งาน', 'หมายเหตุ', 'อัปเดตล่าสุด'
          ]],
        },
        {
          range: "'Products_Catalog'!A1:K1",
          values: [[
            'SKU', 'ชื่อผลิตภัณฑ์', 'แบรนด์', 'หมวดหมู่', 'ขนาดบรรจุ', 'เบส', 'ฟิล์มสี', 'รหัสสี', 'ราคาตั้ง (บาท)', 'ราคาขายต่ำสุด', 'อัปเดตล่าสุด'
          ]],
        },
        {
          range: "'Stock_Inventory'!A1:J1",
          values: [[
            'SKU', 'ชื่อสินค้า', 'ขนาด', 'เบส', 'ฟิล์มสี', 'สต็อกคงเหลือ (ถัง)', 'ยอดรับเข้าสะสม', 'ยอดขายสะสม', 'สถานะสต็อก', 'อัปเดตล่าสุด'
          ]],
        },
        {
          range: "'Commission_Summary'!A1:J1",
          values: [[
            'เดือน/ปี', 'พนักงานขาย', 'สาขา', 'เป้าหมายยอดขาย (บาท)', 'ยอดขายทำได้จริง (บาท)',
            'อัตราบรรลุเป้า (%)', 'เงินรางวัลรายแกลลอน (บาท)', 'ค่าคอมมิชชั่นยอดรวม (บาท)', 'รวมรายได้พิเศษ (บาท)', 'เวลาสรุป'
          ]],
        },
      ],
    };

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(headersBatch),
    });

    return {
      id: spreadsheetId,
      url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      title: created.properties?.title || title,
    };
  }

  // Get Spreadsheet metadata (Title & Tab Names)
  static async getSpreadsheetInfo(
    spreadsheetId: string,
    token?: string
  ): Promise<{ title: string; sheets: string[] }> {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      throw new Error('กรุณาเชื่อมต่อบัญชี Google');
    }
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    if (!cleanId) throw new Error('Spreadsheet ID ไม่ถูกต้อง');

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('เซสชัน Google หมดอายุ');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`ไม่พบสเปรดชีต: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      title: data.properties?.title || 'Google Sheet',
      sheets: (data.sheets || []).map((s: any) => s.properties?.title),
    };
  }

  // Ensure Sales_Transactions sheet exists in the target spreadsheet
  static async ensureSalesSheetExists(spreadsheetId: string, token?: string): Promise<void> {
    const activeToken = token || this.getToken();
    if (!activeToken) return;
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    if (!cleanId) return;

    try {
      const info = await this.getSpreadsheetInfo(cleanId, activeToken);
      if (!info.sheets.includes('Sales_Transactions')) {
        // Add tab
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Sales_Transactions',
                    gridProperties: { frozenRowCount: 1 },
                    tabColor: { red: 0.95, green: 0.25, blue: 0.35 },
                  },
                },
              },
            ],
          }),
        });

        // Add headers
        const headerData = {
          values: [[
            'Bill ID', 'วันที่', 'ชื่อสินค้า', 'แบรนด์', 'SKU', 'ขนาด', 'เบส', 'ฟิล์มสี', 'รหัสสี',
            'ราคาขาย', 'ค่าแม่สี', 'จำนวน', 'รวมเงิน', 'ลูกค้า', 'เบอร์โทร', 'พนักงานขาย', 'อีเมล', 'เวลาบันทึก'
          ]],
        };
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'Sales_Transactions'!A1:R1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(headerData),
        });
      }
    } catch (e) {
      console.warn('ensureSalesSheetExists warning:', e);
    }
  }

  // Append sales records to Google Sheet in Real-Time via Google Sheets API v4
  static async appendSalesToGoogleSheet(
    spreadsheetId: string,
    sales: any[],
    token?: string
  ): Promise<{ success: boolean; count: number; updatedRange?: string }> {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      throw new Error('กรุณาเชื่อมต่อบัญชี Google เพื่อส่งยอดขายแบบ Real-time');
    }
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    if (!cleanId) {
      throw new Error('กรุณาเลือกหรือระบุ Google Sheet ก่อนบันทึกยอด');
    }
    if (!sales || sales.length === 0) {
      return { success: true, count: 0 };
    }

    await this.ensureSalesSheetExists(cleanId, activeToken);

    const timestamp = new Date().toLocaleString('th-TH');
    const rows = sales.map((s) => [
      s.billId || '',
      s.date || '',
      s.productName || '',
      s.brand || 'NIPPON PAINT',
      s.sku || '',
      s.size || '',
      s.base || '-',
      s.filmColor || '-',
      s.colorCode || '-',
      Number(s.price) || 0,
      Number(s.tintPrice) || 0,
      Number(s.quantity) || 1,
      Number(s.total) || 0,
      s.customerName || 'ลูกค้าทั่วไป',
      s.customerPhone || '-',
      s.salesperson || '-',
      s.salespersonEmail || '-',
      timestamp,
    ]);

    const body = {
      range: "'Sales_Transactions'!A:R",
      majorDimension: 'ROWS',
      values: rows,
    };

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'Sales_Transactions'!A:R:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('Google OAuth Token หมดอายุ กรุณาเชื่อมต่อบัญชี Google ใหม่อีกครั้ง');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`บันทึกลง Google Sheet ไม่สำเร็จ: ${err.error?.message || res.statusText}`);
    }

    const result = await res.json();
    return {
      success: true,
      count: sales.length,
      updatedRange: result.updates?.updatedRange,
    };
  }

  // Fetch sales from Google Sheet to synchronize across multiple machines/devices
  static async fetchSalesFromGoogleSheet(spreadsheetId: string, token?: string): Promise<any[]> {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      throw new Error('กรุณาเชื่อมต่อบัญชี Google ก่อนดึงข้อมูล');
    }
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    if (!cleanId) {
      throw new Error('Spreadsheet ID ไม่ถูกต้อง');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'Sales_Transactions'!A2:R`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('Google OAuth Token หมดอายุ');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`ไม่สามารถดึงข้อมูลจากชีตได้: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const rows = data.values || [];

    return rows.map((r: any[], idx: number) => {
      const billId = r[0] || `SHEET-${idx + 1}`;
      const date = r[1] || new Date().toISOString().split('T')[0];
      const productName = r[2] || 'สี Nippon Paint';
      const brand = r[3] || 'NIPPON PAINT';
      const sku = r[4] || `SKU-${idx + 1}`;
      const size = r[5] || '5GL';
      const base = r[6] || 'A';
      const filmColor = r[7] || '-';
      const colorCode = r[8] || '-';
      const price = Number(r[9]) || 0;
      const tintPrice = Number(r[10]) || 0;
      const quantity = Number(r[11]) || 1;
      const total = Number(r[12]) || price * quantity + tintPrice * quantity;
      const customerName = r[13] || 'ลูกค้าทั่วไป';
      const customerPhone = r[14] || '-';
      const salesperson = r[15] || '-';
      const salespersonEmail = r[16] || '-';

      return {
        id: `sale-sheet-${billId}-${idx}`,
        billId,
        date,
        productId: `prod-${sku}`,
        productName,
        brand,
        sku,
        size,
        base: base === '-' ? undefined : base,
        filmColor: filmColor === '-' ? undefined : filmColor,
        colorCode: colorCode === '-' ? undefined : colorCode,
        price,
        tintPrice,
        quantity,
        total,
        customerName: customerName === 'ลูกค้าทั่วไป' ? undefined : customerName,
        customerPhone: customerPhone === '-' ? undefined : customerPhone,
        salesperson,
        salespersonEmail: salespersonEmail === '-' ? undefined : salespersonEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // Push sales to sheet with unified Real-Time Google Sheets API and Webhook fallback
  static async pushSalesToSheet(
    items: any[],
    options: { spreadsheetId?: string; webhookUrl?: string; spreadsheetTitle?: string }
  ): Promise<{ success: boolean; spreadsheetId?: string; url?: string }> {
    const token = this.getToken();
    const cleanSpreadsheetId = options.spreadsheetId ? this.extractSpreadsheetId(options.spreadsheetId) : '';

    // 1. Direct Real-Time Google Sheets API v4
    if (token && cleanSpreadsheetId) {
      await this.appendSalesToGoogleSheet(cleanSpreadsheetId, items, token);
      return {
        success: true,
        spreadsheetId: cleanSpreadsheetId,
        url: this.getSpreadsheetUrl(cleanSpreadsheetId),
      };
    }

    // 2. Google Apps Script Webhook fallback
    const webhook =
      options.webhookUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('nippon_google_sheet_webhook') : null);
    if (webhook) {
      await this.pushSalesViaWebhook(webhook, items);
      return {
        success: true,
        spreadsheetId: cleanSpreadsheetId || undefined,
        url: this.getSpreadsheetUrl(cleanSpreadsheetId || ''),
      };
    }

    if (cleanSpreadsheetId) {
      throw new Error('กรุณากด "เชื่อมต่อ Google (Google Sign-In)" เพื่อเปิดใช้งานระบบบันทึกยอดขายแบบ Real-time');
    }

    throw new Error('กรุณาเลือกหรือระบุ Google Sheet ในหน้าซิงค์ข้อมูลก่อนเริ่มลงยอด');
  }

  // Push catalog to sheet
  static async pushCatalogToSheet(items: any[], _title?: string): Promise<{ success: boolean; url?: string }> {
    const webhook = typeof window !== 'undefined' ? localStorage.getItem('nippon_google_sheet_webhook') : null;
    if (webhook) {
      await this.pushAllTabsViaWebhook(webhook, { catalog: items });
    }
    return { success: true };
  }

  // Export sales CSV/Excel
  static exportSalesCsv(sales: any[], filename = 'sales_export.csv'): void {
    const xlsxFilename = filename.endsWith('.csv') ? filename.replace('.csv', '.xlsx') : filename;
    this.exportMultiTabExcel({ sales }, xlsxFilename);
  }
}


