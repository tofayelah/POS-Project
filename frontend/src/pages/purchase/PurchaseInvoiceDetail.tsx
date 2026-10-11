import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router';

export const PurchaseInvoiceDetail: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase/invoices')} className="p-2 border rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          Purchase Invoice Detail - PINV-9012
        </h1>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border space-y-4">
        <div className="flex justify-between border-b pb-4">
          <div><p className="font-bold text-lg">Apex Wholesale</p><p className="text-sm text-slate-500">Date: 2026-10-10</p></div>
          <div className="text-right"><p className="text-sm font-semibold text-rose-600">Unpaid</p><p className="text-xl font-bold">$1,250.00</p></div>
        </div>
      </div>
    </div>
  );
};
