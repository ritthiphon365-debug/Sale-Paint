import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  RefreshCw,
  MessageCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC = () => {
  const {
    modalOpen,
    setModalOpen,
    sales,
    brandSettings,
    yearTargets,
    computedCommission,
    userSession,
    showToast,
    activeMonth,
    setActiveMonth,
    availableMonths,
    allTimeSalesTotal,
    allTimeSalesCount,
  } = useApp();

  const isOpen = modalOpen === 'ai-assistant';
  const [activeTab, setActiveTab] = useState<'chat' | 'setup'>('chat');

  // Input & Chat messages
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Calculate live store numbers for display & inquiry
  const now = new Date();
  const todayStr = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);

  // Today sales
  const todaySales = sales.filter((s) => (s.date ? s.date === todayStr : s.createdAt?.startsWith(todayStr)));
  const todayTotal = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const todayBillCount = new Set(todaySales.map((s) => s.billId || s.id)).size;

  // Active month numbers from computedCommission
  const monthTotal = computedCommission.totalSalesAmount || 0;
  const targetAmount = computedCommission.target || 350000;
  const progressPercent = computedCommission.achievementPercent ? computedCommission.achievementPercent.toFixed(1) : '0.0';
  const remainingToTarget = Math.max(0, targetAmount - monthTotal);

  // Latest sale recorded
  const sortedSales = [...sales].sort((a, b) => {
    const da = a.date || a.createdAt || '';
    const db = b.date || b.createdAt || '';
    return db.localeCompare(da);
  });
  const latestSale = sortedSales[0]
    ? {
        date: sortedSales[0].date || sortedSales[0].createdAt?.slice(0, 10),
        productName: sortedSales[0].productName || sortedSales[0].sku,
        total: Number(sortedSales[0].total) || 0,
        quantity: Number(sortedSales[0].quantity) || 1,
        billId: sortedSales[0].billId,
      }
    : null;

  // Monthly breakdown map
  const monthlySummary: Record<string, { total: number; billCount: number }> = {};
  sales.forEach((s) => {
    const d = s.date || s.createdAt;
    if (d && d.length >= 7) {
      const m = d.slice(0, 7);
      if (!monthlySummary[m]) {
        monthlySummary[m] = { total: 0, billCount: 0 };
      }
      monthlySummary[m].total += Number(s.total) || 0;
    }
  });
  Object.keys(monthlySummary).forEach((m) => {
    const mSales = sales.filter((s) => (s.date || s.createdAt || '').startsWith(m));
    monthlySummary[m].billCount = new Set(mSales.map((s) => s.billId || s.id)).size;
  });

  // Initial welcome message from bot
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `สวัสดีครับ! น้องบอทยินดีให้บริการครับ 🤖✨\n\nพร้อมรายงานยอดขายและสรุปค่าคอมมิชชั่นแบบเรียลไทม์\nสามารถพิมพ์ถามหรือกดเลือกคำถามด่วนด้านล่างนี้ได้ตลอด 24 ชม. เลยครับ! 👇`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Handle sending a query to AI PC sales assistant
  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const sanitizedSales = sales.slice(-300).map((s) => ({
        id: s.id,
        billId: s.billId,
        date: s.date,
        createdAt: s.createdAt,
        total: s.total,
        productName: s.productName,
        sku: s.sku,
        size: s.size,
        quantity: s.quantity,
      }));

      const commissionDetails = {
        grandTotalCommission: computedCommission.grandTotalCommission || 0,
        mainCommission: computedCommission.mainCommission || 0,
        activeTierPercent: computedCommission.activeTierPercent || 0,
        nextTier: computedCommission.nextTier || null,
        specialCommission: computedCommission.specialCommission || 0,
        perHeadCommission: computedCommission.perHeadCommission || 0,
        gallonIncentiveTotal: computedCommission.gallonIncentiveTotal || 0,
        gallonIncentivePotentialTotal: computedCommission.gallonIncentivePotentialTotal || 0,
        isGallonTargetUnlocked: computedCommission.isGallonTargetUnlocked,
        globalTargetPercent: computedCommission.globalTargetPercent,
        gapToGallonUnlock: computedCommission.gapToGallonUnlock,
        ruleBreakdowns: (computedCommission.ruleBreakdowns || []).slice(0, 8).map((r) => ({
          ruleName: r.ruleName,
          productName: r.productName,
          rewardRate: r.rewardRate,
          matchedQuantity: r.matchedQuantity,
          earnedAmount: r.earnedAmount,
          potentialAmount: r.potentialAmount,
          isQualified: r.isQualified,
          targetGateMessage: r.targetGateMessage,
        })),
      };

      const storeDataPayload = {
        pcName: userSession.name,
        brand: brandSettings.brandName,
        branch: brandSettings.branch,
        sales: sanitizedSales,
        allTimeTotal: allTimeSalesTotal,
        allTimeBillCount: allTimeSalesCount,
        activeMonth,
        activeMonthTotal: monthTotal,
        activeMonthBillCount: computedCommission.monthBillCount || 0,
        monthlySummary,
        latestSale,
        target: targetAmount,
        monthTotal,
        progressPercent: Number(progressPercent),
        todayTotal,
        todayBillCount,
        todaySales: todaySales.map((s) => ({
          productName: s.productName,
          sku: s.sku,
          quantity: s.quantity,
          size: s.size,
          total: s.total,
        })),
        remainingToTarget,
        netCommission: computedCommission.grandTotalCommission || 0,
        commissionDetails,
      };

      const res = await fetch('/api/gemini/pc-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          storeData: storeDataPayload,
        }),
      });

      const json = await res.json();
      if (json.success && json.answer) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: json.answer,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(json.error || 'ไม่ได้รับคำตอบจากระบบ AI');
      }
    } catch (err: any) {
      // Fallback response with exact calculated numbers matching AppContext
      const unlockText = computedCommission.isGallonTargetUnlocked
        ? '✅ ปลดล็อกแล้ว'
        : `⏳ ขาดอีก ฿${computedCommission.gapToGallonUnlock?.toLocaleString()} เพื่อปลดล็อก ฿${computedCommission.gallonIncentivePotentialTotal?.toLocaleString()}`;

      const fallbackMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `📊 น้องบอทสรุปยอดขายและค่าคอมมิชชั่นล่าสุดครับ:\n\n` +
          `💰 ยอดขายรวมทั้งหมดในระบบ: ฿${allTimeSalesTotal.toLocaleString()} บาท (${allTimeSalesCount} บิล)\n\n` +
          `🎯 ยอดขายเดือนที่กำลังดู (${activeMonth}): ฿${monthTotal.toLocaleString()} บาท (${progressPercent}% ของเป้า ฿${targetAmount.toLocaleString()})\n` +
          `💵 รวมคอมมิชชั่น + อินเซนทีฟสุทธิ: ฿${(computedCommission.grandTotalCommission || 0).toLocaleString()} บาท\n` +
          `  • บันไดผลงาน Tier: ฿${(computedCommission.mainCommission || 0).toLocaleString()} บาท (ระดับ ${computedCommission.activeTierPercent || 0}%)\n` +
          `  • รางวัลพิเศษรายถัง: ฿${(computedCommission.gallonIncentiveTotal || 0).toLocaleString()} บาท (${unlockText})\n\n` +
          (todayTotal > 0
            ? `📅 ยอดขายวันนี้: ฿${todayTotal.toLocaleString()} บาท (${todayBillCount} บิล)`
            : `📅 ยอดขายวันนี้: ยังไม่มีรายการใหม่ (ล่าสุดในระบบวันที่ ${latestSale ? latestSale.date : 'ล่าสุด'})`),
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt buttons as requested by user
  const quickPrompts = [
    { label: '📊 ยอดรวมในระบบตอนนี้เท่าไหร่', query: 'ยอดขายรวมตอนนี้เท่าไหร่และกี่% แล้ว' },
    { label: '💰 สรุปคอมมิชชั่น + อินเซนทีฟเดือนนี้', query: 'สรุปค่าคอมมิชชั่นและอินเซนทีฟทั้งหมดที่ได้รับเดือนนี้ให้หน่อย' },
    { label: '🎯 ปลดล็อกเงินรางวัลถังหรือยัง', query: 'ปลดล็อกเงินรางวัลอินเซนทีฟรายแกลลอนหรือยัง ขาดยอดอีกกี่บาท' },
    { label: '🚀 วิธีทำเงินเพิ่มให้ถึง Tier ถัดไป', query: 'แนะนำวิธีทำเงินคอมมิชชั่นเพิ่มหน่อย ต้องขายอีกกี่บาทถึงจะได้ Tier ถัดไป และควรเน้นสินค้าไหน' },
    { label: '📅 วันนี้ได้ยอดขายเท่าไหร่', query: 'วันนี้ได้มีมาลงยอดขายเท่าไหร่' },
  ];

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('คัดลอกข้อความแล้ว', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : '/api/line/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showToast('คัดลอก LINE Webhook URL แล้ว', 'success');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleManualSyncSnapshot = async () => {
    try {
      const sanitizedSales = sales.slice(-300).map((s) => ({
        id: s.id,
        billId: s.billId,
        date: s.date,
        createdAt: s.createdAt,
        total: s.total,
        productName: s.productName,
        sku: s.sku,
        size: s.size,
        quantity: s.quantity,
      }));

      const commissionDetails = {
        grandTotalCommission: computedCommission.grandTotalCommission || 0,
        mainCommission: computedCommission.mainCommission || 0,
        activeTierPercent: computedCommission.activeTierPercent || 0,
        nextTier: computedCommission.nextTier || null,
        specialCommission: computedCommission.specialCommission || 0,
        perHeadCommission: computedCommission.perHeadCommission || 0,
        gallonIncentiveTotal: computedCommission.gallonIncentiveTotal || 0,
        gallonIncentivePotentialTotal: computedCommission.gallonIncentivePotentialTotal || 0,
        isGallonTargetUnlocked: computedCommission.isGallonTargetUnlocked,
        globalTargetPercent: computedCommission.globalTargetPercent,
        gapToGallonUnlock: computedCommission.gapToGallonUnlock,
        ruleBreakdowns: (computedCommission.ruleBreakdowns || []).slice(0, 8).map((r) => ({
          ruleName: r.ruleName,
          productName: r.productName,
          rewardRate: r.rewardRate,
          matchedQuantity: r.matchedQuantity,
          earnedAmount: r.earnedAmount,
          potentialAmount: r.potentialAmount,
          isQualified: r.isQualified,
          targetGateMessage: r.targetGateMessage,
        })),
      };

      const payload = {
        pcName: userSession.name,
        brand: brandSettings.brandName,
        branch: brandSettings.branch,
        sales: sanitizedSales,
        allTimeTotal: allTimeSalesTotal,
        allTimeBillCount: allTimeSalesCount,
        activeMonth,
        activeMonthTotal: monthTotal,
        activeMonthBillCount: computedCommission.monthBillCount || 0,
        monthlySummary,
        latestSale,
        target: targetAmount,
        monthTotal,
        progressPercent: Number(progressPercent),
        todayTotal,
        todayBillCount,
        todaySales: todaySales.map((s) => ({
          productName: s.productName,
          sku: s.sku,
          quantity: s.quantity,
          size: s.size,
          total: s.total,
        })),
        remainingToTarget,
        netCommission: computedCommission.grandTotalCommission || 0,
        commissionDetails,
      };
      const res = await fetch('/api/store/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('ซิงค์ข้อมูลล่าสุดของร้านไปยังเซิร์ฟเวอร์ LINE บอท เรียบร้อยแล้ว', 'success');
      }
    } catch (e: any) {
      showToast('ไม่สามารถซิงค์ข้อมูลได้ในขณะนี้: ' + e.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  น้องบอท
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ทักถามน้องบอทเพื่อเช็คยอดขาย, ค่าคอมมิชชั่น, อินเซนทีฟถัง และวิธีทำเงินเพิ่มได้ตลอด 24 ชม.
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live KPI Quick Strip with Month Switcher and All-time Total */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">ยอดรวมทั้งระบบ:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                ฿{allTimeSalesTotal.toLocaleString()} ({allTimeSalesCount} บิล)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-600">
            {availableMonths.length > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">เดือน:</span>
                <select
                  value={activeMonth}
                  onChange={(e) => setActiveMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-700 outline-hidden"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <span className="text-slate-400">เดือนนี้: </span>
              <span className="font-bold text-slate-900">฿{monthTotal.toLocaleString()}</span>
              <span className="text-[11px] font-semibold text-emerald-600 ml-1">({progressPercent}%)</span>
            </div>

            <div className="hidden sm:block text-slate-300">|</div>
            <div className="bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg">
              <span className="text-rose-700 font-medium">รวมคอม: </span>
              <span className="font-bold text-rose-900">฿{(computedCommission.grandTotalCommission || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#06C755] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>จำลองแชทน้องบอท (ทดสอบถามได้ทันที)</span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>คู่มือเชื่อมต่อ LINE Official Account (Webhook)</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'chat' ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* LINE Mockup Screen */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-[#7AC7E8]/15 flex flex-col h-[480px]">
                {/* LINE Header */}
                <div className="bg-[#06C755] px-4 py-2.5 text-white flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-[#06C755] flex items-center justify-center font-bold text-xs shadow-xs">
                      🤖
                    </div>
                    <div>
                      <div className="font-bold text-xs">น้องบอท</div>
                      <div className="text-[10px] text-emerald-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        เชื่อมต่อข้อมูลสดจากระบบร้าน
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setMessages([
                        {
                          id: 'welcome-reset',
                          sender: 'bot',
                          text: `สวัสดีครับ! น้องบอทพร้อมรายงานยอดขาย พิมพ์ถามหรือกดปุ่มลัดด้านล่างเพื่อเช็คยอดล่าสุดได้เลยครับ 🎯`,
                          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                        },
                      ])
                    }
                    title="ล้างประวัติแชท"
                    className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600/50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.sender === 'bot' && (
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs relative group ${
                          m.sender === 'user'
                            ? 'bg-[#06C755] text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                        <div className="flex items-center justify-between gap-2 mt-1 pt-1 text-[10px] text-slate-400 border-t border-slate-100">
                          <span>{m.timestamp}</span>
                          {m.sender === 'bot' && (
                            <button
                              onClick={() => handleCopyText(m.text, idx)}
                              className="text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                              title="คัดลอกข้อความ"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 text-[10px]">คัดลอกแล้ว</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>คัดลอก</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {m.sender === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-xs">
                          {userSession.name?.slice(0, 1) || 'PC'}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2 items-center text-slate-500 text-xs pl-9">
                      <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-slate-600 text-[11px]">น้องบอทกำลังดึงข้อมูลยอดขายจากคอมที่ร้าน...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Bar */}
                <div className="bg-white/90 backdrop-blur-xs p-2 border-t border-slate-200/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                  <span className="text-[10px] text-slate-500 font-bold px-1 shrink-0">คำถามด่วน:</span>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendQuery(p.query)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] font-medium border border-slate-200/80 shrink-0 transition-colors disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery();
                  }}
                  className="bg-white p-2.5 border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="พิมพ์ถามยอดขาย (เช่น วันนี้ได้ยอดเท่าไหร่, กี่% แล้ว)..."
                    disabled={loading}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 focus:border-[#06C755]"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || loading}
                    className="px-4 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่ง</span>
                  </button>
                </form>
              </div>

              {/* Notice info */}
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ระบบน้องบอททำงานอย่างไร:</span>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    ทุกครั้งที่มีการบันทึกยอดขายที่ร้าน ระบบจะส่งข้อมูลยอดขายและเป้าหมายล่าสุดเข้าเซิร์ฟเวอร์
                    เมื่อคุณทักถามน้องบอท (หรือหน้าจำลองนี้) AI จะคำนวณและสรุปยอดขายวันนั้น ยอดสะสม และระยะห่างของเป้าคอมมิชชั่นให้คุณได้ทันที
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Setup Guide Tab */
            <div className="space-y-5 max-w-2xl mx-auto">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>LINE Messaging API Webhook</span>
                </div>
                <h4 className="text-base font-bold text-white">
                  วิธีเชื่อมต่อให้น้องบอทใน LINE จริง ตอบคำถามยอดขายให้คุณ
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  คุณสามารถสร้าง LINE Official Account ฟรี และผูก Webhook URL ของระบบนี้เข้ากับ LINE Developers
                  เพื่อให้คุณและทีมงานทักถามยอดขายผ่าน LINE บนมือถือได้จริงทุกที่ทุกเวลา
                </p>
              </div>

              {/* Webhook URL Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Webhook URL สำหรับนำไปวางใน LINE Developers Console:</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-medium">พร้อมใช้งาน</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  ปลายทางนี้รองรับคำถามภาษาไทย เช่น "วันนี้ได้มีมาลงยอดขายเท่าไหร่", "กี่%แล้ว", "ขาดยอดอีกเท่าไหร่ถึงจะได้ค่าคอม"
                </p>
              </div>

              {/* 3-Step Setup Instructions */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ขั้นตอนง่ายๆ 3 ขั้นตอน:
                </h5>

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-900">สร้างหรือเปิด LINE Developers Console</div>
                    <div className="text-slate-600">
                      ไปที่ <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">developers.line.biz</a> แล้วเลือกหรือสร้าง Provider สำหรับร้าน จากนั้นสร้าง Channel ประเภท <b>Messaging API</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-900">ใส่ Webhook URL และเปิด Use Webhook</div>
                    <div className="text-slate-600">
                      ในแท็บ <b>Messaging API</b> นำ Webhook URL ด้านบนไปวางในช่อง <b>Webhook URL</b> แล้วกด <b>Verify</b> และเปิดสวิตช์ <b>Use Webhook</b> ให้เป็นสีเขียว
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-slate-900">แอดไลน์น้องบอท และทักถามยอดขายได้ทันที!</div>
                    <div className="text-slate-600">
                      สแกน QR Code แอดไลน์น้องบอท แล้วลองพิมพ์ส่งข้อความ เช่น <i>"วันนี้ได้ยอดเท่าไหร่"</i> หรือ <i>"ขาดยอดอีกเท่าไหร่ถึงจะได้ค่าคอม"</i> น้องบอทจะตอบกลับอัตโนมัติ 24 ชม.
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Sync Button */}
              <div className="pt-2 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">ต้องการบังคับส่งยอดขายไปเซิร์ฟเวอร์ทันที?</div>
                  <div className="text-[11px] text-slate-500">ปกติระบบจะส่งให้อัตโนมัติเมื่อมีการลงยอดขาย</div>
                </div>
                <button
                  onClick={handleManualSyncSnapshot}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ส่งยอดขายล่าสุดให้น้องบอทเดี๋ยวนี้</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">สถานะ:</span>
            <span className="text-emerald-700 font-medium">น้องบอทพร้อมรายงานยอดขาย 24 ชม.</span>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
