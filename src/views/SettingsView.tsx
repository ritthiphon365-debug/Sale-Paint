import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Store,
  Database,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle,
  User,
  Mail,
  Image,
  LogOut,
  LogIn,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsView: React.FC = () => {
  const {
    brandSettings,
    updateBrandSettings,
    userSession,
    updateUserSession,
    loginWithGoogle,
    logout,
    showToast,
    setModalOpen,
    resetSales,
    resetStock,
    resetCustomers,
    resetAllData,
    resetToFactorySettings,
  } = useApp();

  // User Profile State
  const [userName, setUserName] = useState(userSession.name || '');
  const [userEmail, setUserEmail] = useState(userSession.email || '');
  const [userAvatar, setUserAvatar] = useState(userSession.avatar || '');

  // Brand State
  const [brandName, setBrandName] = useState(brandSettings.brandName);
  const [subtitle, setSubtitle] = useState(brandSettings.subtitle || '');
  const [branch, setBranch] = useState(brandSettings.branch || '');
  const [badge, setBadge] = useState(brandSettings.badge || '');
  const [lineOaUrl, setLineOaUrl] = useState(brandSettings.lineOaUrl || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      showToast('กรุณาระบุชื่อผู้ใช้งาน', 'error');
      return;
    }
    updateUserSession({
      name: userName.trim(),
      email: userEmail.trim(),
      avatar: userAvatar.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandSettings({
      ...brandSettings,
      brandName: brandName.trim(),
      subtitle: subtitle.trim(),
      branch: branch.trim(),
      badge: badge.trim(),
      lineOaUrl: lineOaUrl.trim(),
    });
  };

  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [resetKeepCatalog, setResetKeepCatalog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleExecuteFactoryReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      showToast('กรุณาพิมพ์คำว่า RESET เพื่อยืนยันการล้างข้อมูล', 'error');
      return;
    }
    setIsResetting(true);
    try {
      await resetToFactorySettings(resetKeepCatalog);
      setShowConfirmResetModal(false);
      setConfirmInput('');
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      setIsResetting(false);
    }
  };

  const handleQuickResetSales = () => {
    if (window.confirm('คุณต้องการล้างเฉพาะ "ประวัติบิลขายและยอดขายทั้งหมด" ใช่หรือไม่? (สินค้าและข้อมูลสต็อกจะไม่หาย)')) {
      resetSales();
    }
  };

  const handleQuickResetStock = () => {
    if (window.confirm('คุณต้องการรีเซ็ตเฉพาะ "สต็อกคงเหลือและประวัติการรับเข้าสินค้าทั้งหมดเป็น 0" ใช่หรือไม่? (ยอดขายจะไม่หาย)')) {
      resetStock();
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-600" />
          การตั้งค่าระบบ (Settings & Identity)
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium">
          System Preferences • จัดการบัญชีผู้ใช้งาน ชื่อพนักงาน PC ร้านค้า สาขา และฐานข้อมูล LocalStorage
        </p>
      </div>

      {/* User Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">ข้อมูลบัญชีผู้ใช้งาน / เจ้าหน้าที่ PC</h2>
              <p className="text-slate-400 text-[11px]">แก้ไขชื่อที่แสดงบนระบบ และอีเมลประจำตัวผู้ใช้งาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors font-medium text-[11px] cursor-pointer active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>{userSession.email ? 'สลับบัญชี Google' : 'เข้าสู่ระบบด้วย Google'}</span>
            </button>
            <button
              type="button"
              onClick={() => setModalOpen('google-auth')}
              title="ตรวจสอบสิทธิ์และตัวช่วยล็อกอิน Google"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            {userSession.email && (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors font-medium text-[11px] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 py-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
          <img
            src={userAvatar || userSession.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={userSession.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-rose-500/20"
            referrerPolicy="no-referrer"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="font-bold text-slate-900 text-sm">{userSession.name}</div>
            <div className="text-slate-500 text-xs">{userSession.email || 'ไม่ได้ระบุอีเมล'}</div>
            <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              พร้อมบันทึกยอดขายและคำนวณคอมมิชชั่น
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ชื่อ-นามสกุล / ชื่อพนักงาน PC</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี (PC นิปปอนเพนต์)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">อีเมล (Google Account)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="youremail@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">URL รูปโปรไฟล์ (Image URL)</label>
          <div className="relative">
            <Image className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="url"
              value={userAvatar}
              onChange={(e) => setUserAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>บันทึกข้อมูลผู้ใช้งาน</span>
          </button>
        </div>
      </form>

      {/* Brand Form */}
      <form onSubmit={handleSaveBrand} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">ข้อมูลแบรนด์และสาขา</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Sale Paint Pro</span>
        </div>

        {/* Current Official Icon Showcase */}
        <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center gap-3.5 border border-slate-800">
          <img
            src="./icon-192.png"
            alt="Sale Paint Pro Icon"
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-md shrink-0"
          />
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">ไอคอนประจำแอปพลิเคชัน (Official Icon)</span>
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[9px] font-semibold">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              ไอคอน Sale Paint Pro ใช้แสดงบนแท็บเบราว์เซอร์ (Favicon), หน้าจอโฮมมือถือ (PWA) และเมนูนำทาง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ชื่อแบรนด์หรือร้านค้า</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">สโลแกน / คำขยาย</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">สาขา / หน้างาน</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ตราสัญลักษณ์ตัวแทน (Badge)</label>
            <input
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">ลิงก์ LINE Official Account / LINE ร้านค้า</label>
          <input
            type="url"
            value={lineOaUrl}
            onChange={(e) => setLineOaUrl(e.target.value)}
            placeholder="https://line.me/ti/p/..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Comprehensive Factory Reset & Subsystem Reset */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-rose-200 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <Trash2 className="w-5 h-5" />
            <span>การจัดการฐานข้อมูลและการคืนค่าโรงงาน (Factory Reset)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold tracking-wider uppercase">
            Danger Zone
          </span>
        </div>

        <p className="text-slate-600 leading-relaxed">
          ท่านสามารถเลือกล้างข้อมูลเฉพาะจุด (เช่น ล้างบิลขายเมื่อเริ่มต้นเดือนใหม่ หรือล้างสต็อก) หรือกดปุ่ม <strong>"ล้างข้อมูลและคืนค่าโรงงาน (Factory Reset)"</strong> เพื่อลบข้อมูลทุกอย่างในเครื่องทั้งหมด 100%
        </p>

        {/* Quick Granular Resets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">ล้างเฉพาะประวัติยอดขาย</div>
              <div className="text-[10px] text-slate-500">ลบบิลขายทั้งหมด โดยไม่กระทบแคตตาล็อกสินค้า</div>
            </div>
            <button
              type="button"
              onClick={handleQuickResetSales}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-[11px] font-semibold transition-colors shrink-0 ml-2"
            >
              ล้างยอดขาย
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 text-[11px]">รีเซ็ตสต็อกสินค้าเป็น 0</div>
              <div className="text-[10px] text-slate-500">ล้างยอดสต็อกคงคลังและประวัติการรับเข้าทั้งหมดเป็น 0</div>
            </div>
            <button
              type="button"
              onClick={handleQuickResetStock}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-[11px] font-semibold transition-colors shrink-0 ml-2"
            >
              รีเซ็ตสต็อก
            </button>
          </div>
        </div>

        {/* Full Factory Reset Trigger */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
          <div>
            <div className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              ล้างข้อมูลจากโรงงาน (Full Factory Reset)
            </div>
            <div className="text-[11px] text-rose-700/80 mt-0.5">
              ล้างทุกอย่างใน LocalStorage: บิลขาย, ลูกค้า, สต็อก, เป้าหมาย, การเชื่อมต่อ Google และเริ่มระบบใหม่อย่างสมบูรณ์
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmInput('');
              setShowConfirmResetModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0 hover:shadow-md active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ล้างข้อมูลและคืนค่าโรงงาน</span>
          </button>
        </div>
      </div>

      {/* Factory Reset Modal Confirmation */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-bold">ยืนยันการคืนค่าโรงงาน (Factory Reset)</h3>
                  <p className="text-[11px] text-slate-500 font-normal">การกระทำนี้จะลบข้อมูลในเครื่องถาวร</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  ⚠️ รายการที่จะถูกลบ:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
                  <li>ยอดขาย บิลขาย และประวัติการขายทั้งหมด</li>
                  <li>สต็อกสินค้า และประวัติการรับสต็อกเข้าทุกรายการ</li>
                  <li>ฐานข้อมูลลูกค้าสัมพันธ์ (CRM)</li>
                  <li>เป้าหมายการขายและส่วนแบ่งตลาด (Market Share)</li>
                  <li>การตั้งค่าร้านค้าและรหัสเชื่อมต่อ Google Sheets</li>
                </ul>
              </div>

              {/* Option to keep Catalog items */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={resetKeepCatalog}
                  onChange={(e) => setResetKeepCatalog(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <div className="font-semibold text-slate-800 text-[11px]">
                    คงฐานข้อมูลแคตตาล็อกสินค้า (Product Catalog) ไว้
                  </div>
                  <div className="text-[10px] text-slate-500">
                    หากติ๊กช่องนี้ จะไม่ต้องนำเข้าไฟล์ Excel รายการสีใหม่ ระบบจะล้างเฉพาะยอดขายและสต็อก
                  </div>
                </div>
              </label>

              {/* Confirmation Input Field */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  พิมพ์คำว่า <span className="font-bold text-rose-600 uppercase">RESET</span> เพื่อยืนยัน:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="พิมพ์ RESET"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-center font-bold tracking-widest text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                onClick={handleExecuteFactoryReset}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                  confirmInput.trim().toUpperCase() === 'RESET' && !isResetting
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 cursor-pointer active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed text-slate-500'
                }`}
              >
                {isResetting ? (
                  <span>กำลังล้างข้อมูล...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ยืนยันล้างข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
