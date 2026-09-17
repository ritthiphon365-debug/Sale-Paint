import React, { useState } from 'react';
import {
  X,
  Package,
  Plus,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BulkStockModal: React.FC = () => {
  const { modalOpen, setModalOpen, products, bulkAddStock } = useApp();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [size, setSize] = useState('5GL');
  const [base, setBase] = useState('A');
  const [quantity, setQuantity] = useState(10);
  const [note, setNote] = useState('รับสินค้าประจำสัปดาห์');

  if (modalOpen !== 'bulk-stock') return null;

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    bulkAddStock([
      {
        productId: product.id,
        size: size as any,
        base: product.hasBases ? (base as any) : undefined,
        quantity,
        note,
      },
    ]);
    setModalOpen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              รับสินค้าเข้าสต็อก (Stock In)
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">เลือกสินค้า</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">ขนาด (Size)</label>
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

            {product?.hasBases && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">เบส (Base)</label>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {product.availableBases?.map((b) => (
                    <option key={b} value={b}>
                      Base {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">จำนวนที่รับเข้า (หน่วย)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">หมายเหตุการรับเข้า</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น รถส่งของรอบเช้า, โอนย้ายสต็อก"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(null)}
              className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกสต็อกเข้า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
