import React from 'react';
import { Link } from 'react-router';
import {
  ShoppingCart,
  Barcode,
  Package,
  ShoppingBag,
  FileText,
  Receipt,
  Users,
  Monitor
} from 'lucide-react';
import { useLanguage } from '../../i18n';

export function QuickActionShortcuts() {
  const { t } = useLanguage();

  const shortcuts = [
    {
      to: '/pos',
      id: 'quick-action-pos',
      label: t('quickActions.posRegister', 'POS Register'),
      description: t('quickActions.posDesc', 'Counter Billing'),
      icon: ShoppingCart,
      color: 'bg-emerald-500 text-white',
      borderColor: 'border-emerald-200 hover:border-emerald-400',
      bgHover: 'hover:bg-emerald-50/50',
    },
    {
      to: '/products/item-information',
      id: 'quick-action-items',
      label: t('quickActions.itemInfo', 'Item Information'),
      description: t('quickActions.itemDesc', 'Search & Barcode'),
      icon: Barcode,
      color: 'bg-cyan-500 text-white',
      borderColor: 'border-cyan-200 hover:border-cyan-400',
      bgHover: 'hover:bg-cyan-50/50',
    },
    {
      to: '/inventory',
      id: 'quick-action-inventory',
      label: t('quickActions.inventory', 'Stock Levels'),
      description: t('quickActions.inventoryDesc', 'Live Warehouses'),
      icon: Package,
      color: 'bg-teal-500 text-white',
      borderColor: 'border-teal-200 hover:border-teal-400',
      bgHover: 'hover:bg-teal-50/50',
    },
    {
      to: '/purchases',
      id: 'quick-action-purchases',
      label: t('quickActions.purchases', 'Purchases'),
      description: t('quickActions.purchasesDesc', 'GRN & Invoices'),
      icon: ShoppingBag,
      color: 'bg-amber-500 text-white',
      borderColor: 'border-amber-200 hover:border-amber-400',
      bgHover: 'hover:bg-amber-50/50',
    },
    {
      to: '/accounting',
      id: 'quick-action-accounting',
      label: t('quickActions.accounting', 'Accounting'),
      description: t('quickActions.accountingDesc', 'Ledger & Journals'),
      icon: FileText,
      color: 'bg-indigo-500 text-white',
      borderColor: 'border-indigo-200 hover:border-indigo-400',
      bgHover: 'hover:bg-indigo-50/50',
    },
    {
      to: '/expenses',
      id: 'quick-action-expenses',
      label: t('quickActions.expenses', 'Expenses'),
      description: t('quickActions.expensesDesc', 'Petty & Utilities'),
      icon: Receipt,
      color: 'bg-rose-500 text-white',
      borderColor: 'border-rose-200 hover:border-rose-400',
      bgHover: 'hover:bg-rose-50/50',
    },
    {
      to: '/customers',
      id: 'quick-action-customers',
      label: t('quickActions.customers', 'Customers'),
      description: t('quickActions.customersDesc', 'AR & Loyalty'),
      icon: Users,
      color: 'bg-violet-500 text-white',
      borderColor: 'border-violet-200 hover:border-violet-400',
      bgHover: 'hover:bg-violet-50/50',
    },
    {
      to: '/pos/terminals',
      id: 'quick-action-terminals',
      label: t('quickActions.terminals', 'POS Terminals'),
      description: t('quickActions.terminalsDesc', 'Counters & Devices'),
      icon: Monitor,
      color: 'bg-blue-600 text-white',
      borderColor: 'border-blue-200 hover:border-blue-400',
      bgHover: 'hover:bg-blue-50/50',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {t('dashboard.quickActions', 'Quick Operations & Shortcuts')}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {t('dashboard.quickActionsSubtitle', 'Direct access to retail point-of-sale and back-office modules')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {shortcuts.map((sc) => {
          const Icon = sc.icon;
          return (
            <Link
              key={sc.id}
              to={sc.to}
              id={sc.id}
              className={`group flex flex-col items-center text-center p-3.5 rounded-xl border border-slate-200 ${sc.borderColor} ${sc.bgHover} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs mb-2.5 transition-transform duration-200 group-hover:scale-105 ${sc.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-slate-900 line-clamp-1">
                {sc.label}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 line-clamp-1">
                {sc.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
