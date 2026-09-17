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
    resetAllData,
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

  const handleResetData = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลและคืนค่าโรงงาน? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      resetAllData();
      window.location.reload();
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
            {userSession.email ? (
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors font-medium text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>ออกจากระบบ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors font-medium text-[11px]"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>เข้าสู่ระบบ</span>
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
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Store className="w-5 h-5 text-rose-600" />
          <h2 className="font-bold text-base text-slate-900">ข้อมูลแบรนด์และสาขา</h2>
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

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-200 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-base border-b border-rose-100 pb-2">
          <Trash2 className="w-5 h-5" />
          <span>การจัดการฐานข้อมูลเครื่อง (Reset Database)</span>
        </div>
        <p className="text-slate-500">
          หากต้องการล้างข้อมูลการขาย ลูกค้า และสต็อกที่บันทึกไว้ในเบราว์เซอร์นี้ทั้งหมดเพื่อเริ่มต้นระบบใหม่
        </p>
        <button
          type="button"
          onClick={handleResetData}
          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ล้างข้อมูลและคืนค่าโรงงาน (Factory Reset)</span>
        </button>
      </div>
    </div>
  );
};
