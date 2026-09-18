import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  CheckCircle2,
  Share,
  PlusSquare,
  Download,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PwaInstallModal: React.FC = () => {
  const { modalOpen, setModalOpen } = useApp();
  const [activePlatform, setActivePlatform] = useState<'all' | 'desktop' | 'mobile'>('all');

  if (modalOpen !== 'install-pwa') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              ติดตั้งเป็นแอปบน Desktop และ มือถือ
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* App Icon Showcase */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 rounded-2xl border border-slate-800 text-white flex items-center gap-4">
            <img
              src="./icon-192.png"
              alt="Sale Paint App Icon"
              className="w-16 h-16 rounded-2xl object-cover shadow-lg ring-2 ring-rose-500/40 shrink-0"
            />
            <div className="overflow-hidden flex-1">
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                Official App Icon
              </span>
              <h3 className="text-sm font-bold text-white truncate">
                Sale Paint Pro
              </h3>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                ไอคอนความละเอียดสูง ออกแบบพิเศษสำหรับแสดงบน Desktop และหน้าจอโฮมมือถือ
              </p>
            </div>
            <a
              href="./icon-512.png"
              download="salepaint-icon.png"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด</span>
            </a>
          </div>

          {/* Platform Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActivePlatform('all')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                activePlatform === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setActivePlatform('desktop')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all ${
                activePlatform === 'desktop'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-blue-600" />
              Desktop (PC/Mac)
            </button>
            <button
              onClick={() => setActivePlatform('mobile')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all ${
                activePlatform === 'mobile'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-600" />
              มือถือ (iOS/Android)
            </button>
          </div>

          {/* Desktop Instruction */}
          {(activePlatform === 'all' || activePlatform === 'desktop') && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>สำหรับคอมพิวเตอร์ / โน้ตบุ๊ก (Chrome / Edge บน Windows & Mac)</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  มองที่แถบพิมพ์ที่อยู่เว็บ (Address bar ด้านบนขวา) จะมีไอคอน{' '}
                  <b className="text-blue-700 bg-blue-100/80 px-1 py-0.5 rounded font-mono">
                    "ติดตั้งแอป" (Install App / รูปจอคอมพิวเตอร์ลูกศรลง)
                  </b>
                </li>
                <li>คลิกปุ่ม <b>"ติดตั้ง" (Install)</b></li>
                <li>
                  ไอคอนแอปจะไปปรากฏที่ <b>Desktop</b>, <b>Start Menu</b> หรือ <b>Dock (Mac)</b> เปิดใช้งานแบบหน้าต่างแยกได้เหมือนโปรแกรมเต็มรูปแบบ
                </li>
              </ol>
            </div>
          )}

          {/* Mobile Instruction */}
          {(activePlatform === 'all' || activePlatform === 'mobile') && (
            <div className="space-y-3">
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  สำหรับ iPhone / iPad (Safari)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>แตะปุ่ม <b>แชร์ (Share)</b> ที่แถบเครื่องมือด้านล่างของ Safari</li>
                  <li>เลื่อนลงมาแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</b></li>
                  <li>แตะ <b>"เพิ่ม" (Add)</b> ที่มุมบนขวา</li>
                </ol>
              </div>

              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  สำหรับ Android (Chrome)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>แตะไอคอน <b>จุด 3 จุด (Menu)</b> ที่มุมขวาบนของ Chrome</li>
                  <li>เลือก <b>"ติดตั้งแอป" (Install App)</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></li>
                  <li>กดยืนยันการติดตั้ง</li>
                </ol>
              </div>
            </div>
          )}

          <div className="p-3 bg-rose-50 rounded-2xl text-rose-800 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-rose-600" /> สิทธิประโยชน์เมื่อติดตั้ง:
            </div>
            <p className="text-[11px] text-rose-700">
              เปิดเต็มจอโดยไม่มีแถบเครื่องมือบราวเซอร์ รวดเร็ว ไม่ต้องดาวน์โหลดผ่าน App Store และทำงานแบบออฟไลน์ได้ 100%
            </p>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setModalOpen(null)}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
