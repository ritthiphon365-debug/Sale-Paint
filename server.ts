import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { dualWriteSyncService } from './server/dualWriteSyncService';
import { gatewayRouter } from './server/gatewayRouter';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support larger payload sizes for store snapshot and sales sync
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount Phase 4 Cloudflare Worker / Supabase API Gateway Router
  app.use('/api/v1', gatewayRouter);

  // Snapshot file path for local persistence of the latest store state
  const SNAPSHOT_FILE = path.join(process.cwd(), '.store-snapshot.json');

  // In-memory store snapshot
  let storeSnapshot: any = {
    pcName: 'Ritthiphon Phromsorn',
    brand: 'NIPPON PAINT',
    branch: 'สาขาหลัก',
    sales: [],
    target: 350000,
    monthTotal: 0,
    progressPercent: 0,
    todayTotal: 0,
    todayBillCount: 0,
    todayItems: [],
    remainingToTarget: 350000,
    netCommission: 0,
    lastUpdated: new Date().toISOString(),
  };

  // Load persisted snapshot on startup if exists
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
      if (saved && typeof saved === 'object') {
        storeSnapshot = { ...storeSnapshot, ...saved };
      }
    }
  } catch (e) {
    console.warn('Could not load snapshot file:', e);
  }

  // Lazy-initialize Gemini API client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasSnapshot: Boolean(storeSnapshot.sales?.length),
      lastUpdated: storeSnapshot.lastUpdated,
      timestamp: new Date().toISOString(),
    });
  });

  // ==============================================================================
  // SALE PAINT — PHASE 3: DUAL-WRITE SYNCHRONIZATION API ENDPOINTS
  // Primary: Firebase Firestore | Secondary: Supabase PostgreSQL
  // ==============================================================================

  // 1. Dual-Write Receiver: Executes secondary write or enqueues if failed
  app.post('/api/sync/dual-write', async (req, res) => {
    try {
      const { operation, idempotencyKey, payload } = req.body;
      if (!operation || !idempotencyKey) {
        return res.status(400).json({ error: 'Missing required parameters (operation, idempotencyKey)' });
      }

      const result = await dualWriteSyncService.executeDualWrite(operation, idempotencyKey, payload);
      return res.json(result);
    } catch (err: any) {
      console.error('[API /api/sync/dual-write] Internal error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Dual-Write Health & Queue Status
  app.get('/api/sync/status', (req, res) => {
    const queueStats = dualWriteSyncService.getQueueStats();
    res.json({
      status: 'ok',
      architecture: 'PHASE 3 DUAL-WRITE',
      primary: 'Firebase Firestore',
      secondary: 'Supabase PostgreSQL',
      isLiveSupabaseConnected: dualWriteSyncService.isLiveConnected(),
      queueStats,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Inspect synchronization queue items
  app.get('/api/sync/queue', (req, res) => {
    const status = req.query.status as any;
    const items = dualWriteSyncService.getQueueItems(status);
    res.json({
      success: true,
      count: items.length,
      items,
    });
  });

  // 4. Manually trigger processing of the sync queue
  app.post('/api/sync/queue/process', async (req, res) => {
    try {
      const result = await dualWriteSyncService.processSyncQueue();
      res.json({
        success: true,
        summary: result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Reconcile Firestore source data with Supabase secondary data
  app.post('/api/sync/reconcile', async (req, res) => {
    try {
      const { firestoreData } = req.body;
      if (!firestoreData || typeof firestoreData !== 'object') {
        return res.status(400).json({ error: 'Missing firestoreData snapshot payload' });
      }

      const report = await dualWriteSyncService.reconcile(firestoreData);
      res.json({
        success: true,
        report,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Background queue processing interval: runs every 60 seconds
  setInterval(() => {
    dualWriteSyncService.processSyncQueue().catch((err) => {
      console.warn('[Background Queue Worker] Error:', err);
    });
  }, 60000);

  // 1. Sync live store snapshot from the store's computer to server
  app.post('/api/store/snapshot', (req, res) => {
    try {
      const data = req.body;
      if (data && typeof data === 'object') {
        storeSnapshot = {
          ...storeSnapshot,
          ...data,
          lastUpdated: new Date().toISOString(),
        };
        // Persist to file
        try {
          fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(storeSnapshot, null, 2));
        } catch (err) {
          console.warn('Failed to write snapshot file:', err);
        }
        return res.json({ success: true, updated: storeSnapshot.lastUpdated });
      }
      return res.status(400).json({ error: 'Invalid snapshot data' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get current store snapshot
  app.get('/api/store/snapshot', (req, res) => {
    res.json({ success: true, data: storeSnapshot });
  });

  // Thai Month Label Helper
  const thaiMonthNames: Record<string, string> = {
    '01': 'มกราคม', '02': 'กุมภาพันธ์', '03': 'มีนาคม', '04': 'เมษายน',
    '05': 'พฤษภาคม', '06': 'มิถุนายน', '07': 'กรกฎาคม', '08': 'สิงหาคม',
    '09': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม',
  };
  function getThaiMonthLabel(mStr: string) {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-');
    const mName = thaiMonthNames[m] || m;
    return `${mName} ${y}`;
  }

  // Helper: compute sales context for AI
  function computeStoreContext(customData?: any) {
    const data = customData || storeSnapshot;
    const sales: any[] = Array.isArray(data.sales) ? data.sales : [];
    const brand = data.brand || 'NIPPON PAINT';
    const pcName = data.pcName || 'พนักงาน PC';
    const branch = data.branch || 'สาขาหลัก';

    // Format local date today YYYY-MM-DD (Bangkok GMT+7)
    const now = new Date();
    const bkkDate = new Date(now.getTime() + 7 * 3600000);
    const todayStr = bkkDate.toISOString().slice(0, 10);
    const currentCalendarMonth = todayStr.slice(0, 7); // YYYY-MM

    // 1. All-time calculations across the entire database
    const allTimeTotal = Number(data.allTimeTotal ?? sales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0));
    const allTimeBillCount = Number(data.allTimeBillCount ?? new Set(sales.map((s: any) => s.billId || s.id)).size);

    // 2. Discover all months present in sales records and aggregate them
    const monthlyMap: Record<string, { total: number; billCount: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const d = s.date || s.createdAt;
      if (d && d.length >= 7) {
        const m = d.slice(0, 7);
        if (!monthlyMap[m]) {
          monthlyMap[m] = { total: 0, billCount: 0, sales: [] };
        }
        monthlyMap[m].total += Number(s.total) || 0;
        monthlyMap[m].sales.push(s);
      }
    });
    Object.keys(monthlyMap).forEach((m) => {
      monthlyMap[m].billCount = new Set(monthlyMap[m].sales.map((s) => s.billId || s.id)).size;
    });

    const recordedMonths = Object.keys(monthlyMap).sort().reverse();

    // 3. Find latest recorded sale in the database
    const sortedSales = [...sales].sort((a: any, b: any) => {
      const da = a.date || a.createdAt || '';
      const db = b.date || b.createdAt || '';
      return db.localeCompare(da);
    });
    const latestSale = data.latestSale || (sortedSales[0] ? {
      date: sortedSales[0].date || sortedSales[0].createdAt?.slice(0, 10),
      productName: sortedSales[0].productName || sortedSales[0].sku,
      total: Number(sortedSales[0].total) || 0,
      quantity: Number(sortedSales[0].quantity) || 1,
      billId: sortedSales[0].billId,
    } : null);

    // 4. Find active / focal month:
    // If client supplied activeMonth, use it; otherwise use newest month with sales, or current calendar month
    const activeMonth = data.activeMonth || recordedMonths[0] || currentCalendarMonth;
    const activeMonthLabel = getThaiMonthLabel(activeMonth);
    const activeMonthSales = monthlyMap[activeMonth]?.sales || [];
    const activeMonthTotal = Number(data.activeMonthTotal ?? monthlyMap[activeMonth]?.total ?? 0);
    const activeMonthBillCount = Number(data.activeMonthBillCount ?? monthlyMap[activeMonth]?.billCount ?? 0);

    // Target for the focal month
    const target = Number(data.target) || 350000;
    const progressPercent = target > 0 ? ((activeMonthTotal / target) * 100).toFixed(1) : '0.0';
    const remainingToTarget = Math.max(0, target - activeMonthTotal);

    // Today's sales (matching today's calendar date)
    const todaySales = sales.filter((s) => (s.date ? s.date === todayStr : s.createdAt?.startsWith(todayStr)));
    const todayTotal = Number(data.todayTotal ?? todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0));
    const todayBillCount = Number(data.todayBillCount ?? new Set(todaySales.map((s) => s.billId || s.id)).size);

    // Monthly breakdown text for AI and fallback
    const monthlyBreakdownText = recordedMonths.length > 0
      ? recordedMonths.map((m) => {
          const info = monthlyMap[m];
          return `  • ${getThaiMonthLabel(m)} (${m}): ยอดขาย ฿${info.total.toLocaleString()} บาท (${info.billCount} บิล)`;
        }).join('\n')
      : '  • ยังไม่มีประวัติยอดขายแยกรายเดือน';

    // Commission & Incentive Engine details
    const comm = data.commissionDetails || {};
    const grandTotalCommission = Number(comm.grandTotalCommission ?? data.netCommission ?? (Number(progressPercent) >= 80 ? Math.round(activeMonthTotal * 0.03) : 0));
    const mainCommission = Number(comm.mainCommission ?? (Number(progressPercent) >= 80 ? Math.round(activeMonthTotal * 0.03) : 0));
    const activeTierPercent = Number(comm.activeTierPercent ?? 0);
    const nextTier = comm.nextTier || null;
    const specialCommission = Number(comm.specialCommission ?? 0);
    const perHeadCommission = Number(comm.perHeadCommission ?? 0);
    const gallonIncentiveTotal = Number(comm.gallonIncentiveTotal ?? 0);
    const gallonIncentivePotentialTotal = Number(comm.gallonIncentivePotentialTotal ?? 0);
    const isGallonTargetUnlocked = Boolean(comm.isGallonTargetUnlocked ?? true);
    const globalTargetPercent = Number(comm.globalTargetPercent ?? 80);
    const gapToGallonUnlock = Number(comm.gapToGallonUnlock ?? 0);
    const ruleBreakdowns = Array.isArray(comm.ruleBreakdowns) ? comm.ruleBreakdowns : [];

    return {
      todayStr,
      currentCalendarMonth,
      allTimeTotal,
      allTimeBillCount,
      recordedMonths,
      monthlyMap,
      monthlyBreakdownText,
      latestSale,
      activeMonth,
      activeMonthLabel,
      activeMonthTotal,
      activeMonthBillCount,
      activeMonthSales,
      monthTotal: activeMonthTotal,
      monthBillCount: activeMonthBillCount,
      todaySales,
      todayTotal,
      todayBillCount,
      target,
      progressPercent,
      remainingToTarget,
      netCommission: grandTotalCommission,
      grandTotalCommission,
      mainCommission,
      activeTierPercent,
      nextTier,
      specialCommission,
      perHeadCommission,
      gallonIncentiveTotal,
      gallonIncentivePotentialTotal,
      isGallonTargetUnlocked,
      globalTargetPercent,
      gapToGallonUnlock,
      ruleBreakdowns,
      brand,
      pcName,
      branch,
    };
  }

  // 2. AI PC Sales Inquiry (Answers remote questions from PC employee at home)
  async function generateAiSalesAnswer(userQuery: string, customStoreData?: any): Promise<string> {
    const ctx = computeStoreContext(customStoreData);

    const nextTierGap = ctx.nextTier
      ? Math.max(0, Math.ceil((ctx.target * ctx.nextTier.achievementPercent) / 100) - ctx.activeMonthTotal)
      : 0;

    const latestSaleDesc = ctx.latestSale
      ? `วันที่ ${ctx.latestSale.date} - ${ctx.latestSale.productName} (ยอด ฿${(ctx.latestSale.total || 0).toLocaleString()} บาท)`
      : 'ยังไม่มีประวัติรายการขาย';

    const prompt = `คุณคือ "น้องบอท" ผู้ช่วย AI รายงานยอดขายและค่าคอมมิชชั่นของร้าน (${ctx.brand})
ตอบคำถามผ่าน LINE เกี่ยวกับยอดขาย ค่าคอมมิชชั่น และอินเซนทีฟ
ข้อสำคัญที่สุด:
- เรียกแทนตัวเองสั้นๆ ว่า "น้องบอท"
- ไม่ต้องใส่ชื่อพนักงาน PC และไม่ต้องพูดเรื่อง "PC อยู่บ้าน" หรือ "อยู่บ้าน"
- ตอบข้อมูลและตัวเลขที่ถามโดยตรง ชัดเจน กระชับ ทันที

ข้อมูลสรุปร้านค้าจริง 100% จากฐานข้อมูล:
- แบรนด์: ${ctx.brand}, สาขา: ${ctx.branch}
- วันที่ปัจจุบัน: ${ctx.todayStr} (ปฏิทินวันนี้)
- ยอดขายวันนี้ (${ctx.todayStr}): ${ctx.todayTotal.toLocaleString()} บาท (${ctx.todayBillCount} บิล)
  รายการขายวันนี้: ${
    ctx.todaySales.length > 0
      ? ctx.todaySales.map((s: any) => `${s.productName || s.sku} (${s.size || '1GL'}) x${s.quantity || 1} = ฿${s.total?.toLocaleString()}บ.`).join(', ')
      : 'วันนี้ยังไม่มีการลงบันทึกยอดขายใหม่เข้ามา'
  }
- บันทึกรายการขายล่าสุดในระบบ: ${latestSaleDesc}

💰 ยอดขายรวมทั้งหมดในระบบ (All-time Total):
- ยอดขายรวมทั้งหมดทุกเดือนที่บันทึกไว้: ฿${ctx.allTimeTotal.toLocaleString()} บาท (ทั้งหมด ${ctx.allTimeBillCount} บิล)
- ยอดขายแยกตามแต่ละเดือนที่มีการบันทึก:
${ctx.monthlyBreakdownText}

🎯 ข้อมูลเดือนล่าสุด/เดือนที่กำลังดู (${ctx.activeMonthLabel} / ${ctx.activeMonth}):
- ยอดขายสะสมของเดือนนี้: ฿${ctx.activeMonthTotal.toLocaleString()} บาท (${ctx.activeMonthBillCount} บิล)
- เป้าหมายยอดขายเดือนนี้: ฿${ctx.target.toLocaleString()} บาท
- ความคืบหน้า: ${ctx.progressPercent}% ของเป้าหมาย
- ขาดยอดอีกเพื่อถึงเป้า 100%: ${ctx.remainingToTarget > 0 ? `฿${ctx.remainingToTarget.toLocaleString()} บาท` : 'ยินดีด้วย! ทำยอดทะลุเป้าหมาย 100% แล้ว 🎉'}

💵 ข้อมูลค่าคอมมิชชั่น & เงินรางวัลอินเซนทีฟ (ของเดือน ${ctx.activeMonthLabel}):
- รวมคอมมิชชั่น + อินเซนทีฟสุทธิ: ฿${ctx.grandTotalCommission.toLocaleString()} บาท
- 1. ขั้นบันไดผลงาน Tier (Main Commission): ฿${ctx.mainCommission.toLocaleString()} บาท (ที่ระดับผลงาน ${ctx.activeTierPercent}%)
  ${
    ctx.nextTier
      ? `ขั้นบันไดถัดไป: ทำยอดให้ถึง ${ctx.nextTier.achievementPercent}% จะได้รับ ฿${ctx.nextTier.rewardAmount.toLocaleString()} บาท (ยังขาดอีก ฿${nextTierGap.toLocaleString()} บาท)`
      : 'บรรลุขั้นบันไดสูงสุดแล้ว 🎉'
  }
- 2. เงินรางวัลพิเศษรายชิ้น/แกลลอน (Gallon Incentives): ฿${ctx.gallonIncentiveTotal.toLocaleString()} บาท
  สถานะปลดล็อกอินเซนทีฟถัง: ${
    ctx.isGallonTargetUnlocked
      ? `✅ ปลดล็อกแล้ว (ผ่านเกณฑ์ขั้นต่ำ ${ctx.globalTargetPercent}% ของเป้าหมาย)`
      : `⏳ ยังไม่ปลดล็อก (ต้องได้ยอดขายรวม ${ctx.globalTargetPercent}% ของเป้า ขาดยอดอีก ฿${ctx.gapToGallonUnlock.toLocaleString()} บาท เพื่อปลดล็อกเงินสะสม ฿${ctx.gallonIncentivePotentialTotal.toLocaleString()})`
  }
  ${
    ctx.ruleBreakdowns.length > 0
      ? `รายการสินค้าอินเซนทีฟ: ${ctx.ruleBreakdowns
          .slice(0, 4)
          .map((r: any) => `${r.productName || r.ruleName}: ขายได้ ${r.matchedQuantity || 0} ถัง (ได้ ฿${(r.earnedAmount || 0).toLocaleString()})`)
          .join(', ')}`
      : ''
  }
- 3. โบนัสพิเศษ Special Band: ฿${ctx.specialCommission.toLocaleString()} บาท
- 4. เงินรางวัลต่อพนักงาน Per Head: ฿${ctx.perHeadCommission.toLocaleString()} บาท

คำถามของพนักงาน PC: "${userQuery}"

กฎการตอบ (สำคัญที่สุด):
1. ตอบด้วยภาษาไทยที่สุภาพ อบอุ่น เป็นกันเอง ชัดเจน ตรงประเด็น และมีพลังบวก ให้กำลังใจ PC เสมอ
2. ใช้ตัวเลขจริงจากข้อมูลด้านบนอย่างถูกต้อง 100% ห้ามเดาสุ่มหรือคิดเลขผิด
   - ถ้าถาม "ยอดรวมตอนนี้เท่าไหร่", "ยอดรวม": ให้ตอบ "ยอดขายรวมทั้งหมดในระบบ: ฿${ctx.allTimeTotal.toLocaleString()} บาท" พร้อมแจกแจงยอดขายแยกรายเดือน (${ctx.recordedMonths.map((m) => `${getThaiMonthLabel(m)}: ฿${(ctx.monthlyMap[m]?.total || 0).toLocaleString()}`).join(', ')}) และยอดเดือนล่าสุดอย่างชัดเจน เพื่อให้ตรงกับหน้าจอคอมของร้าน 100%!
   - ถ้าถาม "วันนี้ได้มีมาลงยอดขายเท่าไหร่", "ยอดวันนี้": ถ้าวันนี้ (${ctx.todayStr}) ยังไม่มีรายการ (0 บาท) ให้ชี้แจงอย่างชัดเจนว่า "วันนี้ยังไม่มีรายการขายใหม่บันทึกเข้ามา แต่ยอดขายล่าสุดที่บันทึกไว้คือวันที่ ${ctx.latestSale ? ctx.latestSale.date : 'ล่าสุด'} (ยอด ฿${(ctx.latestSale?.total || 0).toLocaleString()} บ.) และยอดสะสมเดือน ${ctx.activeMonthLabel} อยู่ที่ ฿${ctx.activeMonthTotal.toLocaleString()} บาท"
   - ถ้าถามเรื่อง "ค่าคอมมิชชั่น", "อินเซนทีฟ", "ได้เงินเท่าไหร่", "สรุปคอม": แจ้งยอดรวมสุทธิ ฿${ctx.grandTotalCommission.toLocaleString()} ของเดือน ${ctx.activeMonthLabel} และแยกแจกแจงค่าคอมขั้นบันได + อินเซนทีฟรายชิ้น พร้อมสถานะปลดล็อก
   - ถ้าถามเรื่อง "ปลดล็อกแกลลอนหรือยัง", "เกณฑ์ %": ตอบสถานะปลดล็อกชัดเจน บอกยอดที่ยังขาด และเงินสะสมที่จะได้รับเมื่อปลดล็อก
   - ถ้าถามเรื่อง "ทำยังไงให้ได้เงินเพิ่ม", "วิธีเร่งคอม", "Tier ถัดไป": แนะนำจำนวนเงินที่ต้องขายเพิ่มเพื่อขยับ Tier ถัดไป และแนะนำให้ดันสินค้าที่มีอินเซนทีฟรายถังสูง (เช่น Weatherbond) เพื่อได้เงินสองต่อ
3. จัดรูปแบบข้อความให้อ่านง่าย สบายตา เหมาะสำหรับอ่านใน LINE (ใช้ Emoji เช่น 🎯, 💰, 📦, 📊, ✨, 👏 และเว้นบรรทัดให้อ่านง่าย)
4. ตอบเนื้อหาและตัวเลขทันที ไม่ต้องเกริ่นอารัมภบทยาวเกินไป`;

    const client = getGeminiClient();
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];

    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });
        const text = response.text?.trim();
        if (text) return text;
      } catch (geminiErr) {
        console.warn(`Model ${modelName} failed, trying next:`, geminiErr);
      }
    }

    // Deterministic fallback response with 100% accurate store numbers if all models are busy
    const q = userQuery.toLowerCase();
    if (q.includes('วันนี้')) {
      if (ctx.todayTotal > 0) {
        return `รายงานยอดขายวันนี้ครับ 💰✨\n\n` +
          `📅 วันที่: ${ctx.todayStr}\n` +
          `💵 ยอดขายวันนี้: ฿${ctx.todayTotal.toLocaleString()} บาท (${ctx.todayBillCount} บิล)\n` +
          `📦 สินค้าที่ขายได้วันนี้: ${ctx.todaySales.length > 0 ? ctx.todaySales.map((s: any) => `${s.productName || s.sku} x${s.quantity}`).join(', ') : 'ไม่มี'}\n\n` +
          `📊 ยอดสะสมเดือน ${ctx.activeMonthLabel}: ฿${ctx.activeMonthTotal.toLocaleString()} บาท\n` +
          `💰 ยอดรวมทุกเดือนในระบบ: ฿${ctx.allTimeTotal.toLocaleString()} บาท\n\n` +
          `👏 เป็นกำลังใจให้ครับ ยอดปังๆ แน่นอน!`;
      } else {
        const latestInfo = ctx.latestSale
          ? `🕒 รายการขายล่าสุดในระบบ: วันที่ ${ctx.latestSale.date} สินค้า "${ctx.latestSale.productName}" (ยอด ฿${(ctx.latestSale.total || 0).toLocaleString()} บาท)\n`
          : '';
        return `รายงานยอดขายวันนี้ครับ 📅✨\n\n` +
          `📅 วันที่: ${ctx.todayStr} (วันนี้ยังไม่มีการลงบันทึกรายการขายใหม่เข้ามา)\n` +
          latestInfo +
          `\n📊 ยอดขายสะสมเดือนล่าสุด (${ctx.activeMonthLabel}): ฿${ctx.activeMonthTotal.toLocaleString()} บาท (${ctx.activeMonthBillCount} บิล)\n` +
          `💰 ยอดขายรวมทั้งหมดในระบบ: ฿${ctx.allTimeTotal.toLocaleString()} บาท (${ctx.allTimeBillCount} บิล)\n\n` +
          `👏 สอบถามข้อมูลยอดขายกับน้องบอทได้ตลอด 24 ชม. ครับ!`;
      }
    }

    if (q.includes('รวม') || q.includes('ทั้งหมด') || (q.includes('เท่าไหร่') && !q.includes('ขาด') && !q.includes('คอม'))) {
      return `📊 น้องบอทสรุปยอดขายรวมในระบบครับ 💰✨\n\n` +
        `💰 ยอดขายรวมทั้งหมดในระบบ (All-time): ฿${ctx.allTimeTotal.toLocaleString()} บาท (รวม ${ctx.allTimeBillCount} บิล)\n\n` +
        `📅 ยอดขายแยกตามแต่ละเดือน:\n` +
        `${ctx.monthlyBreakdownText}\n\n` +
        `🎯 เดือนล่าสุด/ที่กำลังดู (${ctx.activeMonthLabel}): ฿${ctx.activeMonthTotal.toLocaleString()} บาท (${ctx.progressPercent}% ของเป้า ฿${ctx.target.toLocaleString()})\n` +
        `💵 รวมค่าคอมมิชชั่น + อินเซนทีฟเดือนนี้: ฿${ctx.grandTotalCommission.toLocaleString()} บาท`;
    }

    if (q.includes('กี่%') || q.includes('%')) {
      return `ความคืบหน้าเป้าหมายเดือน ${ctx.activeMonthLabel} ครับ 🎯📊\n\n` +
        `📈 ทำยอดไปแล้ว: ${ctx.progressPercent}% ของเป้าหมาย\n` +
        `💰 ยอดขายสะสมเดือนนี้: ฿${ctx.activeMonthTotal.toLocaleString()} บาท (เป้า ฿${ctx.target.toLocaleString()} บ.)\n` +
        `⏳ ขาดยอดอีก: ${ctx.remainingToTarget > 0 ? `฿${ctx.remainingToTarget.toLocaleString()} บาท` : 'ยินดีด้วยครับ ทะลุเป้าหมาย 100% แล้ว! 🎉'}\n\n` +
        `สู้ๆ ครับ ใกล้ถึงเป้าแล้ว! ✨`;
    }

    if (q.includes('ปลดล็อก') || q.includes('อินเซนทีฟ') || q.includes('แกลลอน') || q.includes('ถัง')) {
      const unlockText = ctx.isGallonTargetUnlocked
        ? `✅ ปลดล็อกเงินรางวัลรายถังแล้ว! (ยอดปัจจุบัน ${ctx.progressPercent}% ผ่านเกณฑ์ ${ctx.globalTargetPercent}% แล้ว)`
        : `⏳ ยังไม่ปลดล็อกเงินรางวัลรายถังครับ (เกณฑ์ขั้นต่ำ ${ctx.globalTargetPercent}% ขาดยอดอีก ฿${ctx.gapToGallonUnlock.toLocaleString()} บาท จะได้รับเงินสะสม ฿${ctx.gallonIncentivePotentialTotal.toLocaleString()})`;

      return `🎯 สถานะเงินรางวัลอินเซนทีฟรายชิ้นครับ:\n\n` +
        `📦 รางวัลพิเศษที่ได้รับตอนนี้: ฿${ctx.gallonIncentiveTotal.toLocaleString()} บาท\n` +
        `🔒 สถานะเกณฑ์ปลดล็อก: ${unlockText}\n` +
        (ctx.ruleBreakdowns.length > 0
          ? `\n📋 รายการสินค้าอินเซนทีฟ:\n` +
            ctx.ruleBreakdowns.slice(0, 4).map((r: any) => `• ${r.productName || r.ruleName}: ขายแล้ว ${r.matchedQuantity || 0} ถัง (ได้ ฿${(r.earnedAmount || 0).toLocaleString()})`).join('\n')
          : '') +
        `\n\n💪 ดันยอดสินค้าไฮไลท์เพิ่มเพื่อรับเงินรางวัลพิเศษได้เลยครับ!`;
    }

    if (q.includes('ขาด') || q.includes('คอม') || q.includes('ได้เงิน') || q.includes('รายได้')) {
      const nextTierStr = ctx.nextTier
        ? `\n🚀 ขั้นบันไดถัดไป: ทำยอดถึง ${ctx.nextTier.achievementPercent}% จะได้ ฿${ctx.nextTier.rewardAmount.toLocaleString()} (ขาดอีก ฿${nextTierGap.toLocaleString()} บ.)`
        : '\n🎉 ยินดีด้วยครับ! บรรลุขั้นบันไดสูงสุดแล้ว';

      return `สถานะยอดขายและค่าคอมมิชชั่นเดือน ${ctx.activeMonthLabel} ครับ 💵🎯\n\n` +
        `💰 รวมคอมมิชชั่น + อินเซนทีฟสุทธิ: ฿${ctx.grandTotalCommission.toLocaleString()} บาท\n` +
        `  1. บันไดผลงาน Tier: ฿${ctx.mainCommission.toLocaleString()} บาท (ระดับ ${ctx.activeTierPercent}%)\n` +
        `  2. รางวัลรายถัง (Incentive): ฿${ctx.gallonIncentiveTotal.toLocaleString()} บาท ${ctx.isGallonTargetUnlocked ? '(ปลดล็อกแล้ว ✅)' : '(รอปลดล็อก ⏳)'}\n` +
        (ctx.specialCommission > 0 ? `  3. โบนัสพิเศษ: ฿${ctx.specialCommission.toLocaleString()} บาท\n` : '') +
        `\n📊 ยอดขายสะสมเดือนนี้: ฿${ctx.activeMonthTotal.toLocaleString()} บาท (${ctx.progressPercent}% ของเป้า ฿${ctx.target.toLocaleString()})\n` +
        `⏳ ขาดยอดอีกเพื่อถึงเป้า 100%: ${ctx.remainingToTarget > 0 ? `฿${ctx.remainingToTarget.toLocaleString()} บาท` : 'ทะลุเป้า 100% แล้ว!'}` +
        nextTierStr +
        `\n\nอีกนิดเดียวก็ได้ค่าคอมเพิ่มแล้ว สู้ๆ ครับ! 👏✨`;
    }

    if (q.includes('วิธี') || q.includes('เพิ่ม') || q.includes('กลยุทธ์') || q.includes('แนะนำ')) {
      return `💡 น้องบอทแนะนำกลยุทธ์ทำเงินเพิ่มเดือน ${ctx.activeMonthLabel} ครับ:\n\n` +
        (ctx.nextTier
          ? `1️⃣ เร่งยอดให้ถึง Tier ${ctx.nextTier.achievementPercent}%: ขาดยอดอีก ฿${nextTierGap.toLocaleString()} บาท จะได้เงินก้อนเพิ่มเป็น ฿${ctx.nextTier.rewardAmount.toLocaleString()} บาท!\n`
          : `1️⃣ รักษายอดขายต่อเนื่องเพื่อคว้าโบนัสพิเศษช่วงยอดขาย!\n`) +
        (!ctx.isGallonTargetUnlocked && ctx.gapToGallonUnlock > 0
          ? `2️⃣ ปลดล็อกเงินรางวัลรายถัง: ขายเพิ่มอีก ฿${ctx.gapToGallonUnlock.toLocaleString()} บาท จะปลดล็อกเงินก้อน ฿${ctx.gallonIncentivePotentialTotal.toLocaleString()} ทันที!\n`
          : `2️⃣ ดันสินค้ากลุ่มพรีเมียม (เช่น Weatherbond) ที่มีเงินรางวัลรายถัง 50฿/ถัง เพื่อรับเงินเพิ่มสองต่อ!\n`) +
        `\n🌟 เป็นกำลังใจให้ครับ ปิดยอดสวยๆ แน่นอน!`;
    }

    return `📊 น้องบอทสรุปภาพรวมยอดขายล่าสุดครับ:\n\n` +
      `💰 ยอดขายรวมทั้งหมดในระบบ: ฿${ctx.allTimeTotal.toLocaleString()} บาท (${ctx.allTimeBillCount} บิล)\n` +
      `🎯 เดือนล่าสุด (${ctx.activeMonthLabel}): ฿${ctx.activeMonthTotal.toLocaleString()} บาท (${ctx.progressPercent}% ของเป้า ฿${ctx.target.toLocaleString()})\n` +
      `💵 รวมค่าคอมมิชชั่นเดือนนี้: ฿${ctx.grandTotalCommission.toLocaleString()} บาท\n` +
      (ctx.latestSale ? `🕒 บันทึกรายการล่าสุด: วันที่ ${ctx.latestSale.date} (${ctx.latestSale.productName})` : '');
  }

  // API endpoint for PC Sales Inquiry
  app.post('/api/gemini/pc-inquiry', async (req, res) => {
    try {
      const { query, storeData } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string is required' });
      }

      // If storeData is provided in request, update snapshot
      if (storeData && typeof storeData === 'object') {
        storeSnapshot = { ...storeSnapshot, ...storeData, lastUpdated: new Date().toISOString() };
      }

      const answer = await generateAiSalesAnswer(query, storeData);
      const metrics = computeStoreContext(storeData);

      return res.json({
        success: true,
        answer,
        metrics: {
          todayTotal: metrics.todayTotal,
          todayBillCount: metrics.todayBillCount,
          monthTotal: metrics.monthTotal,
          target: metrics.target,
          progressPercent: metrics.progressPercent,
          remainingToTarget: metrics.remainingToTarget,
          netCommission: metrics.netCommission,
        },
      });
    } catch (err: any) {
      console.error('Gemini PC Inquiry error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to process inquiry',
      });
    }
  });

  // 3. Official LINE Messaging API Webhook
  // When PC sends a message in LINE to the LINE Official Account
  app.post('/api/line/webhook', async (req, res) => {
    try {
      const events = req.body?.events;
      if (!events || !Array.isArray(events)) {
        // Verification challenge or health ping
        return res.status(200).send('OK');
      }

      const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

      for (const event of events) {
        if (event.type === 'message' && event.message?.type === 'text') {
          const userText = event.message.text;
          const replyToken = event.replyToken;

          console.log(`Received LINE Bot message from user: "${userText}"`);

          // Process inquiry with Gemini and current store snapshot
          let replyMessageText = '';
          try {
            replyMessageText = await generateAiSalesAnswer(userText);
          } catch (aiErr: any) {
            console.error('Error generating AI answer for LINE webhook:', aiErr);
            const ctx = computeStoreContext();
            replyMessageText = `📊 สรุปยอดขายล่าสุด (${ctx.todayStr}):\n` +
              `💰 ยอดขายวันนี้: ${ctx.todayTotal.toLocaleString()} บาท (${ctx.todayBillCount} บิล)\n` +
              `📈 ยอดสะสมเดือนนี้: ${ctx.monthTotal.toLocaleString()} บาท\n` +
              `🎯 ความคืบหน้า: ${ctx.progressPercent}% ของเป้าหมาย (${ctx.target.toLocaleString()} บ.)\n` +
              `⏳ ขาดยอดอีก: ${ctx.remainingToTarget > 0 ? `${ctx.remainingToTarget.toLocaleString()} บาท` : 'ทะลุเป้าแล้ว! 🎉'}\n` +
              `💵 คอมมิชชั่นสะสม: ${ctx.netCommission.toLocaleString()} บาท`;
          }

          // If LINE_CHANNEL_ACCESS_TOKEN is configured, reply to user via LINE Messaging API
          if (channelAccessToken && replyToken) {
            try {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${channelAccessToken}`,
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [
                    {
                      type: 'text',
                      text: replyMessageText,
                    },
                  ],
                }),
              });
            } catch (lineErr) {
              console.error('Failed to reply to LINE API:', lineErr);
            }
          }
        }
      }

      return res.status(200).json({ status: 'success' });
    } catch (err: any) {
      console.error('LINE webhook handling error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
