import React from 'react';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

export const GoodsReceiptDetail: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase/goods-receipts')} className="p-2 border rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-indigo-600" />
          Goods Receipt Detail - GRN-8080
        </h1>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border space-y-4">
        <div className="flex justify-between border-b pb-4">
          <div><p className="font-bold">Apex Wholesale</p><p className="text-sm text-slate-500">Ref: PO-2026-001</p></div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold h-fit">Verified</span>
        </div>
      </div>
    </div>
  );
};
