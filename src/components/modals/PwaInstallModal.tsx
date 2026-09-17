import React from 'react';
import {
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PwaInstallModal: React.FC = () => {
  const { modalOpen, setModalOpen } = useApp();

  if (modalOpen !== 'install-pwa') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              วิธีติดตั้งเป็นแอปพลิเคชันบนมือถือ (PWA)
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              สำหรับ iPhone / iPad (Safari)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>แตะปุ่ม <b>แชร์ (Share)</b> ที่แถบเครื่องมือด้านล่าง</li>
              <li>เลื่อนลงมาแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</b></li>
              <li>แตะ <b>"เพิ่ม" (Add)</b> ที่มุมขวาบน</li>
            </ol>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              สำหรับ Android (Chrome)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>แตะไอคอน <b>จุด 3 จุด (Menu)</b> ที่มุมขวาบน</li>
              <li>เลือก <b>"ติดตั้งแอป" (Install App)</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></li>
              <li>กดยืนยันการติดตั้ง</li>
            </ol>
          </div>

          <div className="p-3 bg-rose-50 rounded-2xl text-rose-700 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> ประโยชน์เมื่อติดตั้ง:
            </div>
            <p className="text-[11px]">
              เปิดใช้งานได้เต็มจอเหมือน Native App ไม่ต้องโหลดจาก App Store และสามารถบันทึกยอดขายแบบออฟไลน์ได้
            </p>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setModalOpen(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};
