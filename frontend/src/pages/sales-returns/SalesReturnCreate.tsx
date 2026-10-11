import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function SalesReturnCreate() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales-returns')} className="p-2 border rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Process Sales Return</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Receipt / Sale ID</label><input type="text" placeholder="SALE-1001" className="w-full p-2 border rounded text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Return Reason</label><input type="text" placeholder="Defective / Changed mind" className="w-full p-2 border rounded text-sm" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button onClick={() => navigate('/sales-returns')} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={() => navigate('/sales-returns')} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">Issue Refund / Store Credit</button>
        </div>
      </div>
    </div>
  );
}
