import React, { useMemo, useState } from 'react';
import { Award, Plus, Trash2, CheckCircle2, Edit2, X, Bot, Search, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GallonIncentiveRule } from '../types';
import { LEGACY_MAIN_TABLE, LEGACY_PERHEAD_TABLE, LEGACY_SPECIAL_TABLE, GATE_PERCENT } from '../services/commissionLegacy';

const SIZES = ['5GL', '2.5GL', '1GL', '1/4GL'];
const BASES = ['A', 'B', 'C', 'D'];
const FILMS = ['กึ่งเงา', 'ด้าน', 'ด้านพิเศษ'];

type MainRow = { pct: number; amt: number };
type SpecialRow = { pct: number; amt: number };
type PerHeadRow = { min: number; amt: number };

export const CommissionView: React.FC = () => {
  const {
    commissionConfig,
    gallonRules,
    addGallonRule,
    updateGallonRule,
    deleteGallonRule,
    computedCommission,
    catalogItems,
    showToast,
    setModalOpen,
    updateCommissionConfig,
  } = useApp();

  const [tab, setTab] = useState<'overview' | 'gallon'>('overview');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productName, setProductName] = useState('');
  const [ruleType, setRuleType] = useState<'per_unit' | 'lump_sum_qty'>('per_unit');
  const [reward, setReward] = useState(50);
  const [minQuantity, setMinQuantity] = useState(1);
  const [sizes, setSizes] = useState<string[]>([]);
  const [bases, setBases] = useState<string[]>([]);
  const [films, setFilms] = useState<string[]>([]);
  const [colorCodes, setColorCodes] = useState('');

  const [mainRows, setMainRows] = useState<MainRow[]>(() =>
    (commissionConfig.tiers?.length ? commissionConfig.tiers : LEGACY_MAIN_TABLE.map(t => ({ achievementPercent: t.pct, rewardAmount: t.amt })))
      .map(t => ({ pct: 'achievementPercent' in t ? t.achievementPercent : t.pct, amt: 'rewardAmount' in t ? t.rewardAmount : t.amt }))
  );
  const [specialRows, setSpecialRows] = useState<SpecialRow[]>(() => commissionConfig.legacySpecialTable?.length ? commissionConfig.legacySpecialTable.map(t => ({ ...t })) : LEGACY_SPECIAL_TABLE.map(t => ({ ...t })));
  const [perHeadRows, setPerHeadRows] = useState<PerHeadRow[]>(() => commissionConfig.legacyPerHeadTable?.length ? commissionConfig.legacyPerHeadTable.map(t => ({ ...t })) : LEGACY_PERHEAD_TABLE.map(t => ({ ...t })));
  const [gallonGatePercent, setGallonGatePercent] = useState<number>(commissionConfig.minTargetAchievementForGallon ?? GATE_PERCENT);

  const target = computedCommission.target || commissionConfig.monthlyTarget;

  const productGroups = useMemo(() => {
    const names = new Map<string, { name: string; category: string; minPrice: number; maxPrice: number }>();
    catalogItems.forEach(item => {
      const name = item.name.trim();
      const old = names.get(name);
      if (!old) names.set(name, { name, category: item.category || 'สินค้า', minPrice: item.price, maxPrice: item.price });
      else { old.minPrice = Math.min(old.minPrice, item.price); old.maxPrice = Math.max(old.maxPrice, item.price); }
    });
    const q = productSearch.trim().toLowerCase();
    return Array.from(names.values()).filter(g => !q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [catalogItems, productSearch]);

  const resetForm = () => {
    setEditingRuleId(null); setFormOpen(false); setProductName(''); setRuleType('per_unit'); setReward(50); setMinQuantity(1);
    setSizes([]); setBases([]); setFilms([]); setColorCodes(''); setProductSearch('');
  };

  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const editRule = (rule: GallonIncentiveRule) => {
    setEditingRuleId(rule.id); setFormOpen(true); setProductName(rule.productName || rule.targetProductName || '');
    setRuleType(rule.ruleType === 'lump_sum_qty' ? 'lump_sum_qty' : 'per_unit'); setReward(rule.reward); setMinQuantity(rule.minQuantity || 1);
    setSizes(rule.selectedSizes || []); setBases(rule.selectedBases || []); setFilms(rule.selectedFilmColors || []); setColorCodes(rule.selectedColorCodes?.join(', ') || '');
  };

  const saveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanProduct = productName.trim();
    if (!cleanProduct) return showToast('กรุณาเลือกสินค้า', 'error');
    if (ruleType === 'lump_sum_qty' && minQuantity <= 0) return showToast('จำนวนต่อชุดต้องมากกว่า 0', 'error');
    const generatedName = `${cleanProduct} · ${ruleType === 'per_unit' ? 'ต่อหน่วย' : 'ต่อชุด'}`;
    const data: GallonIncentiveRule = {
      id: editingRuleId || `rule-${Date.now()}`, name: generatedName, ruleType, reward,
      minQuantity: ruleType === 'lump_sum_qty' ? minQuantity : undefined, productName: cleanProduct, targetProductName: cleanProduct,
      selectedSizes: sizes.length ? sizes : undefined, selectedBases: bases.length ? bases : undefined, selectedFilmColors: films.length ? films : undefined,
      selectedColorCodes: colorCodes.trim() ? colorCodes.split(',').map(v => v.trim()).filter(Boolean) : undefined, enabled: true,
    };
    if (editingRuleId) updateGallonRule(data); else addGallonRule(data);
    resetForm();
  };

  const saveLegacy = () => {
    const sortedMain = mainRows.filter(r => Number.isFinite(r.pct) && Number.isFinite(r.amt)).sort((a,b) => a.pct-b.pct);
    const sortedSpecial = specialRows.filter(r => Number.isFinite(r.pct) && Number.isFinite(r.amt)).sort((a,b) => a.pct-b.pct);
    const sortedPerHead = perHeadRows.filter(r => Number.isFinite(r.min) && Number.isFinite(r.amt)).sort((a,b) => b.min-a.min);
    updateCommissionConfig({
      ...commissionConfig,
      tiers: sortedMain.map(r => ({ achievementPercent: r.pct, rewardAmount: r.amt })),
      legacySpecialTable: sortedSpecial,
      legacyPerHeadTable: sortedPerHead,
      minTargetAchievementForGallon: Math.max(0, Math.min(100, gallonGatePercent)),
      requireTargetAchievementForGallon: true,
    });
  };

  const updateMain = (i: number, key: keyof MainRow, value: number) => setMainRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  const updateSpecial = (i: number, key: keyof SpecialRow, value: number) => setSpecialRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  const updatePerHead = (i: number, key: keyof PerHeadRow, value: number) => setPerHeadRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));

  return (
    <div id="commission-view" className="space-y-6 pb-24">
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100"><Award className="w-3.5 h-3.5" /> Commission & Incentive Calculation Engine</span><h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">ระบบคำนวณค่าคอมมิชชั่น & อินเซนทีฟ</h1><p className="text-xs sm:text-sm text-slate-500 mt-0.5">ปรับนโยบาย Legacy และเกณฑ์อินเซนทีฟได้จากหน้านี้</p></div>
        <button onClick={() => setModalOpen('ai-assistant')} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-2"><Bot className="w-4 h-4" /> AI ช่วยคำนวณ</button>
      </div>

      <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl"><div className="text-xs text-slate-400">ค่าคอมมิชชั่นรวมเดือนนี้</div><div className="text-4xl font-black font-mono mt-1">฿{computedCommission.grandTotalCommission.toLocaleString()}</div><div className="text-xs text-slate-300 mt-2">ยอดขาย ฿{computedCommission.totalSalesAmount.toLocaleString()} / เป้า ฿{target.toLocaleString()} ({computedCommission.achievementPercent.toFixed(2)}%)</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5"><div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Main</div><div className="font-bold">฿{computedCommission.mainCommission.toLocaleString()}</div></div><div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Special</div><div className="font-bold">฿{computedCommission.specialCommission.toLocaleString()}</div></div><div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Per Head / คน</div><div className="font-bold">฿{computedCommission.perHeadCommission.toLocaleString()}</div></div><div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Gallon</div><div className="font-bold">฿{computedCommission.gallonIncentiveTotal.toLocaleString()}</div></div></div></div>

      <div className="flex gap-2 border-b border-slate-200"><button onClick={() => setTab('overview')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'overview' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500'}`}>ค่าคอม Legacy</button><button onClick={() => setTab('gallon')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'gallon' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500'}`}>อินเซนทีฟรายแกลลอน</button></div>

      {tab === 'overview' && <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">ค่าคอมหลัก — ตาราง Legacy</h2><p className="text-xs text-slate-500 mt-1">แก้ไขเปอร์เซ็นต์และจำนวนเงินได้ แล้วกดบันทึก</p></div><button onClick={saveLegacy} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5"><Save className="w-4 h-4" /> บันทึก</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left p-3">% เป้า</th><th className="text-left p-3">ยอดขายขั้นต่ำ</th><th className="text-right p-3">ค่าคอม</th></tr></thead><tbody>{mainRows.map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="p-2"><input type="number" value={r.pct} onChange={e=>updateMain(i,'pct',Number(e.target.value))} className="w-24 p-2 border rounded-lg" /></td><td className="p-3 font-mono">฿{Math.ceil(target * r.pct / 100).toLocaleString()}</td><td className="p-2 text-right"><input type="number" value={r.amt} onChange={e=>updateMain(i,'amt',Number(e.target.value))} className="w-32 p-2 border rounded-lg text-right" /></td></tr>)}</tbody></table></div></div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><h2 className="font-bold text-slate-900">ค่าคอมพิเศษตามยอดบาท</h2><p className="text-xs text-slate-500 mt-1">ใช้เฉพาะเป้า 200,000–400,000 บาท และต้องถึงเกณฑ์หลัก</p><div className="mt-4 space-y-2">{specialRows.map((r,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"><input type="number" value={r.pct} onChange={e=>updateSpecial(i,'pct',Number(e.target.value))} className="p-2 border rounded-lg" /><input type="number" value={r.amt} onChange={e=>updateSpecial(i,'amt',Number(e.target.value))} className="p-2 border rounded-lg" /><button onClick={()=>setSpecialRows(rows=>rows.filter((_,idx)=>idx!==i))} className="p-2 text-rose-500"><Trash2 className="w-4 h-4" /></button></div>)}</div><button onClick={()=>setSpecialRows(rows=>[...rows,{pct:100,amt:0}])} className="mt-3 text-xs font-bold text-rose-600">+ เพิ่มระดับ</button></div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><h2 className="font-bold text-slate-900">ค่าคอมต่อคน</h2><p className="text-xs text-slate-500 mt-1">ยอดขายเฉลี่ยต่อคน และต้องถึงเกณฑ์หลัก</p><div className="mt-4 space-y-2">{perHeadRows.map((r,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"><input type="number" value={r.min} onChange={e=>updatePerHead(i,'min',Number(e.target.value))} className="p-2 border rounded-lg" /><input type="number" value={r.amt} onChange={e=>updatePerHead(i,'amt',Number(e.target.value))} className="p-2 border rounded-lg" /><button onClick={()=>setPerHeadRows(rows=>rows.filter((_,idx)=>idx!==i))} className="p-2 text-rose-500"><Trash2 className="w-4 h-4" /></button></div>)}</div><button onClick={()=>setPerHeadRows(rows=>[...rows,{min:0,amt:0}])} className="mt-3 text-xs font-bold text-rose-600">+ เพิ่มระดับ</button><div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs"><div className="flex justify-between"><span>ยอดขาย/คนปัจจุบัน</span><b>฿{computedCommission.salesPerHead.toLocaleString()}</b></div><div className="flex justify-between mt-1"><span>จ่ายต่อคน</span><b>฿{computedCommission.perHeadCommission.toLocaleString()}</b></div></div></div>
        </div>
      </div>}

      {tab === 'gallon' && <div className="space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="font-bold text-slate-900">อินเซนทีฟรายแกลลอน</h2><p className="text-xs text-slate-500 mt-1">ตั้งเกณฑ์ยอดขายรวมได้เอง เช่น 50%, 80% หรือ 100%</p></div><button onClick={()=>setFormOpen(true)} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> เพิ่มกติกา</button></div><div className="mt-4 flex items-end gap-3"><label className="text-xs font-bold flex-1">เกณฑ์ปลดล็อค (%)<input type="number" min="0" max="100" step="0.01" value={gallonGatePercent} onChange={e=>setGallonGatePercent(Number(e.target.value) || 0)} className="mt-1 w-full max-w-xs p-2.5 border rounded-xl" /></label><button onClick={saveLegacy} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"><Save className="inline w-4 h-4 mr-1" /> บันทึกเกณฑ์</button></div><div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs">เกณฑ์ปัจจุบัน <b>{gallonGatePercent}%</b> · สถานะเดือนนี้: <b>{computedCommission.isGallonTargetUnlocked ? `ผ่าน ${gallonGatePercent}%` : `ยังไม่ถึง ${gallonGatePercent}%`}</b></div>{computedCommission.gallonCapApplied && <div className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">(ตัดเหลือคนละ 5,000 บาท)</div>} {!computedCommission.isGallonTargetUnlocked && <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">ยังไม่จ่ายจริงจนกว่าจะถึง {gallonGatePercent}% แต่ยังแสดงยอดที่จะได้: ฿{computedCommission.gallonIncentivePotentialTotal.toLocaleString()}</div>}</div>

        {formOpen && <form onSubmit={saveRule} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold">{editingRuleId ? 'แก้ไขกติกา' : 'เพิ่มกติกาอินเซนทีฟ'}</h3><button type="button" onClick={resetForm}><X className="w-4 h-4" /></button></div><div><label className="text-xs font-semibold">ชื่อสินค้า <span className="text-rose-600">*</span></label><div className="relative mt-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} className="w-full pl-9 p-2.5 border rounded-xl" placeholder="ค้นหารุ่นสินค้า เช่น Weatherbond, Hybrid Shield..." /></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto mt-2">{productGroups.map(g=><button key={g.name} type="button" onClick={()=>{setProductName(g.name);setProductSearch('')}} className={`p-3 text-left rounded-xl border-2 ${productName===g.name?'border-rose-500 bg-rose-50':'border-slate-100 bg-white'}`}><div className="font-bold text-xs truncate">{g.name}</div><div className="text-[11px] text-slate-400 truncate mt-0.5">{g.category}</div><div className="text-[11px] font-bold text-rose-600 mt-2">฿{g.minPrice.toLocaleString()} - ฿{g.maxPrice.toLocaleString()}</div></button>)}</div>{productName && <div className="mt-2 text-xs font-bold text-emerald-700">เลือกแล้ว: {productName}</div>}</div><div className="flex gap-2">{(['per_unit','lump_sum_qty'] as const).map(type=><button key={type} type="button" onClick={()=>setRuleType(type)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${ruleType===type?'border-rose-500 bg-rose-50 text-rose-700':'border-slate-200'}`}>{type==='per_unit'?'ต่อหน่วย':'ต่อชุด'}</button>)}</div><div className="grid md:grid-cols-2 gap-3"><label className="text-xs font-semibold">รางวัล (บาท)<input type="number" min="0" value={reward} onChange={e=>setReward(Number(e.target.value)||0)} className="mt-1 w-full p-2.5 border rounded-xl" required /></label>{ruleType==='lump_sum_qty'&&<label className="text-xs font-semibold">จำนวนต่อชุด<input type="number" min="1" value={minQuantity} onChange={e=>setMinQuantity(Number(e.target.value)||0)} className="mt-1 w-full p-2.5 border rounded-xl" required /></label>}</div><div className="space-y-3"><div className="text-xs font-bold">เงื่อนไขสินค้า (ไม่ได้เลือก = ทุกค่า)</div><div className="flex flex-wrap gap-1.5">{SIZES.map(v=><button type="button" key={v} onClick={()=>toggle(v,setSizes)} className={`px-2.5 py-1 rounded-lg text-xs border ${sizes.includes(v)?'bg-slate-900 text-white':'bg-slate-50'}`}>{v}</button>)}</div><div className="flex flex-wrap gap-1.5">{BASES.map(v=><button type="button" key={v} onClick={()=>toggle(v,setBases)} className={`px-2.5 py-1 rounded-lg text-xs border ${bases.includes(v)?'bg-slate-900 text-white':'bg-slate-50'}`}>Base {v}</button>)}</div><div className="flex flex-wrap gap-1.5">{FILMS.map(v=><button type="button" key={v} onClick={()=>toggle(v,setFilms)} className={`px-2.5 py-1 rounded-lg text-xs border ${films.includes(v)?'bg-slate-900 text-white':'bg-slate-50'}`}>{v}</button>)}</div><label className="text-xs font-semibold">เบอร์สี (คั่นด้วย comma, ว่าง = ทุกค่า)<input value={colorCodes} onChange={e=>setColorCodes(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-xs">ยกเลิก</button><button type="submit" className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">บันทึกกติกา</button></div></form>}

        <div className="space-y-3">{gallonRules.map(rule=>{const breakdown=computedCommission.ruleBreakdowns.find(r=>r.ruleId===rule.id);return <div key={rule.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="font-bold text-sm">{rule.productName || rule.targetProductName || 'ไม่มีชื่อสินค้า'}</div><div className="text-xs text-slate-500 mt-1">{rule.ruleType==='per_unit'?'ต่อหน่วย':'ต่อชุด'} · จำนวน {breakdown?.matchedQuantity || 0} · เงิน {breakdown?.potentialAmount?.toLocaleString() || '0'} บาท</div></div><div className="flex gap-1"><button onClick={()=>editRule(rule)} className="p-2 rounded-lg hover:bg-slate-50"><Edit2 className="w-4 h-4" /></button><button onClick={()=>deleteGallonRule(rule.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div></div>{breakdown&&<div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs">{breakdown.isTargetAchieved?<span className="text-emerald-700 font-semibold"><CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />ผ่านเกณฑ์ {computedCommission.globalTargetPercent}% · จ่าย ฿{breakdown.earnedAmount.toLocaleString()}</span>:<span className="text-amber-700">ยังไม่ถึง {computedCommission.globalTargetPercent}% · ยอดที่จะได้ ฿{breakdown.potentialAmount.toLocaleString()}</span>}</div>}</div>})}</div>
      </div>}
    </div>
  );
};
