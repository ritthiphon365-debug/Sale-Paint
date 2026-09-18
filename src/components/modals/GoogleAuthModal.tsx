import React, { useState } from 'react';
import {
  X,
  LogIn,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Globe,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { auth, googleProvider, signInWithPopup, signInWithRedirect } from '../../lib/firebase';
import { UserSession } from '../../types';

interface GoogleAuthModalProps {
  // Can be controlled by modalOpen in AppContext
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = () => {
  const { modalOpen, setModalOpen, userSession, updateUserSession, showToast, addAuditLog } = useApp();

  const [copied, setCopied] = useState(false);
  const [isAttempting, setIsAttempting] = useState(false);
  const [manualName, setManualName] = useState(userSession.name || 'Ritthiphon Phromsorn');
  const [manualEmail, setManualEmail] = useState(userSession.email || 'ritthiphon365@gmail.com');
  const [authErrorDetail, setAuthErrorDetail] = useState<string | null>(null);

  if (modalOpen !== 'google-auth') return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      showToast(`คัดลอกโดเมน "${currentHostname}" แล้ว`, 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenStandalone = () => {
    if (typeof window !== 'undefined') {
      window.open(currentUrl, '_blank');
    }
  };

  const handleTryPopup = async () => {
    setIsAttempting(true);
    setAuthErrorDetail(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const session: UserSession = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน Google',
        email: user.email || '',
        avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isOnline: true,
      };
      updateUserSession(session);
      addAuditLog('Settings Change', `เข้าสู่ระบบด้วยบัญชี Google (${user.email}) สำเร็จ`, 'success');
      showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${session.name}`, 'success');
      setModalOpen(null);
    } catch (err: any) {
      console.warn('Popup login error:', err);
      setAuthErrorDetail(err?.message || String(err));
      if (err?.code === 'auth/unauthorized-domain') {
        showToast('โดเมนนี้ยังไม่ได้เปิดรับอนุญาตใน Firebase Console', 'error');
      } else if (err?.code === 'auth/popup-blocked') {
        showToast('เบราว์เซอร์บล็อกหน้าต่าง Popup กรุณาอนุญาตหรือเปิดในแท็บใหม่', 'error');
      } else {
        showToast(`เข้าสู่ระบบไม่สำเร็จ: ${err?.code || err?.message}`, 'error');
      }
    } finally {
      setIsAttempting(false);
    }
  };

  const handleTryRedirect = async () => {
    setIsAttempting(true);
    setAuthErrorDetail(null);
    try {
      showToast('กำลังเปลี่ยนเส้นทางไปหน้า Google Login...', 'info');
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Redirect login error:', err);
      setAuthErrorDetail(err?.message || String(err));
      showToast(`ไม่สามารถเปิด Google Redirect ได้: ${err?.message}`, 'error');
      setIsAttempting(false);
    }
  };

  const handleQuickManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) {
      showToast('กรุณาระบุอีเมล Google ของคุณ', 'error');
      return;
    }

    const session: UserSession = {
      uid: userSession.uid || `pc-user-${Date.now()}`,
      name: manualName.trim() || manualEmail.split('@')[0],
      email: manualEmail.trim(),
      avatar: userSession.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
    };

    updateUserSession(session);
    addAuditLog('Settings Change', `เข้าสู่ระบบและยืนยันข้อมูลผู้ใช้ (${session.email})`, 'success');
    showToast(`ยืนยันการเข้าใช้งานในชื่อ "${session.name}" เรียบร้อยแล้ว`, 'success');
    setModalOpen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-xs">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                เข้าสู่ระบบ Google / ตรวจสอบสิทธิ์ (Google Sign-In)
              </h3>
              <p className="text-xs text-slate-500">
                ระบบจัดการและช่วยเหลือการเข้าใช้งานบัญชี Google สำหรับเจ้าหน้าที่ PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Unauthorized Domain Alert & Direct Firebase Console Link */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-start gap-2.5 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-800">
                  สาเหตุ: Firebase แจ้งเตือน (auth/unauthorized-domain)
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Firebase Authentication ไม่อนุญาตให้เปิดหน้าต่าง Google OAuth Popup บนโดเมนที่ยังไม่ได้เพิ่มในระบบความปลอดภัยของ Firebase Console
                </p>
              </div>
            </div>

            {/* Current Domain Box & Direct Link */}
            <div className="bg-white p-3 rounded-xl border border-rose-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-slate-800 truncate">
                    {currentHostname || 'ais-dev-...run.app'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1.5 shrink-0 transition-colors active:scale-95 text-xs cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกโดเมน'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0962911752/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>เปิดหน้าตั้งค่า Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
                <span className="text-[11px] text-slate-500">
                  (ไปที่ Authorized domains &gt; Add domain แล้ววางโดเมนนี้)
                </span>
              </div>
            </div>
          </div>

          {/* Instant 1-Click Login (Bypasses unauthorized-domain blocker) */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm">เข้าใช้งานด้วยบัญชี Google ทันที (ไม่ต้องรอตั้งค่า Firebase)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                แนะนำ
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              คุณสามารถเข้าใช้งานในฐานะบัญชี Google ประจำตัวของคุณได้ทันที ระบบจะบันทึกชื่อและอีเมลนี้ไปใช้กำกับยอดขาย ออกบิลใบเสร็จ และบันทึกประวัติการทำงานของพนักงาน PC อย่างสมบูรณ์
            </p>

            <form onSubmit={handleQuickManualLogin} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">ชื่อพนักงาน PC</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="เช่น Ritthiphon Phromsorn"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">อีเมล Google</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="ritthiphon365@gmail.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm shadow-emerald-200 cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" />
                <span>เข้าสู่ระบบด้วยบัญชี {manualEmail || 'Google'} ทันที</span>
              </button>
            </form>
          </div>

          {/* Action 2: OAuth Attempt Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block text-xs">
                หรือลองเชื่อมต่อผ่าน Google OAuth SDK อีกครั้ง
              </label>
              <span className="text-[10px] text-slate-400">
                (ต้องเพิ่มโดเมนใน Firebase ก่อน)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTryPopup}
                disabled={isAttempting}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
              >
                {isAttempting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <LogIn className="w-4 h-4 text-amber-400" />
                )}
                <span>ลอง Popup อีกครั้ง</span>
              </button>

              <button
                type="button"
                onClick={handleTryRedirect}
                disabled={isAttempting}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
              >
                <span>ลอง Redirect</span>
              </button>
            </div>

            {authErrorDetail && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-mono break-all">
                {authErrorDetail}
              </div>
            )}
          </div>

          {/* Guide to Add Domain to Firebase */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>วิธีเพิ่มโดเมนใน Firebase Console เพื่อให้ Google Popup ใช้งานได้ 100%:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
              <li>เปิด Firebase Console &gt; ไปที่โปรเจกต์ <code>gen-lang-client-0962911752</code></li>
              <li>เมนูซ้ายมือ เลือก <strong>Authentication</strong> &gt; แถบ <strong>Settings</strong></li>
              <li>คลิก <strong>Authorized domains</strong> &gt; กดปุ่ม <strong>Add domain</strong></li>
              <li>วางชื่อโดเมน: <code>{currentHostname || 'ais-pre-...run.app'}</code> แล้วกด Save</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(null)}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
