import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OrderModal: React.FC = () => {
  const { modalOpen, setModalOpen, products, brandSettings, showToast } = useApp();
  const [storeName, setStoreName] = useState(brandSettings.branch || 'ศูนย์ตัวแทนจำหน่ายสี Nippon Paint');
  const [customerName, setCustomerName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [size, setSize] = useState('5GL');
  const [quantity, setQuantity] = useState(2);
  const [colorCode, setColorCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (modalOpen !== 'order-gen') return null;

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const orderText = `📦 [ใบสั่งสินค้า / SALES ORDER]
----------------------------
🏬 ร้านค้า/สาขา: ${storeName}
👤 ลูกค้า/ช่าง: ${customerName || 'ทั่วไป'}
📅 วันที่สั่ง: ${new Date().toLocaleDateString('th-TH')}
----------------------------
🎨 สินค้า: ${product?.name} (${product?.sku})
📐 ขนาด: ${size}
🏷️ เฉดสี: ${colorCode || 'ขาว/เบสมาตรฐาน'}
🔢 จำนวน: ${quantity} ถัง/กระป๋อง
----------------------------
* ส่งจากระบบ Sale Paint Mobile Web App`;

  const handleCopy = () => {
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    showToast('คัดลอกข้อความ Order สำเร็จ พร้อมส่ง LINE', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLine = () => {
    handleCopy();
    const encoded = encodeURIComponent(orderText);
    window.open(`https://line.me/R/msg/text/?${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              สร้างใบสั่งสินค้า (Order Generator)
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ร้านค้า / ศูนย์จำหน่าย</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">ชื่อลูกค้า / โครงการ</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="เช่น ช่างเก่ง"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">รหัสเฉดสี</label>
              <input
                type="text"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="เช่น OW-1002"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">เลือกสินค้า</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">ขนาด</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {product?.availableSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">จำนวน (ถัง)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Preview Box */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ข้อความที่เตรียมส่ง (Preview):</label>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
              {orderText}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
          </button>
          <button
            onClick={handleOpenLine}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>เปิดส่งใน LINE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
