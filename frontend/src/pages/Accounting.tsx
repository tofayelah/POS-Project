import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  FileText,
  PieChart,
  Shield,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  accountingApi,
  Account,
  AccountGroup,
  JournalEntry,
  TrialBalanceReport,
  GeneralLedgerReport,
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowReport,
  VatReport,
  CreateAccountPayload,
  CreateJournalPayload,
  CashBankTransferPayload
} from '../api/accounting';
import { formatCurrency } from '../utils/currency';
import { useLanguage } from '../i18n';

const Accounting: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'accounts' | 'journals' | 'ledger' | 'trialBalance' | 'transfer' | 'statements'>('accounts');
  const [statementSubTab, setStatementSubTab] = useState<'pnl' | 'balanceSheet' | 'cashFlow' | 'vat'>('pnl');

  // Loading and Error states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chart of Accounts State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('ALL');
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [newAccountForm, setNewAccountForm] = useState<CreateAccountPayload>({
    account_name: '',
    account_code: '',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    account_group_id: null,
    allow_manual_posting: true,
  });

  // Journals State
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalStatusFilter, setJournalStatusFilter] = useState<string>('ALL');
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isCreateJournalOpen, setIsCreateJournalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const [newJournalForm, setNewJournalForm] = useState<CreateJournalPayload>({
    journal_date: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { account_id: 0, debit: 0, credit: 0, description: '' },
      { account_id: 0, debit: 0, credit: 0, description: '' },
    ],
  });

  // General Ledger State
  const [glAccountId, setGlAccountId] = useState<number | ''>('');
  const [glFromDate, setGlFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [glToDate, setGlToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [glReport, setGlReport] = useState<GeneralLedgerReport | null>(null);

  // Trial Balance State
  const [tbAsOfDate, setTbAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceReport | null>(null);

  // Cash / Bank Transfer State
  const [transferForm, setTransferForm] = useState<CashBankTransferPayload>({
    from_account_id: 0,
    to_account_id: 0,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });

  // Statements State
  const [pnlFromDate, setPnlFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [pnlToDate, setPnlToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pnlReport, setPnlReport] = useState<ProfitAndLossReport | null>(null);

  const [bsAsOfDate, setBsAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bsReport, setBsReport] = useState<BalanceSheetReport | null>(null);

  const [cfFromDate, setCfFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [cfToDate, setCfToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cfReport, setCfReport] = useState<CashFlowReport | null>(null);

  const [vatFromDate, setVatFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [vatToDate, setVatToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vatReport, setVatReport] = useState<VatReport | null>(null);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load initial data based on active tab
  useEffect(() => {
    fetchAccountGroups();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'accounts') fetchAccounts();
    if (activeTab === 'journals') fetchJournals();
    if (activeTab === 'trialBalance') fetchTrialBalance();
    if (activeTab === 'ledger' && glAccountId) fetchGeneralLedger();
    if (activeTab === 'statements') {
      if (statementSubTab === 'pnl') fetchProfitAndLoss();
      if (statementSubTab === 'balanceSheet') fetchBalanceSheet();
      if (statementSubTab === 'cashFlow') fetchCashFlow();
      if (statementSubTab === 'vat') fetchVatReport();
    }
  }, [activeTab, statementSubTab]);

  // API Call Helpers
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getAccounts({ search: accountSearch });
      setAccounts(res.data.data || []);
      if (!glAccountId && res.data.data && res.data.data.length > 0) {
        setGlAccountId(res.data.data[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountGroups = async () => {
    try {
      const res = await accountingApi.getAccountGroups();
      setAccountGroups(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getJournals({
        status: journalStatusFilter === 'ALL' ? undefined : journalStatusFilter,
      });
      const data = res.data.data;
      if (Array.isArray(data)) {
        setJournals(data);
      } else if (data && Array.isArray((data as any).data)) {
        setJournals((data as any).data);
      } else {
        setJournals([]);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load journals.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getTrialBalance({ as_of_date: tbAsOfDate });
      setTrialBalanceData(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load trial balance.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralLedger = async () => {
    if (!glAccountId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getGeneralLedger({
        account_id: Number(glAccountId),
        from_date: glFromDate,
        to_date: glToDate,
      });
      setGlReport(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load general ledger.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitAndLoss = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getProfitAndLoss({ from_date: pnlFromDate, to_date: pnlToDate });
      setPnlReport(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load P&L statement.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getBalanceSheet({ as_of_date: bsAsOfDate });
      setBsReport(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load balance sheet.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getCashFlow({ from_date: cfFromDate, to_date: cfToDate });
      setCfReport(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load cash flow statement.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVatReport = async () => {
    try {
      setLoading(true);
      const res = await accountingApi.getVatReport({ from_date: vatFromDate, to_date: vatToDate });
      setVatReport(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load VAT report.');
    } finally {
      setLoading(false);
    }
  };

  // Account Handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await accountingApi.createAccount(newAccountForm);
      setSuccessMessage(`Account ${newAccountForm.account_code} - ${newAccountForm.account_name} created successfully.`);
      setIsCreateAccountOpen(false);
      setNewAccountForm({
        account_name: '',
        account_code: '',
        account_type: 'ASSET',
        normal_balance: 'DEBIT',
        account_group_id: null,
        allow_manual_posting: true,
      });
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    try {
      setActionLoading(true);
      await accountingApi.updateAccount(selectedAccount.id, {
        account_name: selectedAccount.account_name,
        account_code: selectedAccount.account_code,
        account_group_id: selectedAccount.account_group_id,
        is_active: selectedAccount.is_active,
      });
      setSuccessMessage(`Account ${selectedAccount.account_code} updated successfully.`);
      setIsEditAccountOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateAccount = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to toggle status for account ${account.account_code}?`)) return;
    try {
      setActionLoading(true);
      await accountingApi.deactivateAccount(account.id);
      setSuccessMessage(`Account ${account.account_code} status updated.`);
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to permanently delete account ${account.account_code}? This cannot be undone.`)) return;
    try {
      setActionLoading(true);
      await accountingApi.deleteAccount(account.id);
      setSuccessMessage(`Account ${account.account_code} deleted successfully.`);
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Journal Handlers
  const handlePostJournal = async (journalId: number) => {
    try {
      setActionLoading(true);
      await accountingApi.postJournal(journalId);
      setSuccessMessage('Journal entry posted to General Ledger.');
      fetchJournals();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to post journal entry.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverseJournal = async () => {
    if (!selectedJournal) return;
    try {
      setActionLoading(true);
      await accountingApi.reverseJournal(selectedJournal.id, reversalReason);
      setSuccessMessage(`Journal ${selectedJournal.journal_number} reversed successfully.`);
      setIsReverseModalOpen(false);
      setReversalReason('');
      setSelectedJournal(null);
      fetchJournals();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to reverse journal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddJournalLine = () => {
    setNewJournalForm({
      ...newJournalForm,
      lines: [...newJournalForm.lines, { account_id: 0, debit: 0, credit: 0, description: '' }],
    });
  };

  const handleRemoveJournalLine = (index: number) => {
    if (newJournalForm.lines.length <= 2) return;
    const lines = [...newJournalForm.lines];
    lines.splice(index, 1);
    setNewJournalForm({ ...newJournalForm, lines });
  };

  const handleJournalLineChange = (index: number, field: string, value: any) => {
    const lines = [...newJournalForm.lines];
    lines[index] = { ...lines[index], [field]: value };
    setNewJournalForm({ ...newJournalForm, lines });
  };

  const totalJournalDebit = newJournalForm.lines.reduce((acc, l) => acc + Number(l.debit || 0), 0);
  const totalJournalCredit = newJournalForm.lines.reduce((acc, l) => acc + Number(l.credit || 0), 0);
  const journalDifference = Math.abs(totalJournalDebit - totalJournalCredit);
  const isJournalBalanced = journalDifference < 0.0001 && totalJournalDebit > 0;

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) {
      setErrorMessage('Journal entries must be strictly balanced (Total Debits == Total Credits).');
      return;
    }
    try {
      setActionLoading(true);
      await accountingApi.createJournal(newJournalForm);
      setSuccessMessage('Manual journal entry created in DRAFT status.');
      setIsCreateJournalOpen(false);
      setNewJournalForm({
        journal_date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
          { account_id: 0, debit: 0, credit: 0, description: '' },
          { account_id: 0, debit: 0, credit: 0, description: '' },
        ],
      });
      fetchJournals();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create journal.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cash / Bank Transfer Handler
  const handleCashBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.from_account_id === transferForm.to_account_id) {
      setErrorMessage('Source and Destination accounts must be different.');
      return;
    }
    if (Number(transferForm.amount) <= 0) {
      setErrorMessage('Transfer amount must be greater than zero.');
      return;
    }
    try {
      setActionLoading(true);
      const res = await accountingApi.transferCashBank(transferForm);
      setSuccessMessage(`Atomic Transfer successful! Journal ${res.data.data.journal_number} posted.`);
      setTransferForm({
        from_account_id: 0,
        to_account_id: 0,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        reference: '',
        description: '',
      });
      fetchAccounts();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to execute cash/bank transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.account_name.toLowerCase().includes(accountSearch.toLowerCase()) ||
      acc.account_code.toLowerCase().includes(accountSearch.toLowerCase());
    const matchesType = accountTypeFilter === 'ALL' || acc.account_type === accountTypeFilter;
    return matchesSearch && matchesType;
  });

  const assetAccounts = accounts.filter(acc => acc.account_type === 'ASSET' && acc.is_active);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Accounting Operations</h1>
              <p className="text-sm text-gray-500">
                Authoritative double-entry ledger, automated journals, cash/bank transfers, and financial statements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'accounts') fetchAccounts();
              if (activeTab === 'journals') fetchJournals();
              if (activeTab === 'trialBalance') fetchTrialBalance();
              if (activeTab === 'ledger') fetchGeneralLedger();
              if (activeTab === 'statements') {
                if (statementSubTab === 'pnl') fetchProfitAndLoss();
                if (statementSubTab === 'balanceSheet') fetchBalanceSheet();
                if (statementSubTab === 'cashFlow') fetchCashFlow();
                if (statementSubTab === 'vat') fetchVatReport();
              }
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {activeTab === 'accounts' && (
            <button
              onClick={() => setIsCreateAccountOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Account
            </button>
          )}

          {activeTab === 'journals' && (
            <button
              onClick={() => setIsCreateJournalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Manual Journal
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {[
            { id: 'accounts', label: 'Chart of Accounts', icon: Layers },
            { id: 'journals', label: 'Journal Entries', icon: FileText },
            { id: 'ledger', label: 'General Ledger', icon: BookOpen },
            { id: 'trialBalance', label: 'Trial Balance', icon: CheckCircle2 },
            { id: 'transfer', label: 'Cash & Bank Transfer', icon: ArrowRightLeft },
            { id: 'statements', label: 'Financial Statements', icon: PieChart },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CHART OF ACCOUNTS */}
      {/* ============================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search account by code or name..."
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 uppercase">Type:</span>
              <select
                value={accountTypeFilter}
                onChange={e => setAccountTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="ASSET">Assets (1000)</option>
                <option value="LIABILITY">Liabilities (2000)</option>
                <option value="EQUITY">Equity (3000)</option>
                <option value="REVENUE">Revenue (4000)</option>
                <option value="EXPENSE">Expense (5000)</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Account Name</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Normal Balance</th>
                  <th className="px-6 py-3 text-center">System / Role</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {filteredAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono font-bold text-blue-600">
                      {acc.account_code}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-medium text-gray-900">
                      {acc.account_name}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        acc.account_type === 'ASSET' ? 'bg-emerald-100 text-emerald-800' :
                        acc.account_type === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                        acc.account_type === 'EQUITY' ? 'bg-purple-100 text-purple-800' :
                        acc.account_type === 'REVENUE' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                      {acc.normal_balance}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      {acc.is_system ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                          <Shield className="w-3 h-3 text-gray-500" />
                          System Locked
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        acc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setIsEditAccountOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Edit
                      </button>

                      {!acc.is_system && (
                        <>
                          <button
                            onClick={() => handleDeactivateAccount(acc)}
                            className="text-amber-600 hover:text-amber-800 font-medium text-xs"
                          >
                            {acc.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      No accounts found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: JOURNAL ENTRIES */}
      {/* ============================================================== */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
              <select
                value={journalStatusFilter}
                onChange={e => setJournalStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="POSTED">POSTED</option>
                <option value="REVERSED">REVERSED</option>
              </select>
            </div>
          </div>

          {/* Journals Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Journal No.</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-left">Source</th>
                  <th className="px-6 py-3 text-right">Debit</th>
                  <th className="px-6 py-3 text-right">Credit</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {journals.map(journal => (
                  <tr key={journal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono font-bold text-blue-600">
                      {journal.journal_number}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-gray-600">
                      {journal.journal_date}
                    </td>
                    <td className="px-6 py-3.5 text-gray-900 max-w-xs truncate">
                      {journal.description}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">
                        {journal.source}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-gray-900">
                      {formatCurrency(journal.total_debit)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-gray-900">
                      {formatCurrency(journal.total_credit)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        journal.status === 'POSTED' ? 'bg-green-100 text-green-800' :
                        journal.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {journal.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => setSelectedJournal(journal)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        View Lines ({journal.lines?.length || 0})
                      </button>

                      {journal.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePostJournal(journal.id)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                        >
                          Post
                        </button>
                      )}

                      {journal.status === 'POSTED' && (
                        <button
                          onClick={() => {
                            setSelectedJournal(journal);
                            setIsReverseModalOpen(true);
                          }}
                          className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {journals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                      No journal entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: GENERAL LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Account:
              </label>
              <select
                value={glAccountId}
                onChange={e => setGlAccountId(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_code} — {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                From Date:
              </label>
              <input
                type="date"
                value={glFromDate}
                onChange={e => setGlFromDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                To Date:
              </label>
              <input
                type="date"
                value={glToDate}
                onChange={e => setGlToDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={fetchGeneralLedger}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              Load Ledger
            </button>
          </div>

          {/* GL Metric Cards */}
          {glReport && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-medium text-gray-500 uppercase">Opening Balance</span>
                <p className="text-xl font-bold font-mono text-gray-900 mt-1">
                  {formatCurrency(glReport.opening_balance)}
                </p>
                <span className="text-xs text-gray-400">Prior to {glFromDate}</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-medium text-gray-500 uppercase">Period Total Debit</span>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(glReport.total_debit)}
                </p>
                <span className="text-xs text-gray-400">Total Inflows</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-medium text-gray-500 uppercase">Period Total Credit</span>
                <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                  {formatCurrency(glReport.total_credit)}
                </p>
                <span className="text-xs text-gray-400">Total Outflows</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-medium text-gray-500 uppercase">Closing Balance</span>
                <p className="text-xl font-bold font-mono text-blue-600 mt-1">
                  {formatCurrency(glReport.closing_balance)}
                </p>
                <span className="text-xs text-gray-400">As of {glToDate}</span>
              </div>
            </div>
          )}

          {/* Running Balance Ledger Table */}
          {glReport && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Journal No.</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-left">Source</th>
                    <th className="px-6 py-3 text-right">Debit</th>
                    <th className="px-6 py-3 text-right">Credit</th>
                    <th className="px-6 py-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {/* Opening balance row */}
                  <tr className="bg-gray-50/50 font-semibold text-gray-600">
                    <td className="px-6 py-2.5">{glFromDate}</td>
                    <td className="px-6 py-2.5 font-mono text-xs">—</td>
                    <td className="px-6 py-2.5" colSpan={2}>
                      Opening Balance Brought Forward
                    </td>
                    <td className="px-6 py-2.5 text-right font-mono">—</td>
                    <td className="px-6 py-2.5 text-right font-mono">—</td>
                    <td className="px-6 py-2.5 text-right font-mono text-gray-900">
                      {formatCurrency(glReport.opening_balance)}
                    </td>
                  </tr>

                  {glReport.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{line.journal_date}</td>
                      <td className="px-6 py-3 font-mono font-medium text-blue-600 whitespace-nowrap">
                        {line.journal_number}
                      </td>
                      <td className="px-6 py-3 text-gray-900">{line.description}</td>
                      <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
                          {line.source}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900 whitespace-nowrap">
                        {Number(line.debit) > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900 whitespace-nowrap">
                        {Number(line.credit) > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(line.running_balance)}
                      </td>
                    </tr>
                  ))}
                  {glReport.lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        No transactions found in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: TRIAL BALANCE */}
      {/* ============================================================== */}
      {activeTab === 'trialBalance' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-700 uppercase">As of Date:</label>
              <input
                type="date"
                value={tbAsOfDate}
                onChange={e => setTbAsOfDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-md p-1.5 bg-white"
              />
              <button
                onClick={fetchTrialBalance}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                Calculate
              </button>
            </div>

            {trialBalanceData && (
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                trialBalanceData.is_balanced
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {trialBalanceData.is_balanced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    BALANCED (Total Debits == Total Credits)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    UNBALANCED (Variance: {formatCurrency(Math.abs(trialBalanceData.total_debit - trialBalanceData.total_credit))})
                  </>
                )}
              </div>
            )}
          </div>

          {trialBalanceData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Code</th>
                    <th className="px-6 py-3 text-left">Account Name</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-right">Debit Balance (৳)</th>
                    <th className="px-6 py-3 text-right">Credit Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {trialBalanceData.lines?.map(line => (
                    <tr key={line.account_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-mono font-bold text-gray-600">{line.account_code}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{line.account_name}</td>
                      <td className="px-6 py-3 text-xs text-gray-500">{line.account_type}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {line.debit_balance > 0 ? formatCurrency(line.debit_balance) : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {line.credit_balance > 0 ? formatCurrency(line.credit_balance) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300 text-sm">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right uppercase text-gray-800 tracking-wider">
                      Grand Totals:
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-900">
                      {formatCurrency(trialBalanceData.total_debit)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-900">
                      {formatCurrency(trialBalanceData.total_credit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: CASH & BANK TRANSFER */}
      {/* ============================================================== */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Atomic Cash & Bank Transfer</h2>
              <p className="text-xs text-gray-500">
                Immediately executes a balanced double-entry journal between liquid asset accounts
              </p>
            </div>
          </div>

          <form onSubmit={handleCashBankTransfer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  From Account (Source): *
                </label>
                <select
                  required
                  value={transferForm.from_account_id || ''}
                  onChange={e => setTransferForm({ ...transferForm, from_account_id: Number(e.target.value) })}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Cash/Bank Account</option>
                  {assetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_code} — {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  To Account (Destination): *
                </label>
                <select
                  required
                  value={transferForm.to_account_id || ''}
                  onChange={e => setTransferForm({ ...transferForm, to_account_id: Number(e.target.value) })}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Cash/Bank Account</option>
                  {assetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_code} — {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Amount (BDT): *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-mono">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferForm.amount || ''}
                    onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Date: *
                </label>
                <input
                  type="date"
                  required
                  value={transferForm.date}
                  onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reference / Voucher No.:
              </label>
              <input
                type="text"
                value={transferForm.reference || ''}
                onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
                placeholder="e.g. TR-2026-001 or Cheque #987654"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description / Memo:
              </label>
              <textarea
                rows={2}
                value={transferForm.description || ''}
                onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
                placeholder="Reason for transfer (e.g. Daily cash deposit from counter to City Bank)"
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Execute Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: FINANCIAL STATEMENTS */}
      {/* ============================================================== */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          {/* Sub-nav */}
          <div className="flex border-b border-gray-200 space-x-4">
            {[
              { id: 'pnl', label: 'Profit & Loss (P&L)' },
              { id: 'balanceSheet', label: 'Balance Sheet' },
              { id: 'cashFlow', label: 'Cash Flow Statement' },
              { id: 'vat', label: 'VAT / Tax Report' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setStatementSubTab(sub.id as any)}
                className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  statementSubTab === sub.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Statement 1: Profit & Loss */}
          {statementSubTab === 'pnl' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700 uppercase">Period:</span>
                <input
                  type="date"
                  value={pnlFromDate}
                  onChange={e => setPnlFromDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={pnlToDate}
                  onChange={e => setPnlToDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <button
                  onClick={fetchProfitAndLoss}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                >
                  Run Report
                </button>
              </div>

              {pnlReport && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900">Income Statement (Profit & Loss)</h2>
                    <p className="text-xs text-gray-500">Period: {pnlFromDate} to {pnlToDate}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Revenue */}
                    <div className="flex justify-between items-center text-sm font-semibold border-b pb-2">
                      <span className="text-gray-800 uppercase tracking-wider">Operating Revenue</span>
                      <span className="font-mono text-gray-900">{formatCurrency(pnlReport.operating_revenue)}</span>
                    </div>

                    {/* COGS */}
                    <div className="flex justify-between items-center text-sm font-semibold border-b pb-2">
                      <span className="text-gray-800 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
                      <span className="font-mono text-gray-900">({formatCurrency(pnlReport.cost_of_goods_sold)})</span>
                    </div>

                    {/* Gross Profit */}
                    <div className="flex justify-between items-center text-base font-bold bg-gray-50 p-3 rounded-md">
                      <span className="text-gray-900">GROSS PROFIT (Margin: {pnlReport.gross_margin_percentage}%)</span>
                      <span className="font-mono text-emerald-600">{formatCurrency(pnlReport.gross_profit)}</span>
                    </div>

                    {/* Operating Expenses */}
                    <div className="flex justify-between items-center text-sm font-semibold border-b pb-2 pt-2">
                      <span className="text-gray-800 uppercase tracking-wider">Operating Expenses</span>
                      <span className="font-mono text-gray-900">({formatCurrency(pnlReport.operating_expenses)})</span>
                    </div>

                    {/* Net Profit */}
                    <div className="flex justify-between items-center text-lg font-bold bg-blue-50 p-4 rounded-md border border-blue-200">
                      <span className="text-blue-900">NET PROFIT / (LOSS) (Margin: {pnlReport.net_margin_percentage}%)</span>
                      <span className={`font-mono ${pnlReport.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(pnlReport.net_profit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statement 2: Balance Sheet */}
          {statementSubTab === 'balanceSheet' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700 uppercase">As of Date:</span>
                <input
                  type="date"
                  value={bsAsOfDate}
                  onChange={e => setBsAsOfDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <button
                  onClick={fetchBalanceSheet}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                >
                  Run Report
                </button>
              </div>

              {bsReport && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Balance Sheet</h2>
                      <p className="text-xs text-gray-500">As of: {bsAsOfDate}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      bsReport.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {bsReport.is_balanced ? 'EQUATION BALANCED (A = L + E)' : `VARIANCE: ${formatCurrency(bsReport.variance)}`}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Assets */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-gray-900 border-b pb-1 text-emerald-700 uppercase">Assets</h3>
                      <div className="space-y-1.5 text-sm">
                        {bsReport.breakdown?.asset_accounts?.map((acc, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1">
                            <span className="text-gray-600">{acc.account_name}</span>
                            <span className="font-mono font-medium">{formatCurrency(acc.balance)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t text-sm">
                        <span>Total Assets:</span>
                        <span className="font-mono text-emerald-700">{formatCurrency(bsReport.total_assets)}</span>
                      </div>
                    </div>

                    {/* Liabilities */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-gray-900 border-b pb-1 text-amber-700 uppercase">Liabilities</h3>
                      <div className="space-y-1.5 text-sm">
                        {bsReport.breakdown?.liability_accounts?.map((acc, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1">
                            <span className="text-gray-600">{acc.account_name}</span>
                            <span className="font-mono font-medium">{formatCurrency(acc.balance)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t text-sm">
                        <span>Total Liabilities:</span>
                        <span className="font-mono text-amber-700">{formatCurrency(bsReport.total_liabilities)}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-gray-900 border-b pb-1 text-purple-700 uppercase">Equity</h3>
                      <div className="space-y-1.5 text-sm">
                        {bsReport.breakdown?.equity_accounts?.map((acc, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1">
                            <span className="text-gray-600">{acc.account_name}</span>
                            <span className="font-mono font-medium">{formatCurrency(acc.balance)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t text-sm">
                        <span>Total Equity:</span>
                        <span className="font-mono text-purple-700">{formatCurrency(bsReport.total_equity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statement 3: Cash Flow */}
          {statementSubTab === 'cashFlow' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700 uppercase">Period:</span>
                <input
                  type="date"
                  value={cfFromDate}
                  onChange={e => setCfFromDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={cfToDate}
                  onChange={e => setCfToDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <button
                  onClick={fetchCashFlow}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                >
                  Run Report
                </button>
              </div>

              {cfReport && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900">Statement of Cash Flows</h2>
                    <p className="text-xs text-gray-500">Period: {cfFromDate} to {cfToDate}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-semibold border-b pb-2">
                      <span className="text-gray-800">Opening Cash Balance</span>
                      <span className="font-mono text-gray-900">{formatCurrency(cfReport.opening_cash_balance)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold text-emerald-600">
                      <span>Total Cash Inflows</span>
                      <span className="font-mono">+{formatCurrency(cfReport.total_inflows)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold text-rose-600">
                      <span>Total Cash Outflows</span>
                      <span className="font-mono">-{formatCurrency(cfReport.total_outflows)}</span>
                    </div>

                    <div className="flex justify-between items-center text-base font-bold bg-gray-50 p-3 rounded-md">
                      <span>Net Cash Movement</span>
                      <span className={`font-mono ${cfReport.net_cash_movement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(cfReport.net_cash_movement)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-lg font-bold bg-blue-50 p-4 rounded-md border border-blue-200">
                      <span className="text-blue-900">Closing Cash Balance</span>
                      <span className="font-mono text-blue-900">{formatCurrency(cfReport.closing_cash_balance)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statement 4: VAT Report */}
          {statementSubTab === 'vat' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700 uppercase">Period:</span>
                <input
                  type="date"
                  value={vatFromDate}
                  onChange={e => setVatFromDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={vatToDate}
                  onChange={e => setVatToDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded p-1 bg-white"
                />
                <button
                  onClick={fetchVatReport}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                >
                  Run Report
                </button>
              </div>

              {vatReport && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900">VAT / Sales Tax Report</h2>
                    <p className="text-xs text-gray-500">Period: {vatFromDate} to {vatToDate}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">Taxable Sales Revenue</span>
                      <p className="text-lg font-bold font-mono text-gray-900 mt-1">
                        {formatCurrency(vatReport.sales_summary.total_taxable_revenue)}
                      </p>
                      <span className="text-xs text-gray-400">{vatReport.sales_summary.sales_count} Transactions</span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">Output VAT Collected</span>
                      <p className="text-lg font-bold font-mono text-blue-600 mt-1">
                        {formatCurrency(vatReport.sales_summary.total_output_vat)}
                      </p>
                      <span className="text-xs text-gray-400">POS Sales Collections</span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">GL VAT Payable Balance</span>
                      <p className="text-lg font-bold font-mono text-purple-600 mt-1">
                        {formatCurrency(vatReport.gl_vat_payable_balance)}
                      </p>
                      <span className="text-xs text-gray-400">Current Liability</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* Modal 1: Create Account */}
      {isCreateAccountOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Create New GL Account</h3>
              <button onClick={() => setIsCreateAccountOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Account Code: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1015"
                  value={newAccountForm.account_code}
                  onChange={e => setNewAccountForm({ ...newAccountForm, account_code: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Account Name: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash - Front Desk"
                  value={newAccountForm.account_name}
                  onChange={e => setNewAccountForm({ ...newAccountForm, account_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Type: *
                  </label>
                  <select
                    value={newAccountForm.account_type}
                    onChange={e => setNewAccountForm({ ...newAccountForm, account_type: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Normal Balance: *
                  </label>
                  <select
                    value={newAccountForm.normal_balance}
                    onChange={e => setNewAccountForm({ ...newAccountForm, normal_balance: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Account Group (Optional):
                </label>
                <select
                  value={newAccountForm.account_group_id || ''}
                  onChange={e => setNewAccountForm({ ...newAccountForm, account_group_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">None (Top-Level)</option>
                  {accountGroups.map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.code} — {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Account */}
      {isEditAccountOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Edit Account {selectedAccount.account_code}</h3>
              <button onClick={() => setIsEditAccountOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Account Name: *
                </label>
                <input
                  type="text"
                  required
                  value={selectedAccount.account_name}
                  onChange={e => setSelectedAccount({ ...selectedAccount, account_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Active Status:
                </label>
                <select
                  value={selectedAccount.is_active ? '1' : '0'}
                  onChange={e => setSelectedAccount({ ...selectedAccount, is_active: e.target.value === '1' })}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditAccountOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Journal Lines */}
      {selectedJournal && !isReverseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Journal Entry {selectedJournal.journal_number}
                </h3>
                <p className="text-xs text-gray-500">{selectedJournal.journal_date} — {selectedJournal.description}</p>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Account</th>
                    <th className="px-4 py-2.5 text-left">Description</th>
                    <th className="px-4 py-2.5 text-right">Debit (৳)</th>
                    <th className="px-4 py-2.5 text-right">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedJournal.lines?.map((l, idx) => {
                    const acc = accounts.find(a => a.id === l.account_id);
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-medium">
                          {acc ? `${acc.account_code} - ${acc.account_name}` : `Account #${l.account_id}`}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{l.description || '—'}</td>
                        <td className="px-4 py-2 text-right font-mono font-medium">
                          {Number(l.debit) > 0 ? formatCurrency(l.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium">
                          {Number(l.credit) > 0 ? formatCurrency(l.credit) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold border-t">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right uppercase text-xs">Totals:</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(selectedJournal.total_debit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(selectedJournal.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Reverse Journal */}
      {isReverseModalOpen && selectedJournal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Reverse Journal {selectedJournal.journal_number}</h3>
              <button onClick={() => setIsReverseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              This will create an equal and opposite journal entry swapping all debits and credits, and mark the original as REVERSED.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reason for Reversal:
              </label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="e.g. Inadvertent error in transaction amount"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsReverseModalOpen(false)}
                className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseJournal}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Create Manual Journal */}
      {isCreateJournalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">New Manual Journal Entry</h3>
              <button onClick={() => setIsCreateJournalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Journal Date: *
                  </label>
                  <input
                    type="date"
                    required
                    value={newJournalForm.journal_date}
                    onChange={e => setNewJournalForm({ ...newJournalForm, journal_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Description: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Month-end depreciation adjustment"
                    value={newJournalForm.description}
                    onChange={e => setNewJournalForm({ ...newJournalForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Lines Table */}
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Line Memo</th>
                      <th className="px-3 py-2 text-right">Debit (৳)</th>
                      <th className="px-3 py-2 text-right">Credit (৳)</th>
                      <th className="px-2 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {newJournalForm.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            required
                            value={line.account_id || ''}
                            onChange={e => handleJournalLineChange(idx, 'account_id', Number(e.target.value))}
                            className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white"
                          >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_code} — {acc.account_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Optional line memo"
                            value={line.description || ''}
                            onChange={e => handleJournalLineChange(idx, 'description', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded p-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit || ''}
                            onChange={e => handleJournalLineChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-mono text-right border border-gray-300 rounded p-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit || ''}
                            onChange={e => handleJournalLineChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-mono text-right border border-gray-300 rounded p-1.5"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {newJournalForm.lines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveJournalLine(idx)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t font-mono text-xs">
                    <tr>
                      <td colSpan={2} className="p-2 text-left">
                        <button
                          type="button"
                          onClick={handleAddJournalLine}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Line
                        </button>
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900">
                        {formatCurrency(totalJournalDebit)}
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900">
                        {formatCurrency(totalJournalCredit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balancing Indicator */}
              <div className={`p-3 rounded-md text-xs font-bold flex items-center justify-between ${
                isJournalBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <span>{isJournalBalanced ? '✓ Journal is strictly balanced.' : '✕ Journal is out of balance.'}</span>
                <span>Variance: {formatCurrency(journalDifference)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateJournalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isJournalBalanced || actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Save Draft Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
