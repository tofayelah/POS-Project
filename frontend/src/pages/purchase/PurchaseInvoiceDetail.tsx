import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router';

export const PurchaseInvoiceDetail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto bg-slate-50 min-h-full">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/purchases/invoices')}
          className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-700" />
          Purchase Invoice Detail - PINV-9012
        </h1>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="font-bold text-lg text-slate-900">Apex Wholesale Distributors</p>
            <p className="text-sm font-medium text-slate-600">Date: 2026-10-10</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-rose-700">Unpaid</p>
            <p className="text-2xl font-bold font-mono text-slate-900">৳1,250.00</p>
          </div>
        </div>
      </div>
    </div>
  );
};
