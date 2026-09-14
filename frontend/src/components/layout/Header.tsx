import { Search, Bell, Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full w-96">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search modules, records, or settings..." 
          className="bg-transparent border-none text-sm w-full outline-none text-slate-600"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            <Activity className="w-3 h-3" /> API OK
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">v1.0.0</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer rounded-full relative transition-colors">
          <Bell className="w-4 h-4 text-slate-600" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
        </div>
      </div>
    </header>
  );
}
