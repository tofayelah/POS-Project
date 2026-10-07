import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Award,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Building,
  Users,
  Package,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import {
  SalesIntelligenceDashboardMetrics,
  DemandForecastRow,
  DemandRiskRow,
} from '../../types/crm';

export const SalesIntelligenceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<SalesIntelligenceDashboardMetrics | null>(null);
  const [forecasts, setForecasts] = useState<DemandForecastRow[]>([]);
  const [reorders, setReorders] = useState<DemandRiskRow[]>([]);

  const [dateRange, setDateRange] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'SALESPEOPLE' | 'RETURNS' | 'FORECAST' | 'REORDERS'>('REVENUE');

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - dateRange * 86400000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const [dashRes, forecastRes, reorderRes] = await Promise.all([
        crmApi.getSalesDashboard({ start_date: startDate, end_date: endDate }),
        crmApi.getDemandForecast({ forecast_days: 30 }),
        crmApi.getReorderRecommendations({ lead_time_days: 7, buffer_days: 14 }),
      ]);

      setMetrics(dashRes);
      setForecasts(forecastRes);
      setReorders(reorderRes);
    } catch (err) {
      console.error('Failed to load sales intelligence', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            {t('crm.salesIntelligence.title', 'Sales Intelligence & Demand Forecast')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.salesIntelligence.subtitle', 'Revenue analytics, branch performance, salesperson attribution, returns diagnostics, and velocity forecasting.')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Time Range:</span>
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateRange === days
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {days} Days
            </button>
          ))}
          <button
            onClick={fetchSalesData}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('REVENUE')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'REVENUE'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Revenue & Branch Performance
        </button>
        <button
          onClick={() => setActiveTab('SALESPEOPLE')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'SALESPEOPLE'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          {t('crm.salesIntelligence.salespeople', 'Salesperson Leaderboard')}
        </button>
        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'RETURNS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {t('crm.salesIntelligence.returns', 'Sales Returns & Diagnostics')}
        </button>
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'FORECAST'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {t('crm.salesIntelligence.demandForecast', 'Sales Velocity & Demand Forecast')}
        </button>
        <button
          onClick={() => setActiveTab('REORDERS')}
          className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'REORDERS'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('crm.salesIntelligence.reorderStock', 'Stockout & Procurement Reorders')}
        </button>
      </div>

      {loading && !metrics ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
          Loading sales intelligence data...
        </div>
      ) : (
        <>
          {/* TAB 1: REVENUE & BRANCHES */}
          {activeTab === 'REVENUE' && metrics && (
            <div className="space-y-6">
              {/* Branch Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-400" />
                  {t('crm.salesIntelligence.branchSales', 'Branch Sales Performance')}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Branch Name</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Unique Customers</th>
                        <th className="p-3 text-right">Gross Sales</th>
                        <th className="p-3 text-right">Returns</th>
                        <th className="p-3 text-right">Net Sales</th>
                        <th className="p-3 text-right">COGS</th>
                        <th className="p-3 text-right">Gross Profit</th>
                        <th className="p-3 text-right">Margin %</th>
                        <th className="p-3 text-right">AOV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(metrics.branch_breakdown || []).map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-white">{b.branch_name}</td>
                          <td className="p-3 text-right">{b.orders}</td>
                          <td className="p-3 text-right">{b.customers}</td>
                          <td className="p-3 text-right text-slate-200">৳{Number(b.gross_sales).toLocaleString()}</td>
                          <td className="p-3 text-right text-rose-400">৳{Number(b.returns).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">৳{Number(b.net_sales).toLocaleString()}</td>
                          <td className="p-3 text-right text-slate-400">৳{Number(b.cogs).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-white">৳{Number(b.gross_profit).toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold text-emerald-400">{b.margin_pct}%</td>
                          <td className="p-3 text-right text-slate-300">৳{Number(b.average_order_value).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Customers & Top Products Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Customers */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    {t('crm.salesIntelligence.topCustomers', 'Top Customers by Net Sales')}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Customer</th>
                          <th className="p-2 text-right">Orders</th>
                          <th className="p-2 text-right">Net Sales</th>
                          <th className="p-2 text-right">Profit</th>
                          <th className="p-2 text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(metrics.top_customers || []).map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2">
                              <div className="font-semibold text-white">{c.customer_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{c.customer_code}</div>
                            </td>
                            <td className="p-2 text-right">{c.orders}</td>
                            <td className="p-2 text-right font-bold text-emerald-400">৳{Number(c.net_sales).toLocaleString()}</td>
                            <td className="p-2 text-right font-semibold text-white">৳{Number(c.gross_profit).toLocaleString()}</td>
                            <td className="p-2 text-right text-emerald-400">{c.margin_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-400" />
                    {t('crm.salesIntelligence.topProducts', 'Top Performing Products')}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Product</th>
                          <th className="p-2 text-right">Units</th>
                          <th className="p-2 text-right">Revenue</th>
                          <th className="p-2 text-right">Profit</th>
                          <th className="p-2 text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(metrics.top_products || []).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2">
                              <div className="font-semibold text-white">{p.name}</div>
                              <div className="text-[10px] text-emerald-400 font-mono">{p.sku}</div>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-200">{p.units_sold}</td>
                            <td className="p-2 text-right font-bold text-emerald-400">৳{Number(p.revenue).toLocaleString()}</td>
                            <td className="p-2 text-right text-slate-200">৳{Number(p.gross_profit).toLocaleString()}</td>
                            <td className="p-2 text-right text-emerald-400">{p.margin_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALESPERSON LEADERBOARD */}
          {activeTab === 'SALESPEOPLE' && metrics && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                Salesperson Performance Leaderboard
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Rank & Salesperson</th>
                      <th className="p-3 text-right">Completed Orders</th>
                      <th className="p-3 text-right">Gross Sales</th>
                      <th className="p-3 text-right">Net Sales</th>
                      <th className="p-3 text-right">COGS</th>
                      <th className="p-3 text-right">Gross Profit</th>
                      <th className="p-3 text-right">Margin %</th>
                      <th className="p-3 text-right">Average Order Value (AOV)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(metrics.salesperson_leaderboard || []).map((sp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              idx === 0 ? 'bg-amber-500 text-slate-950' :
                              idx === 1 ? 'bg-slate-400 text-slate-950' :
                              idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-white">{sp.salesperson_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium text-slate-200">{sp.orders}</td>
                        <td className="p-3 text-right font-semibold text-slate-200">৳{Number(sp.gross_sales).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">৳{Number(sp.net_sales).toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-400">৳{Number(sp.cogs).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-white">৳{Number(sp.gross_profit).toLocaleString()}</td>
                        <td className="p-3 text-right font-semibold text-emerald-400">{sp.margin_pct}%</td>
                        <td className="p-3 text-right text-slate-300">৳{Number(sp.average_order_value).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RETURNS DIAGNOSTICS */}
          {activeTab === 'RETURNS' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">Gross Sales in Period</span>
                  <div className="text-xl font-bold text-white">৳{(metrics.return_metrics?.gross_sales ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">Total Returns Count</span>
                  <div className="text-xl font-bold text-rose-400">{metrics.return_metrics?.return_count ?? 0}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">Refund Total Value</span>
                  <div className="text-xl font-bold text-rose-400">৳{(metrics.return_metrics?.return_value ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">Return Rate %</span>
                  <div className="text-xl font-bold text-amber-400">{metrics.return_metrics?.return_rate_pct ?? 0}%</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Returns Grouped by Stated Reason
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Return Reason</th>
                        <th className="p-3 text-right">Occurrence Count</th>
                        <th className="p-3 text-right">Total Refund Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(metrics.return_metrics?.by_reason || []).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-slate-200">{r.reason_name}</td>
                          <td className="p-3 text-right font-bold text-white">{r.count}</td>
                          <td className="p-3 text-right font-bold text-rose-400">৳{Number(r.value).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEMAND FORECAST */}
          {activeTab === 'FORECAST' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Deterministic Velocity-Based Demand Forecast (30 Days)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Sold (30d)</th>
                      <th className="p-3 text-right">Sold (60d)</th>
                      <th className="p-3 text-right">Sold (90d)</th>
                      <th className="p-3 text-right">Avg Daily Sales (ADS)</th>
                      <th className="p-3 text-right">Projected 30d Demand</th>
                      <th className="p-3 text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {forecasts.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-emerald-400 font-semibold">{f.sku}</td>
                        <td className="p-3 font-medium text-white">{f.name}</td>
                        <td className="p-3 text-right text-slate-300">{f.units_sold_30d}</td>
                        <td className="p-3 text-right text-slate-400">{f.units_sold_60d}</td>
                        <td className="p-3 text-right text-slate-500">{f.units_sold_90d}</td>
                        <td className="p-3 text-right font-bold text-cyan-400">{f.avg_daily_sales} / day</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{f.projected_demand} units</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.trend === 'GROWING' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            f.trend === 'DECLINING' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {f.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PROCUREMENT STOCKOUT & REORDERS */}
          {activeTab === 'REORDERS' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-400" />
                Customer Demand Integration — Stockout Risks & Reorder Advice
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Avg Daily Sales</th>
                      <th className="p-3 text-right">Current On-Hand</th>
                      <th className="p-3 text-right">Incoming (PO)</th>
                      <th className="p-3 text-right">Effective Stock</th>
                      <th className="p-3 text-right">Days Remaining</th>
                      <th className="p-3 text-center">Risk Level</th>
                      <th className="p-3 text-right">Recommended Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reorders.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-emerald-400 font-semibold">{r.sku}</td>
                        <td className="p-3 font-medium text-white">{r.product_name}</td>
                        <td className="p-3 text-right text-cyan-400 font-semibold">{r.avg_daily_sales}</td>
                        <td className="p-3 text-right text-slate-300">{r.current_stock}</td>
                        <td className="p-3 text-right text-indigo-400">{r.incoming_po_stock}</td>
                        <td className="p-3 text-right font-bold text-white">{r.effective_stock}</td>
                        <td className="p-3 text-right font-bold text-amber-400">{r.days_remaining} days</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.demand_risk === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            r.demand_risk === 'MEDIUM' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                          }`}>
                            {r.demand_risk}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {r.recommended_reorder_qty > 0 ? `${r.recommended_reorder_qty} units` : 'Adequate'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesIntelligenceDashboard;
