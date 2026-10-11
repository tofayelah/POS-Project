import React from 'react';
import { Settings, Sliders, Globe, Shield } from 'lucide-react';

export const SettingsCenter: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            Configuration Center
          </h1>
          <p className="text-sm text-slate-500">Global system preferences, localized branding, tax rules, and currency settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 font-bold">
            <Globe className="w-5 h-5" /> Localization & Regional Format
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Currency Symbol</label>
              <input type="text" defaultValue="$" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg" />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Timezone</label>
              <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg">
                <option>UTC (Coordinated Universal Time)</option>
                <option>Asia/Dhaka (GMT+6)</option>
                <option>America/New_York (EST)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 font-bold">
            <Shield className="w-5 h-5" /> Security & Audit Controls
          </div>
          <p className="text-sm text-slate-500">Configure session timeout, enforced MFA, and audit log retention rules.</p>
        </div>
      </div>
    </div>
  );
};
