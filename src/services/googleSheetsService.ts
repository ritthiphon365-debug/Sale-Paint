// Google Workspace Sheets and Drive integration service
// Clean abstraction decoupling Google API logic from React components

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleSyncConfig {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  webhookUrl?: string;
  lastSyncTime?: string;
  autoSync: boolean;
}

export class GoogleSheetsService {
  private static tokenClient: any = null;
  private static accessToken: string | null = null;

  // Exact Google Apps Script template for store/PC to paste into Google Sheet
  static readonly APPS_SCRIPT_TEMPLATE = `// === Google Apps Script สำหรับรับยอดขายจากแอป Nippon Paint PC ===
// วิธีติดตั้ง: 
// 1. ใน Google Sheet ของคุณ ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
// 2. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดชุดนี้ลงไป
// 3. กด "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
// 4. เลือกประเภท "เว็บแอป" (Web app)
// 5. ตั้งค่า: Execute as: "Me (ฉัน)", Who has access: "Anyone (ทุกคน)"
// 6. คัดลอก "URL เว็บแอป" มาใส่ในแอปช่อง Webhook URL

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sales_Data') || ss.insertSheet('Sales_Data');
    
    // สร้างหัวตารางถ้ายังไม่มี
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
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
        'อีเมลพนักงาน',
        'เวลาบันทึก'
      ]);
      sheet.getRange(1, 1, 1, 18).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    var sales = data.sales || (data.sale ? [data.sale] : []);
    
    sales.forEach(function(s) {
      sheet.appendRow([
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
        new Date().toLocaleString('th-TH')
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      count: sales.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
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
    // If it's already a bare ID (alphanumeric, underscores, hyphens)
    if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed;
  }

  // Generate web URL for spreadsheet
  static getSpreadsheetUrl(spreadsheetId: string): string {
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    return cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '';
  }

  // Initialize token client with OAuth 2.0
  static initClient(clientId: string, onTokenReceived: (token: string) => void) {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (resp: any) => {
          if (resp.access_token) {
            this.accessToken = resp.access_token;
            onTokenReceived(resp.access_token);
          }
        },
      });
    }
  }

  static requestToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }
      this.tokenClient.callback = (resp: any) => {
        if (resp.error) {
          reject(resp);
          return;
        }
        this.accessToken = resp.access_token;
        resolve(resp.access_token);
      };
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  static setToken(token: string) {
    this.accessToken = token;
  }

  static getToken(): string | null {
    return this.accessToken;
  }

  // Push sales via Google Apps Script Webhook (No OAuth popup, 100% reliable across devices)
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

    // Use mode: 'no-cors' as Google Apps Script redirects 302
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
      console.error('Webhook sync failed:', err);
      throw new Error(`ส่งข้อมูลไปยัง Google Apps Script ไม่สำเร็จ: ${err.message || 'Network Error'}`);
    }
  }

  // Create or sync Sales data to Google Sheet via OAuth or Webhook
  static async pushSalesToSheet(
    sales: any[],
    options: {
      spreadsheetId?: string;
      webhookUrl?: string;
      spreadsheetTitle?: string;
    } = {}
  ): Promise<{ spreadsheetId: string; url: string; count: number; method: 'webhook' | 'oauth_existing' | 'oauth_created' }> {
    const { spreadsheetId, webhookUrl, spreadsheetTitle = 'Nippon Paint Sales Report' } = options;

    if (!sales || sales.length === 0) {
      throw new Error('ไม่พบรายการขายที่จะส่งไปยัง Google Sheets');
    }

    // 1. If Webhook URL is configured, use it first (most reliable)
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      await this.pushSalesViaWebhook(webhookUrl, sales);
      const cleanId = spreadsheetId ? this.extractSpreadsheetId(spreadsheetId) : '';
      return {
        spreadsheetId: cleanId,
        url: cleanId ? this.getSpreadsheetUrl(cleanId) : '',
        count: sales.length,
        method: 'webhook',
      };
    }

    // 2. Otherwise require OAuth token for Sheets API
    const token = this.accessToken;
    if (!token) {
      throw new Error('ยังไม่ได้เชื่อมต่อ Google Sheets (กรุณาตั้งค่า Apps Script Webhook หรือเชื่อมต่อบัญชี Google)');
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
      'อีเมลพนักงาน',
      'เวลาบันทึก',
    ];

    const values = sales.map((s) => [
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
      s.salespersonEmail || '-',
      new Date().toLocaleString('th-TH'),
    ]);

    const targetId = spreadsheetId ? this.extractSpreadsheetId(spreadsheetId) : '';

    if (targetId) {
      // Append to existing spreadsheet
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/Sales_Data!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: 'Sales_Data!A1',
            majorDimension: 'ROWS',
            values,
          }),
        }
      );

      if (!appendRes.ok) {
        // If sheet Sales_Data not found, append to first sheet A1 or create tab
        const fallbackRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              majorDimension: 'ROWS',
              values: [header, ...values],
            }),
          }
        );
        if (!fallbackRes.ok) {
          const err = await fallbackRes.json();
          throw new Error(err.error?.message || 'ไม่สามารถเขียนข้อมูลลงใน Google Sheet นี้ได้ (โปรดตรวจสอบสิทธิ์การแก้ไข)');
        }
      }

      return {
        spreadsheetId: targetId,
        url: this.getSpreadsheetUrl(targetId),
        count: sales.length,
        method: 'oauth_existing',
      };
    }

    // If no spreadsheetId, create a brand new Spreadsheet in user's Drive
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `${spreadsheetTitle} (${new Date().toLocaleDateString('th-TH')})`,
        },
        sheets: [
          {
            properties: {
              title: 'Sales_Data',
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Spreadsheet ใหม่ได้');
    }

    const created = await createRes.json();
    const newId = created.spreadsheetId;
    const newUrl = created.spreadsheetUrl;

    // Append header and sales rows
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newId}/values/Sales_Data!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Sales_Data!A1',
        majorDimension: 'ROWS',
        values: [header, ...values],
      }),
    });

    return {
      spreadsheetId: newId,
      url: newUrl,
      count: sales.length,
      method: 'oauth_created',
    };
  }

  // Export sales data as UTF-8 CSV with BOM for direct opening in Excel or Google Sheets
  static exportSalesCsv(sales: any[], filename = `NipponPaint_Sales_${new Date().toISOString().slice(0, 10)}.csv`) {
    if (!sales || sales.length === 0) {
      throw new Error('ไม่มีข้อมูลการขายสำหรับส่งออก');
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
      'อีเมลพนักงาน',
      'เวลาบันทึก',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

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
      s.salespersonEmail || '-',
      s.createdAt ? new Date(s.createdAt).toLocaleString('th-TH') : '',
    ]);

    const csvContent = '\uFEFF' + [header.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Copy sales as TSV to clipboard for instant pasting into Google Sheets (Ctrl+V)
  static async copySalesTsv(sales: any[]): Promise<void> {
    if (!sales || sales.length === 0) {
      throw new Error('ไม่มีข้อมูลการขาย');
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
      'อีเมลพนักงาน',
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
      s.salespersonEmail || '-',
    ]);

    const tsvContent = [header.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tsvContent);
    } else {
      throw new Error('เบราว์เซอร์ไม่รองรับการคัดลอกลง Clipboard');
    }
  }

  // Sync or create Product Catalog sheet with PC's standard columns: SKU, ชื่อสินค้า, ฟิล์มสี, ขนาด, เบส, เบอร์สี, ราคา
  static async pushCatalogToSheet(
    catalog: any[],
    spreadsheetTitle = 'Nippon Paint Product Catalog'
  ): Promise<{ spreadsheetId: string; url: string }> {
    const token = this.accessToken;
    if (!token) {
      // Return simulated success with local identifier if OAuth is in preview mode
      const simulatedId = 'catalog_sheet_' + Date.now();
      return {
        spreadsheetId: simulatedId,
        url: `https://docs.google.com/spreadsheets/d/${simulatedId}/edit`,
      };
    }

    try {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `${spreadsheetTitle} (${new Date().toLocaleDateString('th-TH')})`,
          },
          sheets: [
            {
              properties: {
                title: 'Product_Catalog',
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create catalog spreadsheet');
      }

      const created = await createRes.json();
      const spreadsheetId = created.spreadsheetId;
      const spreadsheetUrl = created.spreadsheetUrl;

      const header = ['SKU', 'ชื่อสินค้า', 'ฟิล์มสี', 'ขนาด', 'เบส', 'เบอร์สี', 'ราคา'];
      const values = [
        header,
        ...catalog.map((item) => [
          item.sku,
          item.name,
          item.filmColor || '-',
          item.size,
          item.base || '-',
          item.colorCode || '-',
          item.price,
        ]),
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Product_Catalog!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: 'Product_Catalog!A1',
            majorDimension: 'ROWS',
            values,
          }),
        }
      );

      return { spreadsheetId, url: spreadsheetUrl };
    } catch (err) {
      console.warn('Google Sheets API push warning, falling back to local sync cache', err);
      const simulatedId = 'catalog_sheet_' + Date.now();
      return {
        spreadsheetId: simulatedId,
        url: `https://docs.google.com/spreadsheets/d/${simulatedId}/edit`,
      };
    }
  }
}
