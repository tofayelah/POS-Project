import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Plus,
  RefreshCw,
  Phone,
  Calendar,
  User,
  Filter,
  CheckSquare,
  FileCheck,
  Award,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import crmApi from '../../api/crm';
import {
  CustomerActivity,
  CustomerComplaint,
  CustomerOpportunity,
  CrmDashboardMetrics,
} from '../../types/crm';
import { customersApi } from '../../api/customers';
import { Customer } from '../../types/customer';

export const CrmActivityCenter: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ACTIVITIES' | 'COMPLAINTS' | 'OPPORTUNITIES'>('ACTIVITIES');
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardMetrics, setDashboardMetrics] = useState<CrmDashboardMetrics | null>(null);

  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals
  const [showActivityModal, setShowActivityModal] = useState<boolean>(false);
  const [showComplaintModal, setShowComplaintModal] = useState<boolean>(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState<boolean>(false);

  // Resolution / Completion Modal
  const [completingActivity, setCompletingActivity] = useState<CustomerActivity | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [resolvingComplaint, setResolvingComplaint] = useState<CustomerComplaint | null>(null);
  const [resolutionText, setResolutionText] = useState<string>('');

  // Form states
  const [newActivity, setNewActivity] = useState({
    customer_id: '',
    activity_type: 'CALL',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    follow_up_date: '',
  });

  const [newComplaint, setNewComplaint] = useState({
    customer_id: '',
    category: 'PRODUCT',
    subject: '',
    description: '',
    priority: 'MEDIUM',
  });

  const [newOpportunity, setNewOpportunity] = useState({
    customer_id: '',
    title: '',
    stage: 'PROSPECT',
    estimated_value: 0,
    probability: 20,
    expected_close_date: '',
    notes: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dash, actRes, compRes, oppRes, custRes] = await Promise.all([
        crmApi.getCrmDashboard(),
        crmApi.getActivities(),
        crmApi.getComplaints(),
        crmApi.getOpportunities(),
        customersApi.getCustomers({ page: 1 }),
      ]);
      setDashboardMetrics(dash);
      setActivities(actRes);
      setComplaints(compRes);
      setOpportunities(oppRes);
      setCustomers((custRes.data?.data || []) as unknown as Customer[]);
    } catch (err) {
      console.error('Failed to load CRM data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmApi.createActivity({
        customer_id: Number(newActivity.customer_id),
        activity_type: newActivity.activity_type as any,
        subject: newActivity.subject,
        description: newActivity.description,
        priority: newActivity.priority as any,
        follow_up_date: newActivity.follow_up_date || undefined,
      });
      setShowActivityModal(false);
      setNewActivity({
        customer_id: '',
        activity_type: 'CALL',
        subject: '',
        description: '',
        priority: 'MEDIUM',
        follow_up_date: '',
      });
      loadAllData();
    } catch (err) {
      console.error('Failed to create activity', err);
    }
  };

  const handleCompleteActivity = async () => {
    if (!completingActivity) return;
    try {
      await crmApi.completeActivity(completingActivity.id, completionNotes);
      setCompletingActivity(null);
      setCompletionNotes('');
      loadAllData();
    } catch (err) {
      console.error('Failed to complete activity', err);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmApi.createComplaint({
        customer_id: Number(newComplaint.customer_id),
        category: newComplaint.category,
        subject: newComplaint.subject,
        description: newComplaint.description,
        priority: newComplaint.priority as any,
      });
      setShowComplaintModal(false);
      setNewComplaint({
        customer_id: '',
        category: 'PRODUCT',
        subject: '',
        description: '',
        priority: 'MEDIUM',
      });
      loadAllData();
    } catch (err) {
      console.error('Failed to create complaint', err);
    }
  };

  const handleResolveComplaint = async () => {
    if (!resolvingComplaint) return;
    try {
      await crmApi.resolveComplaint(resolvingComplaint.id, resolutionText);
      setResolvingComplaint(null);
      setResolutionText('');
      loadAllData();
    } catch (err) {
      console.error('Failed to resolve complaint', err);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmApi.createOpportunity({
        customer_id: Number(newOpportunity.customer_id),
        title: newOpportunity.title,
        stage: newOpportunity.stage as any,
        estimated_value: Number(newOpportunity.estimated_value),
        probability: Number(newOpportunity.probability),
        expected_close_date: newOpportunity.expected_close_date || undefined,
        notes: newOpportunity.notes,
      });
      setShowOpportunityModal(false);
      setNewOpportunity({
        customer_id: '',
        title: '',
        stage: 'PROSPECT',
        estimated_value: 0,
        probability: 20,
        expected_close_date: '',
        notes: '',
      });
      loadAllData();
    } catch (err) {
      console.error('Failed to create opportunity', err);
    }
  };

  const handleUpdateOpportunityStage = async (id: number, stage: any) => {
    try {
      await crmApi.updateOpportunity(id, { stage });
      loadAllData();
    } catch (err) {
      console.error('Failed to update stage', err);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-400" />
            {t('crm.activity.title', 'CRM Activity & Opportunity Center')}
          </h1>
          <p className="text-sm text-slate-400">
            {t('crm.activity.subtitle', 'Record calls, schedule visits, manage complaints, and track sales opportunities.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivityModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('crm.activity.newActivity', 'Log Activity')}
          </button>
          <button
            onClick={() => setShowComplaintModal(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('crm.activity.newComplaint', 'Log Complaint')}
          </button>
          <button
            onClick={() => setShowOpportunityModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('crm.activity.newOpportunity', 'New Opportunity')}
          </button>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {dashboardMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Open Activities</span>
            <div className="text-xl font-bold text-white">{dashboardMetrics.counts.open_activities}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Today's Tasks</span>
            <div className="text-xl font-bold text-indigo-400">{dashboardMetrics.counts.today_activities}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Pending Follow-ups</span>
            <div className="text-xl font-bold text-amber-400">{dashboardMetrics.counts.pending_follow_ups}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Open Complaints</span>
            <div className="text-xl font-bold text-rose-400">{dashboardMetrics.counts.open_complaints}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Critical Issues</span>
            <div className="text-xl font-bold text-rose-500">{dashboardMetrics.counts.critical_complaints}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">Pipeline Value</span>
            <div className="text-xl font-bold text-emerald-400">৳{Math.round(dashboardMetrics.pipeline_value).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ACTIVITIES')}
            className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ACTIVITIES'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            {t('crm.activity.tabActivities', 'Activities & Tasks')} ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLAINTS')}
            className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'COMPLAINTS'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {t('crm.activity.tabComplaints', 'Service Complaints')} ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('OPPORTUNITIES')}
            className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'OPPORTUNITIES'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            {t('crm.activity.tabOpportunities', 'Opportunities Pipeline')} ({opportunities.length})
          </button>
        </div>

        {/* Tab 1: Activities */}
        {activeTab === 'ACTIVITIES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Follow-up Date</th>
                  <th className="p-3 text-center">Priority</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No activities logged yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <span className="font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60 text-[10px]">
                          {act.activity_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{act.customer?.name}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{act.customer?.customer_code}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{act.subject}</td>
                      <td className="p-3 text-slate-400">{act.follow_up_date || 'No follow-up'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.priority === 'HIGH' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {act.priority}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {act.status === 'OPEN' && (
                          <button
                            onClick={() => {
                              setCompletingActivity(act);
                              setCompletionNotes('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Complaints */}
        {activeTab === 'COMPLAINTS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Ticket #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Subject & Issue</th>
                  <th className="p-3 text-center">Priority</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No customer complaints on file.
                    </td>
                  </tr>
                ) : (
                  complaints.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-rose-400">{comp.ticket_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{comp.customer?.name}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{comp.customer?.customer_code}</div>
                      </td>
                      <td className="p-3 text-slate-300">{comp.category}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{comp.subject}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{comp.description}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          comp.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          comp.priority === 'HIGH' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {comp.priority}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          comp.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' :
                          comp.status === 'IN_PROGRESS' ? 'bg-indigo-950 text-indigo-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {comp.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {comp.status !== 'RESOLVED' && comp.status !== 'CLOSED' && (
                          <button
                            onClick={() => {
                              setResolvingComplaint(comp);
                              setResolutionText('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium flex items-center gap-1 ml-auto"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Opportunities */}
        {activeTab === 'OPPORTUNITIES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Estimated Value</th>
                  <th className="p-3 text-center">Probability</th>
                  <th className="p-3 text-right">Expected Value</th>
                  <th className="p-3 text-center">Stage</th>
                  <th className="p-3 text-right">Advance Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No active sales opportunities in pipeline.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{opp.title}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{opp.customer?.name}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{opp.customer?.customer_code}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        ৳{Number(opp.estimated_value).toLocaleString()}
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {opp.probability_pct ?? opp.probability}%
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        ৳{Number(opp.expected_value || (opp.estimated_value * opp.probability / 100)).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          opp.stage === 'WON' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          opp.stage === 'LOST' ? 'bg-rose-950 text-rose-400' : 'bg-indigo-950 text-indigo-400'
                        }`}>
                          {opp.stage}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <select
                          value={opp.stage}
                          onChange={(e) => handleUpdateOpportunityStage(opp.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none"
                        >
                          <option value="PROSPECT">PROSPECT</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="PROPOSAL">PROPOSAL</option>
                          <option value="NEGOTIATION">NEGOTIATION</option>
                          <option value="WON">WON</option>
                          <option value="LOST">LOST</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Log CRM Activity
            </h2>
            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Customer</label>
                <select
                  required
                  value={newActivity.customer_id}
                  onChange={(e) => setNewActivity({ ...newActivity, customer_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Type</label>
                  <select
                    value={newActivity.activity_type}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="CALL">Call</option>
                    <option value="MEETING">Meeting</option>
                    <option value="EMAIL">Email</option>
                    <option value="VISIT">Store Visit</option>
                    <option value="TASK">Task</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Priority</label>
                  <select
                    value={newActivity.priority}
                    onChange={(e) => setNewActivity({ ...newActivity, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Subject</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Follow up on bulk cotton shirt order"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={newActivity.follow_up_date}
                  onChange={(e) => setNewActivity({ ...newActivity, follow_up_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Activity Modal */}
      {completingActivity && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Complete Activity
            </h2>
            <p className="text-xs text-slate-400 mb-4">Subject: {completingActivity.subject}</p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Completion Outcome / Notes</label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Summarize outcome of call/meeting..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCompletingActivity(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteActivity}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Mark Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" /> Log Service Complaint
            </h2>
            <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Customer</label>
                <select
                  required
                  value={newComplaint.customer_id}
                  onChange={(e) => setNewComplaint({ ...newComplaint, customer_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Category</label>
                  <select
                    value={newComplaint.category}
                    onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="PRODUCT">Product Quality</option>
                    <option value="BILLING">Billing / Price</option>
                    <option value="DELIVERY">Delivery Delay</option>
                    <option value="SERVICE">Staff Service</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Priority</label>
                  <select
                    value={newComplaint.priority}
                    onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Subject</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Defective stitching on shipment"
                  value={newComplaint.subject}
                  onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description / Problem Details</label>
                <textarea
                  required
                  rows={3}
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold">
                  Open Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Complaint Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" /> Resolve Complaint #{resolvingComplaint.ticket_number}
            </h2>
            <p className="text-xs text-slate-400 mb-4">{resolvingComplaint.subject}</p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Resolution Details (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Describe resolution (e.g. Replacement issued, credited to ledger)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveComplaint}
                  disabled={!resolutionText.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Confirm Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" /> New Sales Opportunity
            </h2>
            <form onSubmit={handleCreateOpportunity} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Customer</label>
                <select
                  required
                  value={newOpportunity.customer_id}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, customer_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Deal Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eid Festival Corporate Uniform Supply"
                  value={newOpportunity.title}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Estimated Value (BDT)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    value={newOpportunity.estimated_value}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, estimated_value: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Win Probability (%)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={newOpportunity.probability}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Stage</label>
                  <select
                    value={newOpportunity.stage}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, stage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="PROSPECT">PROSPECT</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="NEGOTIATION">NEGOTIATION</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={newOpportunity.expected_close_date}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, expected_close_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpportunityModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold">
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmActivityCenter;
