import React, { useState } from 'react';
import {
  Award,
  Target,
  Users,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Percent,
  Layers,
  Sparkles,
  Edit2,
  DollarSign,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  AlertCircle,
  X,
  Sliders,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GallonIncentiveRule, CommissionTier } from '../types';

export const CommissionView: React.FC = () => {
  const {
    commissionConfig,
    updateCommissionConfig,
    gallonRules,
    addGallonRule,
    updateGallonRule,
    deleteGallonRule,
    computedCommission,
    brandSettings,
    showToast,
    setModalOpen,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tiers' | 'gallon' | 'special'>('overview');

  // Tier customization state
  const [isEditingTiers, setIsEditingTiers] = useState(false);
  const [tempTiers, setTempTiers] = useState<CommissionTier[]>(commissionConfig.tiers);
  const [newTierAchieve, setNewTierAchieve] = useState<number>(100);
  const [newTierReward, setNewTierReward] = useState<number>(5000);

  // Global Gallon Target Gate State (เงื่อนไขยอดขายรวมขั้นต่ำเพื่อรับเงินรายแกนลอน)
  const [requireTargetGate, setRequireTargetGate] = useState<boolean>(
    commissionConfig.requireTargetAchievementForGallon ?? true
  );
  const [gatePercent, setGatePercent] = useState<number>(
    commissionConfig.minTargetAchievementForGallon ?? 80
  );

  // Advanced Gallon Incentive Rule Form
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<
    'per_unit' | 'lump_sum_qty' | 'threshold_revenue_per_bucket' | 'min_qty_per_unit'
  >('per_unit');
  const [ruleReward, setRuleReward] = useState<number>(50);
  const [ruleMinQty, setRuleMinQty] = useState<number>(1);
  const [ruleTargetProduct, setRuleTargetProduct] = useState('');
  const [ruleThresholdPrice, setRuleThresholdPrice] = useState<number>(3000);
  // Rule specific target achievement gate
  const [ruleTargetMode, setRuleTargetMode] = useState<'inherit' | 'custom' | 'none'>('inherit');
  const [ruleCustomTargetPercent, setRuleCustomTargetPercent] = useState<number>(80);

  // Filter chips for rule conditions
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedBases, setSelectedBases] = useState<string[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<string[]>([]);
  const [colorCodeInput, setColorCodeInput] = useState('');

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleBase = (base: string) => {
    setSelectedBases((prev) =>
      prev.includes(base) ? prev.filter((b) => b !== base) : [...prev, base]
    );
  };

  const toggleFilm = (film: string) => {
    setSelectedFilms((prev) =>
      prev.includes(film) ? prev.filter((f) => f !== film) : [...prev, film]
    );
  };

  // Add custom step tier
  const handleAddTier = () => {
    if (newTierAchieve <= 0 || newTierReward <= 0) return;
    const updated = [...tempTiers, { achievementPercent: newTierAchieve, rewardAmount: newTierReward }].sort(
      (a, b) => a.achievementPercent - b.achievementPercent
    );
    setTempTiers(updated);
    setNewTierAchieve(110);
    setNewTierReward(7000);
  };

  const handleDeleteTier = (index: number) => {
    setTempTiers(tempTiers.filter((_, idx) => idx !== index));
  };

  const handleSaveTiers = () => {
    updateCommissionConfig({
      ...commissionConfig,
      tiers: tempTiers,
    });
    setIsEditingTiers(false);
    showToast('บันทึกเกณฑ์คอมมิชชั่นขั้นบันไดสำเร็จ', 'success');
  };

  // Global Target Gate Handlers
  const handleToggleTargetGate = (enabled: boolean) => {
    setRequireTargetGate(enabled);
    updateCommissionConfig({
      ...commissionConfig,
      requireTargetAchievementForGallon: enabled,
      minTargetAchievementForGallon: gatePercent,
    });
    showToast(
      enabled
        ? `เปิดเงื่อนไขยอดขายรวม: ต้องได้ ≥ ${gatePercent}% ของเป้าจึงจะได้รับเงินรายแกนลอน`
        : 'ปิดเงื่อนไขยอดขายรวม: จ่ายเงินรางวัลรายแกนลอนทุกชิ้นทันที',
      'info'
    );
  };

  const handleSelectPresetGate = (preset: number) => {
    setGatePercent(preset);
    updateCommissionConfig({
      ...commissionConfig,
      requireTargetAchievementForGallon: true,
      minTargetAchievementForGallon: preset,
    });
    setRequireTargetGate(true);
    showToast(`ตั้งเกณฑ์ยอดขายรวมเป็น ${preset}% ของเป้าหมายเรียบร้อยแล้ว`, 'success');
  };

  const handleSaveTargetGate = () => {
    updateCommissionConfig({
      ...commissionConfig,
      requireTargetAchievementForGallon: requireTargetGate,
      minTargetAchievementForGallon: gatePercent,
    });
    showToast(`บันทึกเกณฑ์ยอดขายรวม ${gatePercent}% เรียบร้อยแล้ว`, 'success');
  };

  // Start editing existing rule
  const handleStartEditRule = (rule: GallonIncentiveRule) => {
    setEditingRuleId(rule.id);
    setIsAddingRule(true);
    setRuleName(rule.name);
    setRuleType(rule.ruleType as any);
    setRuleReward(rule.reward);
    setRuleMinQty(rule.minQuantity || 1);
    setRuleTargetProduct(rule.targetProductName || rule.productName || '');
    setRuleThresholdPrice(rule.thresholdPricePerUnit || 3000);
    setSelectedSizes(rule.selectedSizes || []);
    setSelectedBases(rule.selectedBases || []);
    setSelectedFilms(rule.selectedFilmColors || []);
    setColorCodeInput(rule.selectedColorCodes ? rule.selectedColorCodes.join(', ') : '');

    if (rule.minTargetAchievementPercent === 0) {
      setRuleTargetMode('none');
      setRuleCustomTargetPercent(0);
    } else if (rule.minTargetAchievementPercent && rule.minTargetAchievementPercent > 0) {
      setRuleTargetMode('custom');
      setRuleCustomTargetPercent(rule.minTargetAchievementPercent);
    } else {
      setRuleTargetMode('inherit');
      setRuleCustomTargetPercent(commissionConfig.minTargetAchievementForGallon || 80);
    }
  };

  const handleCancelRuleForm = () => {
    setIsAddingRule(false);
    setEditingRuleId(null);
    setRuleName('');
    setRuleType('per_unit');
    setRuleReward(50);
    setRuleMinQty(1);
    setRuleTargetProduct('');
    setRuleThresholdPrice(3000);
    setRuleTargetMode('inherit');
    setRuleCustomTargetPercent(80);
    setSelectedSizes([]);
    setSelectedBases([]);
    setSelectedFilms([]);
    setColorCodeInput('');
  };

  // Add / update complex incentive rule
  const handleSaveNewGallonRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      showToast('กรุณาระบุชื่อกฎหรือแคมเปญ', 'error');
      return;
    }

    const calculatedMinTarget =
      ruleTargetMode === 'none'
        ? 0
        : ruleTargetMode === 'custom'
        ? ruleCustomTargetPercent
        : undefined; // undefined = inherit system condition

    if (editingRuleId) {
      const existing = gallonRules.find((r) => r.id === editingRuleId);
      if (existing) {
        const updatedRule: GallonIncentiveRule = {
          ...existing,
          name: ruleName.trim(),
          ruleType,
          reward: ruleReward,
          minQuantity: ruleMinQty,
          targetProductName: ruleTargetProduct.trim() || undefined,
          productName: ruleTargetProduct.trim() || undefined,
          thresholdPricePerUnit: ruleType === 'threshold_revenue_per_bucket' ? ruleThresholdPrice : undefined,
          selectedSizes: selectedSizes.length > 0 ? selectedSizes : undefined,
          selectedBases: selectedBases.length > 0 ? selectedBases : undefined,
          selectedFilmColors: selectedFilms.length > 0 ? selectedFilms : undefined,
          selectedColorCodes: colorCodeInput.trim() ? colorCodeInput.split(',').map((c) => c.trim()) : undefined,
          minTargetAchievementPercent: calculatedMinTarget,
        };
        updateGallonRule(updatedRule);
        showToast(`อัปเดตกฎ "${updatedRule.name}" เรียบร้อย`, 'success');
      }
    } else {
      const newRule: GallonIncentiveRule = {
        id: `rule-${Date.now()}`,
        name: ruleName.trim(),
        ruleType,
        reward: ruleReward,
        minQuantity: ruleMinQty,
        targetProductName: ruleTargetProduct.trim() || undefined,
        productName: ruleTargetProduct.trim() || undefined,
        thresholdPricePerUnit: ruleType === 'threshold_revenue_per_bucket' ? ruleThresholdPrice : undefined,
        selectedSizes: selectedSizes.length > 0 ? selectedSizes : undefined,
        selectedBases: selectedBases.length > 0 ? selectedBases : undefined,
        selectedFilmColors: selectedFilms.length > 0 ? selectedFilms : undefined,
        selectedColorCodes: colorCodeInput.trim() ? colorCodeInput.split(',').map((c) => c.trim()) : undefined,
        minTargetAchievementPercent: calculatedMinTarget,
        enabled: true,
      };
      addGallonRule(newRule);
      showToast(`เพิ่มกฎเงินรางวัลพิเศษ "${newRule.name}" เรียบร้อย`, 'success');
    }

    handleCancelRuleForm();
  };

  return (
    <div id="commission-view" className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              <Award className="w-3.5 h-3.5" />
              Commission & Incentive Calculation Engine
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              ระบบคำนวณค่าคอมมิชชั่น & เงินรางวัลพิเศษ PC
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              คำนวณขั้นบันได (% เป้าหมาย), เงินรางวัลพิเศษรายชิ้น (Gallon Incentive), และโบนัสพิเศษตามช่วงยอดขาย
            </p>
          </div>

          <button
            onClick={() => setModalOpen('ai-assistant')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>AI ช่วยคำนวณ & วางแผนค่าคอม</span>
          </button>
        </div>
      </div>

      {/* MASTER HIGHLIGHT: GRAND TOTAL COMMISSION EARNED */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                รวมคอมมิชชั่นทั้งหมดที่ PC ได้รับเดือนนี้
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
              ฿{computedCommission.grandTotalCommission.toLocaleString()}
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              ยอดขายเดือนนี้ <span className="font-bold text-white font-mono">฿{computedCommission.totalSalesAmount.toLocaleString()}</span>{' '}
              จากเป้า ฿{computedCommission.target.toLocaleString()}{' '}
              <span className={`inline-block ml-1 font-bold ${computedCommission.achievementPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                ({computedCommission.achievementPercent}% บรรลุเป้า)
              </span>
            </p>
          </div>

          {/* 4 Pillars Breakdown Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">1. บันไดผลงาน Tier</span>
              <span className="text-lg font-bold text-white font-mono">
                ฿{computedCommission.mainCommission.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">2. รางวัลพิเศษรายชิ้น</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                ฿{computedCommission.gallonIncentiveTotal.toLocaleString()}
              </span>
              {computedCommission.gallonIncentivePotentialTotal > computedCommission.gallonIncentiveTotal && (
                <span className="text-[10px] text-amber-300/90 block mt-0.5 font-medium">
                  (รอปลดล็อค ฿{(computedCommission.gallonIncentivePotentialTotal - computedCommission.gallonIncentiveTotal).toLocaleString()})
                </span>
              )}
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">3. โบนัส Special Band</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                ฿{computedCommission.specialCommission.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">4. Per Head ({computedCommission.headcount} คน)</span>
              <span className="text-lg font-bold text-white font-mono">
                ฿{computedCommission.perHeadCommission.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Commission Coaching Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300">AI Sales & Commission Coach</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">คณิตศาสตร์แม่นยำ 100%</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {!computedCommission.isGallonTargetUnlocked && computedCommission.gapToGallonUnlock > 0 ? (
                <>
                  💡 ยอดขายอีกเพียง <span className="font-bold text-amber-300 font-mono">฿{computedCommission.gapToGallonUnlock.toLocaleString()}</span> จะปลดล็อกเงินรางวัลรายถังสะสม <span className="font-bold text-emerald-400 font-mono">฿{computedCommission.gallonIncentivePotentialTotal.toLocaleString()}</span> ทันที!
                </>
              ) : computedCommission.nextTier ? (
                <>
                  💡 ขาดยอดอีก <span className="font-bold text-amber-300 font-mono">฿{Math.max(0, Math.ceil((computedCommission.target * computedCommission.nextTier.achievementPercent) / 100) - computedCommission.totalSalesAmount).toLocaleString()}</span> จะขยับสู่ Tier {computedCommission.nextTier.achievementPercent}% รับเงินรางวัล <span className="font-bold text-emerald-400 font-mono">฿{computedCommission.nextTier.rewardAmount.toLocaleString()}</span>
                </>
              ) : (
                <>
                  🎉 ยอดเยี่ยมมาก! ทำผลงานทะลุขั้นบันไดสูงสุดแล้ว แนะนำผลักดันสินค้าอินเซนทีฟรายชิ้นต่อเนื่องเพื่อคว้าเงินรางวัลไม่จำกัด!
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen('ai-assistant')}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <span>ปรึกษา AI โค้ช / ถาม LINE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'overview'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          สรุปรายละเอียดรายได้ (Breakdown)
        </button>
        <button
          onClick={() => setActiveSubTab('gallon')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'gallon'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          เงินรางวัลพิเศษรายชิ้น (Gallon Incentive)
        </button>
        <button
          onClick={() => setActiveSubTab('tiers')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'tiers'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          กำหนดบันได % เป้าหมาย (Step Tier)
        </button>
        <button
          onClick={() => setActiveSubTab('special')}
          className={`pb-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'special'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ช่วงยอดขายพิเศษ (Special Band)
        </button>
      </div>

      {/* TAB 1: OVERVIEW & REAL-TIME REWARD BREAKDOWNS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Detailed Item Incentive Breakdown Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  สรุปเงินรางวัลพิเศษรายชิ้นที่ทำได้จริง (Earned Incentive Breakdown)
                </h3>
                <p className="text-xs text-slate-500">
                  คำนวณอัตโนมัติจากทุกบิลขายในเดือนนี้เทียบกับกฎโปรโมชัน และเงื่อนไขยอดขายรวมขั้นต่ำของเป้าหมาย
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">รวมรางวัลพิเศษที่ได้รับจริง</span>
                <p className="text-xl font-bold text-amber-600 font-mono">
                  ฿{computedCommission.gallonIncentiveTotal.toLocaleString()}
                </p>
                {computedCommission.gallonIncentivePotentialTotal > computedCommission.gallonIncentiveTotal && (
                  <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 sm:justify-end mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                    มียอดสะสมรอปลดล็อคอีก ฿{(computedCommission.gallonIncentivePotentialTotal - computedCommission.gallonIncentiveTotal).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {computedCommission.ruleBreakdowns && computedCommission.ruleBreakdowns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">ชื่อกฎ / แคมเปญเงินรางวัล</th>
                      <th className="py-2.5 px-4 text-center">ประเภทเงื่อนไข</th>
                      <th className="py-2.5 px-4 text-center">จำนวนที่ขายได้</th>
                      <th className="py-2.5 px-4 text-right">อัตราเงินรางวัล</th>
                      <th className="py-2.5 px-4 text-center">เงื่อนไขยอดขายรวม (% เป้า)</th>
                      <th className="py-2.5 px-4 text-right">เงินรางวัลที่ได้รับ (THB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computedCommission.ruleBreakdowns.map((rb) => (
                      <tr key={rb.ruleId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{rb.ruleName}</span>
                          <span className="text-xs text-slate-400">{rb.matchedDescription || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {rb.ruleType === 'lump_sum_qty' || rb.matchedDescription?.includes('ชุด')
                              ? 'ซื้อครบชุด'
                              : rb.ruleType === 'threshold_revenue_per_bucket' || rb.matchedDescription?.includes('ราคาถัง')
                              ? 'ยอดเงินต่อถัง'
                              : 'ต่อชิ้น'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {rb.matchedQuantity} ถัง/ชุด
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ฿{rb.rewardRate.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rb.requiredTargetPercent && rb.requiredTargetPercent > 0 ? (
                            rb.isTargetAchieved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ผ่านเกณฑ์ (≥{rb.requiredTargetPercent}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200" title={rb.targetGateMessage}>
                                <Lock className="w-3 h-3 text-amber-600" />
                                ต้องได้ ≥{rb.requiredTargetPercent}% (ขาดอีก {Math.max(0, rb.requiredTargetPercent - computedCommission.achievementPercent)}%)
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              จ่ายทันที
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {rb.isTargetAchieved ? (
                            <span className="font-mono font-bold text-amber-600 text-base">
                              ฿{rb.earnedAmount.toLocaleString()}
                            </span>
                          ) : rb.potentialAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-400 line-through font-mono">
                                ฿{rb.potentialAmount.toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                <Lock className="w-3 h-3" /> รอปลดล็อค (฿0)
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-slate-400">฿0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">ยังไม่พบยอดขายที่ตรงกับเงื่อนไขเงินรางวัลพิเศษในเดือนนี้</p>
              </div>
            )}
          </div>

          {/* Tier & Target Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-600" />
                เป้าหมายและผลงานยอดขาย
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">เป้าหมายประจำเดือน (Target):</span>
                  <span className="font-bold text-slate-800 font-mono">฿{computedCommission.target.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">ยอดขายจริงสะสม:</span>
                  <span className="font-bold text-rose-600 font-mono">฿{computedCommission.totalSalesAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">อัตราบรรลุเป้าหมาย:</span>
                  <span className="font-bold text-slate-900">{computedCommission.achievementPercent}%</span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="font-bold text-slate-800">เงินรางวัล Tier คอมมิชชั่น:</span>
                  <span className="font-bold text-slate-900 font-mono text-base">฿{computedCommission.mainCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                คอมมิชชั่นตามจำนวนพนักงาน (Headcount)
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">จำนวน PC ในสาขา:</span>
                  <span className="font-bold text-slate-800">{computedCommission.headcount} คน</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">ยอดขายเฉลี่ยต่อคน:</span>
                  <span className="font-bold text-slate-800 font-mono">฿{computedCommission.salesPerHead.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">อัตราต่อหัว (Per Head Rate):</span>
                  <span className="font-bold text-slate-800 font-mono">฿{commissionConfig.rewardPerHead.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="font-bold text-slate-800">เงินรางวัล Per Head:</span>
                  <span className="font-bold text-slate-900 font-mono text-base">฿{computedCommission.perHeadCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED GALLON INCENTIVES CONFIG */}
      {activeSubTab === 'gallon' && (
        <div className="space-y-6">
          {/* Target Achievement Gate Setting Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-150 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    เงื่อนไขยอดขายรวมขั้นต่ำเพื่อรับเงินรายแกนลอน (Target Achievement Gate)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดให้พนักงานต้องทำยอดขายรวมถึงกี่ % ของเป้าหมายประจำเดือน จึงจะมีสิทธิ์ได้รับเงินรางวัลรายแกนลอน
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200 self-start sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {requireTargetGate ? 'เปิดเงื่อนไขขั้นต่ำ' : 'ปิดเงื่อนไข (จ่ายทันที)'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleTargetGate(!requireTargetGate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    requireTargetGate ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      requireTargetGate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* If Gate is enabled, show controls and live status */}
            {requireTargetGate ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-rose-600" />
                        เกณฑ์ยอดขายรวมขั้นต่ำของเป้าหมาย (% Target):
                      </label>
                      <span className="text-base font-black font-mono text-rose-600">
                        {gatePercent}%
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[70, 75, 80, 85, 90, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPresetGate(preset)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            gatePercent === preset
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {preset}% {preset === 80 && '(ค่ามาตรฐาน)'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range"
                        min="50"
                        max="120"
                        step="5"
                        value={gatePercent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setGatePercent(val);
                          updateCommissionConfig({
                            ...commissionConfig,
                            requireTargetAchievementForGallon: true,
                            minTargetAchievementForGallon: val,
                          });
                        }}
                        className="w-full accent-rose-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Real-time Status Card */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">ผลงานยอดขายรวมปัจจุบัน:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ฿{computedCommission.totalSalesAmount.toLocaleString()} / ฿{computedCommission.target.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">อัตราบรรลุเป้าหมาย:</span>
                      <span className="font-black text-sm text-slate-900">
                        {computedCommission.achievementPercent}%
                      </span>
                    </div>

                    {computedCommission.isGallonTargetUnlocked ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>ผ่านเกณฑ์แล้ว! ยอดรวมถึง {computedCommission.achievementPercent}% (≥ {gatePercent}%) เงินรางวัลปลดล็อคพร้อมจ่าย</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>ยังไม่ถึงเกณฑ์ (ขาดอีก {Math.max(0, gatePercent - computedCommission.achievementPercent)}% หรือ ฿{computedCommission.gapToGallonUnlock.toLocaleString()}) เงินรางวัลรอปลดล็อค ฿{computedCommission.gallonIncentivePotentialTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>ปิดเงื่อนไขยอดขายรวมอยู่: พนักงานจะได้รับเงินรางวัลพิเศษรายชิ้นทุกถังที่ขายได้ทันที โดยไม่ต้องรอให้ยอดขายรวมถึงเป้าหมาย</span>
              </div>
            )}
          </div>

          {/* Section Header & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                รายการกฎเงินรางวัลพิเศษรายชิ้น (Gallon Incentive Rules)
              </h3>
              <p className="text-xs text-slate-500">
                รองรับการกำหนดเงื่อนไข ซื้อเป็นชุด, รายชิ้น, ตามยอดเงินต่อถัง, ขนาด, เบส และเงื่อนไขยอดขายรวมเฉพาะกฎ
              </p>
            </div>

            <button
              onClick={() => {
                if (isAddingRule) {
                  handleCancelRuleForm();
                } else {
                  setIsAddingRule(true);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              {isAddingRule ? 'ปิดแบบฟอร์ม' : '+ เพิ่มกฎเงื่อนไขใหม่'}
            </button>
          </div>

          {/* Add / Edit Form */}
          {isAddingRule && (
            <form onSubmit={handleSaveNewGallonRule} className="bg-white rounded-2xl p-5 sm:p-6 border border-rose-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-sm text-slate-900">
                  {editingRuleId ? 'แก้ไขกฎเงินรางวัลพิเศษ' : 'ตั้งค่ากฎเงินรางวัลพิเศษใหม่'}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelRuleForm}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">ชื่อกฎ / แคมเปญ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น โปรโมชัน Weatherbond ถังละ 50 บาท"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">รุ่นสินค้าที่ร่วมรายการ (เว้นว่างเพื่อใช้กับทุกรุ่น)</label>
                  <input
                    type="text"
                    placeholder="เช่น WEATHERBOND, HYBRID SHIELD สีทาฝ้า"
                    value={ruleTargetProduct}
                    onChange={(e) => setRuleTargetProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Rule Type Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">รูปแบบการคำนวณเงินรางวัล *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div
                    onClick={() => setRuleType('per_unit')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      ruleType === 'per_unit' ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">1. รายชิ้น (Per Unit)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">ขายได้คิดเงินรางวัลให้ทุกๆ ถัง</p>
                  </div>

                  <div
                    onClick={() => setRuleType('lump_sum_qty')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      ruleType === 'lump_sum_qty' ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">2. ซื้อเป็นชุด (Bundle/Lump Sum)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">เช่น ขายครบทุกๆ 4 ถัง ได้เงินก้อน 300 บาท</p>
                  </div>

                  <div
                    onClick={() => setRuleType('threshold_revenue_per_bucket')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      ruleType === 'threshold_revenue_per_bucket'
                        ? 'border-rose-500 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">3. ตามเป้ายอดเงินต่อถัง</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">เช่น ราคาต่อถัง ฿3,000 ขึ้นไป ได้ ฿50/ถัง</p>
                  </div>
                </div>
              </div>

              {/* Dynamic inputs based on rule type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {ruleType === 'lump_sum_qty' ? 'จำนวนถังต่อชุด (เช่น ครบ 4 ถัง)' : 'จำนวนขั้นต่ำ (ชิ้น)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ruleMinQty}
                    onChange={(e) => setRuleMinQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {ruleType === 'lump_sum_qty' ? 'เงินรางวัลต่อชุด (บาท)' : 'เงินรางวัลต่อหน่วย (บาท)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={ruleReward}
                    onChange={(e) => setRuleReward(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>

                {ruleType === 'threshold_revenue_per_bucket' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      ราคาขายขั้นต่ำต่อถัง (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ruleThresholdPrice}
                      onChange={(e) => setRuleThresholdPrice(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                )}
              </div>

              {/* NEW: Rule-specific Target Achievement Condition */}
              <div className="space-y-3 pt-3 border-t border-slate-100 bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-600" />
                    เงื่อนไขยอดขายรวม (% ของเป้า) เพื่อมีสิทธิ์รับเงินรางวัลข้อนี้:
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div
                    onClick={() => setRuleTargetMode('inherit')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      ruleTargetMode === 'inherit'
                        ? 'border-amber-500 bg-amber-100/60 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={ruleTargetMode === 'inherit'}
                        onChange={() => setRuleTargetMode('inherit')}
                        className="accent-amber-600"
                      />
                      <span className="text-xs text-slate-800 font-bold">ตามเกณฑ์ระบบ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-4">
                      ต้องทำยอดรวม ≥ {commissionConfig.minTargetAchievementForGallon ?? 80}% ของเป้า
                    </p>
                  </div>

                  <div
                    onClick={() => setRuleTargetMode('custom')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      ruleTargetMode === 'custom'
                        ? 'border-amber-500 bg-amber-100/60 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={ruleTargetMode === 'custom'}
                        onChange={() => setRuleTargetMode('custom')}
                        className="accent-amber-600"
                      />
                      <span className="text-xs text-slate-800 font-bold">กำหนด % เฉพาะกฎนี้</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-4">
                      ระบุเงื่อนไข % ของเป้าหมายเฉพาะสำหรับกฎนี้
                    </p>
                  </div>

                  <div
                    onClick={() => setRuleTargetMode('none')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      ruleTargetMode === 'none'
                        ? 'border-amber-500 bg-amber-100/60 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={ruleTargetMode === 'none'}
                        onChange={() => setRuleTargetMode('none')}
                        className="accent-amber-600"
                      />
                      <span className="text-xs text-slate-800 font-bold">จ่ายทันที (ไม่มีเงื่อนไข)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-4">
                      ไม่จำกัดยอดขายรวม ขายชิ้นนี้ได้จ่ายเงินทันที
                    </p>
                  </div>
                </div>

                {ruleTargetMode === 'custom' && (
                  <div className="pt-2 flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      ต้องได้ยอดขายรวมขั้นต่ำ:
                    </label>
                    <div className="relative w-32">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={ruleCustomTargetPercent}
                        onChange={(e) => setRuleCustomTargetPercent(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-amber-300 rounded-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      ของเป้าหมายสาขาจึงจะได้รับเงินรางวัลข้อนี้
                    </span>
                  </div>
                )}
              </div>

              {/* Conditions: Size, Base, Film */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                  เงื่อนไขจำเพาะ (เลือกได้ตามต้องการ):
                </label>

                {/* Size chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">ขนาด:</span>
                  {['5GL', '2.5GL', '1GL', '1/4GL'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedSizes.includes(s)
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {selectedSizes.length === 0 && <span className="text-xs text-slate-400">(ทุกขนาด)</span>}
                </div>

                {/* Base chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">เบส:</span>
                  {['A', 'B', 'C', 'D'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBase(b)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedBases.includes(b)
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      เบส {b}
                    </button>
                  ))}
                  {selectedBases.length === 0 && <span className="text-xs text-slate-400">(ทุกเบส)</span>}
                </div>

                {/* Film chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">ฟิล์มสี:</span>
                  {['กึ่งเงา', 'ด้าน', 'ด้านพิเศษ'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFilm(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedFilms.includes(f)
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  {selectedFilms.length === 0 && <span className="text-xs text-slate-400">(ทุกฟิล์มสี)</span>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelRuleForm}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {editingRuleId ? 'บันทึกการแก้ไข' : 'บันทึกกฎใหม่'}
                </button>
              </div>
            </form>
          )}

          {/* Active Gallon Rules List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              รายการกฎแกลลอนอินเซนทีฟที่เปิดใช้งาน ({gallonRules.length} กฎ)
            </h4>

            <div className="divide-y divide-slate-100">
              {gallonRules.map((rule) => {
                const targetPercentRequired =
                  rule.minTargetAchievementPercent !== undefined
                    ? rule.minTargetAchievementPercent
                    : commissionConfig.requireTargetAchievementForGallon
                    ? commissionConfig.minTargetAchievementForGallon ?? 80
                    : 0;

                const isUnlocked =
                  targetPercentRequired === 0 ||
                  computedCommission.achievementPercent >= targetPercentRequired;

                return (
                  <div key={rule.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                        {rule.targetProductName && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700">
                            {rule.targetProductName}
                          </span>
                        )}

                        {/* Target Gate Condition Badge */}
                        {rule.minTargetAchievementPercent === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Unlock className="w-3 h-3" /> จ่ายทันที (ไม่จำกัด % ยอดขาย)
                          </span>
                        ) : rule.minTargetAchievementPercent !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              isUnlocked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isUnlocked ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-amber-600" />
                            )}
                            เงื่อนไขเฉพาะ: ยอดรวม ≥ {rule.minTargetAchievementPercent}%
                          </span>
                        ) : commissionConfig.requireTargetAchievementForGallon ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              isUnlocked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isUnlocked ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-amber-600" />
                            )}
                            ตามระบบ: ยอดรวม ≥ {commissionConfig.minTargetAchievementForGallon ?? 80}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            <Unlock className="w-3 h-3" /> จ่ายทันที
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 items-center">
                        <span className="font-bold text-slate-700">
                          {rule.ruleType === 'lump_sum_qty'
                            ? `ครบชุดละ ${rule.minQuantity || 4} ถัง ได้ ฿${rule.reward.toLocaleString()}`
                            : rule.ruleType === 'threshold_revenue_per_bucket'
                            ? `ราคาขาย ฿${rule.thresholdPricePerUnit?.toLocaleString()} ขึ้นไป ได้ ฿${rule.reward}/ถัง`
                            : `ถังละ ฿${rule.reward.toLocaleString()}`}
                        </span>
                        {rule.selectedSizes && rule.selectedSizes.length > 0 && (
                          <span>• ขนาด: {rule.selectedSizes.join(', ')}</span>
                        )}
                        {rule.selectedBases && rule.selectedBases.length > 0 && (
                          <span>• เบส: {rule.selectedBases.join(', ')}</span>
                        )}
                        {rule.selectedFilmColors && rule.selectedFilmColors.length > 0 && (
                          <span>• ฟิล์มสี: {rule.selectedFilmColors.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleStartEditRule(rule)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="แก้ไขกฎนี้"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGallonRule({ ...rule, enabled: !rule.enabled })}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${
                          rule.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {rule.enabled ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGallonRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="ลบกฎนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMIZABLE STEP TIERS (% ACHIVEMENT -> REWARD) */}
      {activeSubTab === 'tiers' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                กำหนดเกณฑ์ขั้นบันได (Achievement % Matrix)
              </h3>
              <p className="text-xs text-slate-500">
                ผู้ใช้สามารถกำหนดได้เองว่ายอดขายกี่ % ของเป้า จะได้รับเงินรางวัลเท่าไหร่
              </p>
            </div>

            <button
              onClick={() => {
                if (isEditingTiers) {
                  handleSaveTiers();
                } else {
                  setTempTiers(commissionConfig.tiers);
                  setIsEditingTiers(true);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all ${
                isEditingTiers
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isEditingTiers ? 'บันทึกการแก้ไขขั้นบันได' : 'แก้ไขขั้นบันได'}
            </button>
          </div>

          {/* Add Step row when in editing mode */}
          {isEditingTiers && (
            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-rose-900">+ เพิ่มขั้นใหม่:</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span>ยอดขาย</span>
                <input
                  type="number"
                  min="1"
                  value={newTierAchieve}
                  onChange={(e) => setNewTierAchieve(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                />
                <span>% ของเป้า</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>ได้เงิน</span>
                <input
                  type="number"
                  min="0"
                  value={newTierReward}
                  onChange={(e) => setNewTierReward(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold font-mono"
                />
                <span>บาท</span>
              </div>
              <button
                type="button"
                onClick={handleAddTier}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                + เพิ่ม
              </button>
            </div>
          )}

          {/* Tiers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="py-3 px-4">เป้าหมาย % ยอดขาย</th>
                  <th className="py-3 px-4">ยอดขายขั้นต่ำที่ต้องทำได้ (THB)</th>
                  <th className="py-3 px-4 text-right">เงินรางวัล Tier (THB)</th>
                  <th className="py-3 px-4 text-center">สถานะปัจจุบัน</th>
                  {isEditingTiers && <th className="py-3 px-4 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(isEditingTiers ? tempTiers : commissionConfig.tiers).map((t, idx) => {
                  const minSales = (commissionConfig.monthlyTarget * t.achievementPercent) / 100;
                  const isAchieved = computedCommission.achievementPercent >= t.achievementPercent;

                  return (
                    <tr key={idx} className={isAchieved ? 'bg-emerald-50/50 font-medium' : ''}>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {isEditingTiers ? (
                          <input
                            type="number"
                            value={t.achievementPercent}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updated = [...tempTiers];
                              updated[idx].achievementPercent = val;
                              setTempTiers(updated);
                            }}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-center"
                          />
                        ) : (
                          `${t.achievementPercent}%`
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        ฿{minSales.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {isEditingTiers ? (
                          <input
                            type="number"
                            value={t.rewardAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updated = [...tempTiers];
                              updated[idx].rewardAmount = val;
                              setTempTiers(updated);
                            }}
                            className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-right font-mono"
                          />
                        ) : (
                          `฿${t.rewardAmount.toLocaleString()}`
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isAchieved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> ผ่านเกณฑ์แล้ว
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">ยังไม่ถึง</span>
                        )}
                      </td>
                      {isEditingTiers && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteTier(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SPECIAL BANDS */}
      {activeSubTab === 'special' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              ช่วงยอดขายพิเศษ (Special Commission Bands)
            </h3>
            <p className="text-xs text-slate-500">
              โบนัสก้อนพิเศษเพิ่มเติมเมื่อยอดขายรวมตกอยู่ในช่วงมูลค่าที่กำหนด
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {commissionConfig.specialBands.map((band) => {
              const inRange =
                computedCommission.totalSalesAmount >= band.minSales &&
                computedCommission.totalSalesAmount <= band.maxSales;

              return (
                <div key={band.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 font-mono">
                      ช่วงยอดขาย ฿{band.minSales.toLocaleString()} – ฿{band.maxSales.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">โบนัสพิเศษเพิ่มตามช่วง</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-mono text-base">
                      +฿{band.rewardAmount.toLocaleString()}
                    </span>
                    {inRange ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        ได้รับรางวัล
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">นอกช่วง</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
