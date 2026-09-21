import React, { useState } from 'react';
import { Award, Target, Users, Plus, Trash2, CheckCircle2, Edit2, X, Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GallonIncentiveRule } from '../types';
import { LEGACY_MAIN_TABLE, LEGACY_PERHEAD_TABLE, LEGACY_SPECIAL_TABLE, GATE_PERCENT } from '../services/commissionLegacy';

const SIZES = ['5GL', '2.5GL', '1GL', '1/4GL'];
const BASES = ['A', 'B', 'C', 'D'];
const FILMS = ['กึ่งเงา', 'ด้าน', 'ด้านพิเศษ'];

export const CommissionView: React.FC = () => {
  const {
    commissionConfig,
    gallonRules,
    addGallonRule,
    updateGallonRule,
    deleteGallonRule,
    computedCommission,
    showToast,
    setModalOpen,
  } = useApp();

  const [tab, setTab] = useState<'overview' | 'gallon'>('overview');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [productName, setProductName] = useState('');
  const [ruleType, setRuleType] = useState<'per_unit' | 'lump_sum_qty'>('per_unit');
  const [reward, setReward] = useState(50);
  const [minQuantity, setMinQuantity] = useState(1);
  const [sizes, setSizes] = useState<string[]>([]);
  const [bases, setBases] = useState<string[]>([]);
  const [films, setFilms] = useState<string[]>([]);
  const [colorCodes, setColorCodes] = useState('');

  const resetForm = () => {
    setEditingRuleId(null);
    setFormOpen(false);
    setRuleName('');
    setProductName('');
    setRuleType('per_unit');
    setReward(50);
    setMinQuantity(1);
    setSizes([]);
    setBases([]);
    setFilms([]);
    setColorCodes('');
  };

  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const editRule = (rule: GallonIncentiveRule) => {
    setEditingRuleId(rule.id);
    setFormOpen(true);
    setRuleName(rule.name);
    setProductName(rule.productName || rule.targetProductName || '');
    setRuleType(rule.ruleType === 'lump_sum_qty' ? 'lump_sum_qty' : 'per_unit');
    setReward(rule.reward);
    setMinQuantity(rule.minQuantity || 1);
    setSizes(rule.selectedSizes || []);
    setBases(rule.selectedBases || []);
    setFilms(rule.selectedFilmColors || []);
    setColorCodes(rule.selectedColorCodes?.join(', ') || '');
  };

  const saveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = ruleName.trim();
    const cleanProduct = productName.trim();
    if (!cleanName) return showToast('กรุณาระบุชื่อกฎหรือแคมเปญ', 'error');
    if (!cleanProduct) return showToast('กรุณาระบุชื่อสินค้า', 'error');
    if (ruleType === 'lump_sum_qty' && minQuantity <= 0) return showToast('จำนวนต่อชุดต้องมากกว่า 0', 'error');

    const data: GallonIncentiveRule = {
      id: editingRuleId || `rule-${Date.now()}`,
      name: cleanName,
      ruleType,
      reward,
      minQuantity: ruleType === 'lump_sum_qty' ? minQuantity : undefined,
      productName: cleanProduct,
      targetProductName: cleanProduct,
      selectedSizes: sizes.length ? sizes : undefined,
      selectedBases: bases.length ? bases : undefined,
      selectedFilmColors: films.length ? films : undefined,
      selectedColorCodes: colorCodes.trim() ? colorCodes.split(',').map((v) => v.trim()).filter(Boolean) : undefined,
      enabled: true,
    };

    if (editingRuleId) updateGallonRule(data);
    else addGallonRule(data);
    showToast(editingRuleId ? 'อัปเดตกฎเรียบร้อย' : 'เพิ่มกฎเรียบร้อย', 'success');
    resetForm();
  };

  const target = computedCommission.target || commissionConfig.monthlyTarget;
  const tierRows = LEGACY_MAIN_TABLE;

  return (
    <div id="commission-view" className="space-y-6 pb-24">
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
            <Award className="w-3.5 h-3.5" /> Commission & Incentive Calculation Engine
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">ระบบคำนวณค่าคอมมิชชั่น & อินเซนทีฟ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">สูตร Legacy แบบคงที่ และอินเซนทีฟรายแกลลอนตามกติกา 80%</p>
        </div>
        <button onClick={() => setModalOpen('ai-assistant')} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-2">
          <Bot className="w-4 h-4" /> AI ช่วยคำนวณ
        </button>
      </div>

      <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl">
        <div className="text-xs text-slate-400">ค่าคอมมิชชั่นรวมเดือนนี้</div>
        <div className="text-4xl font-black font-mono mt-1">฿{computedCommission.grandTotalCommission.toLocaleString()}</div>
        <div className="text-xs text-slate-300 mt-2">ยอดขาย ฿{computedCommission.totalSalesAmount.toLocaleString()} / เป้า ฿{target.toLocaleString()} ({computedCommission.achievementPercent.toFixed(2)}%)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          <div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Main</div><div className="font-bold">฿{computedCommission.mainCommission.toLocaleString()}</div></div>
          <div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Special</div><div className="font-bold">฿{computedCommission.specialCommission.toLocaleString()}</div></div>
          <div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Per Head / คน</div><div className="font-bold">฿{computedCommission.perHeadCommission.toLocaleString()}</div></div>
          <div className="bg-white/5 rounded-xl p-3"><div className="text-[11px] text-slate-400">Gallon</div><div className="font-bold">฿{computedCommission.gallonIncentiveTotal.toLocaleString()}</div></div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('overview')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'overview' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500'}`}>ค่าคอม Legacy</button>
        <button onClick={() => setTab('gallon')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'gallon' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500'}`}>อินเซนทีฟรายแกลลอน</button>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">ค่าคอมหลัก — ตาราง Legacy (อ่านอย่างเดียว)</h2>
              <p className="text-xs text-slate-500 mt-1">ไม่สามารถแก้ไข Tier จากหน้านี้ได้</p>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left p-3">% เป้า</th><th className="text-left p-3">ยอดขายขั้นต่ำ</th><th className="text-right p-3">ค่าคอม</th></tr></thead><tbody>{tierRows.map((t) => <tr key={t.pct} className="border-t border-slate-100"><td className="p-3 font-bold">{t.pct}%</td><td className="p-3 font-mono">฿{Math.ceil(target * t.pct / 100).toLocaleString()}</td><td className="p-3 text-right font-mono font-bold">฿{t.amt.toLocaleString()}</td></tr>)}</tbody></table></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-bold text-slate-900">ค่าคอมพิเศษตามยอดบาท (อ่านอย่างเดียว)</h2>
              <p className="text-xs text-slate-500 mt-1">เฉพาะเป้า 200,000–400,000 บาท และต้องถึง 80%</p>
              <div className="mt-4 space-y-2">{LEGACY_SPECIAL_TABLE.map((t) => <div key={t.pct} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span>≥ {t.pct}%</span><b>฿{t.amt.toLocaleString()}</b></div>)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-bold text-slate-900">ค่าคอมต่อคน (อ่านอย่างเดียว)</h2>
              <p className="text-xs text-slate-500 mt-1">คิดจากยอดขายเฉลี่ยต่อคน และต้องถึง 80%</p>
              <div className="mt-4 space-y-2">{LEGACY_PERHEAD_TABLE.map((t) => <div key={t.min} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span>ยอดขาย/คน ≥ ฿{t.min.toLocaleString()}</span><b>฿{t.amt.toLocaleString()}/คน</b></div>)}</div>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs"><div className="flex justify-between"><span>ยอดขาย/คนปัจจุบัน</span><b>฿{computedCommission.salesPerHead.toLocaleString()}</b></div><div className="flex justify-between mt-1"><span>จ่ายต่อคน</span><b>฿{computedCommission.perHeadCommission.toLocaleString()}</b></div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'gallon' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">อินเซนทีฟรายแกลลอน</h2><p className="text-xs text-slate-500 mt-1">ทุกกฎใช้เกณฑ์ยอดขายรวม 80% ของเป้าเสมอ ไม่ใช้เงื่อนไข % รายกฎ</p></div>
              <button onClick={() => setFormOpen(true)} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> เพิ่มกติกา</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[11px] text-slate-500">Subtotal</div><b>฿{computedCommission.gallonSubtotal.toLocaleString()}</b></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[11px] text-slate-500">รวม ÷ {computedCommission.headcount} คน</div><b>฿{computedCommission.gallonPerPersonRaw.toLocaleString(undefined, { maximumFractionDigits: 2 })}/คน</b></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[11px] text-slate-500">จ่ายจริง</div><b>฿{computedCommission.gallonIncentiveTotal.toLocaleString()}</b></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[11px] text-slate-500">เกณฑ์</div><b>{computedCommission.achievementPercent >= GATE_PERCENT ? 'ผ่าน 80%' : 'ยังไม่ถึง 80%'}</b></div>
            </div>
            {computedCommission.gallonCapApplied && <div className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">(ตัดเหลือคนละ 5,000 บาท)</div>}
            {!computedCommission.isGallonTargetUnlocked && <div className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">ยังไม่จ่ายจริงจนกว่าจะถึง 80% แต่ยังแสดงยอดที่จะได้: ฿{computedCommission.gallonIncentivePotentialTotal.toLocaleString()}</div>}
          </div>

          {formOpen && (
            <form onSubmit={saveRule} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center"><h3 className="font-bold">{editingRuleId ? 'แก้ไขกติกา' : 'เพิ่มกติกาอินเซนทีฟ'}</h3><button type="button" onClick={resetForm}><X className="w-4 h-4" /></button></div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs font-semibold">ชื่อกติกา<input value={ruleName} onChange={(e) => setRuleName(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl" required /></label>
                <label className="text-xs font-semibold">ชื่อสินค้า <span className="text-rose-600">*</span><input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl" placeholder="ต้องตรงกับชื่อสินค้า" required /></label>
              </div>
              <div className="flex gap-2">
                {(['per_unit', 'lump_sum_qty'] as const).map((type) => <button key={type} type="button" onClick={() => setRuleType(type)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${ruleType === type ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200'}`}>{type === 'per_unit' ? 'ต่อหน่วย' : 'ต่อชุด'}</button>)}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs font-semibold">รางวัล (บาท)<input type="number" min="0" value={reward} onChange={(e) => setReward(Number(e.target.value) || 0)} className="mt-1 w-full p-2.5 border rounded-xl" required /></label>
                {ruleType === 'lump_sum_qty' && <label className="text-xs font-semibold">จำนวนต่อชุด<input type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(Number(e.target.value) || 0)} className="mt-1 w-full p-2.5 border rounded-xl" required /></label>}
              </div>
              <div className="space-y-3"><div className="text-xs font-bold">เงื่อนไขสินค้า (ไม่ได้เลือก = ทุกค่า)</div>
                <div className="flex flex-wrap gap-1.5">{SIZES.map((v) => <button type="button" key={v} onClick={() => toggle(v, setSizes)} className={`px-2.5 py-1 rounded-lg text-xs border ${sizes.includes(v) ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>{v}</button>)}</div>
                <div className="flex flex-wrap gap-1.5">{BASES.map((v) => <button type="button" key={v} onClick={() => toggle(v, setBases)} className={`px-2.5 py-1 rounded-lg text-xs border ${bases.includes(v) ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>Base {v}</button>)}</div>
                <div className="flex flex-wrap gap-1.5">{FILMS.map((v) => <button type="button" key={v} onClick={() => toggle(v, setFilms)} className={`px-2.5 py-1 rounded-lg text-xs border ${films.includes(v) ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>{v}</button>)}</div>
                <label className="text-xs font-semibold">เบอร์สี (คั่นด้วย comma, ว่าง = ทุกค่า)<input value={colorCodes} onChange={(e) => setColorCodes(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl" /></label>
              </div>
              <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-xs">ยกเลิก</button><button type="submit" className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">บันทึกกติกา</button></div>
            </form>
          )}

          <div className="space-y-3">{gallonRules.map((rule) => {
            const breakdown = computedCommission.ruleBreakdowns.find((r) => r.ruleId === rule.id);
            return <div key={rule.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="font-bold text-sm">{rule.name}</div><div className="text-xs text-slate-500 mt-1">{rule.ruleType === 'per_unit' ? 'ต่อหน่วย' : rule.ruleType === 'lump_sum_qty' ? 'ต่อชุด' : 'ประเภทเดิม (ไม่คำนวณ)'} · {rule.productName || 'ไม่มีชื่อสินค้า'}</div><div className="text-xs text-slate-500 mt-1">จำนวน {breakdown?.matchedQuantity || 0} · เงิน {breakdown?.potentialAmount?.toLocaleString() || '0'} บาท</div></div><div className="flex gap-1"><button onClick={() => editRule(rule)} className="p-2 rounded-lg hover:bg-slate-50"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteGallonRule(rule.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div></div>
              {breakdown && <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs">{breakdown.isTargetAchieved ? <span className="text-emerald-700 font-semibold"><CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />ผ่านเกณฑ์ 80% · จ่าย ฿{breakdown.earnedAmount.toLocaleString()}</span> : <span className="text-amber-700">ยังไม่ถึง 80% · ยอดที่จะได้ ฿{breakdown.potentialAmount.toLocaleString()}</span>}</div>}
            </div>;
          })}</div>
        </div>
      )}
    </div>
  );
};
