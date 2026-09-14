import { History } from 'lucide-react';

export function StockMovements() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-slate-500" />
          Stock Movements
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        Stock movement ledger will be displayed here.
      </div>
    </div>
  );
}
