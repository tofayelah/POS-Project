import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '../../i18n';
import { financeApi } from '../../api/finance';
import { BankAccount, BankStatement } from '../../types/finance';
import {
  Landmark,
  Plus,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const BankManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Account Modal
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [glAccountId, setGlAccountId] = useState<number>(2);
  const [accountType, setAccountType] = useState<'CURRENT' | 'SAVINGS' | 'OVERDRAFT'>('CURRENT');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Statement Import Modal
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importBankAccountId, setImportBankAccountId] = useState<number>(1);
  const [statementDate, setStatementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stmtOpeningBal, setStmtOpeningBal] = useState<number>(0);
  const [stmtClosingBal, setStmtClosingBal] = useState<number>(0);
  const [sampleLineDesc, setSampleLineDesc] = useState('Customer Direct Deposit');
  const [sampleLineAmount, setSampleLineAmount] = useState<number>(50000);
  const [sampleLineType, setSampleLineType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [sampleLineRef, setSampleLineRef] = useState('DEP-2026-001');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accRes, stmtRes] = await Promise.all([
        financeApi.getBankAccounts(),
        financeApi.getBankStatements(),
      ]);
      setAccounts(accRes.data.data);
      setStatements(stmtRes.data.data);
      if (accRes.data.data.length > 0) {
        setImportBankAccountId(accRes.data.data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error loading bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createBankAccount({
        bank_name: bankName,
        branch_name: branchName,
        account_name: accountName,
        account_number: accountNumber,
        routing_number: routingNumber,
        gl_account_id: glAccountId,
        account_type: accountType,
        opening_balance: openingBalance,
        currency: 'BDT',
      });
      setShowAccountModal(false);
      setActionSuccess('Bank account registered successfully');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create bank account');
    }
  };

  const handleImportStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const line = {
        transaction_date: statementDate,
        description: sampleLineDesc,
        reference_number: sampleLineRef,
        deposit_amount: sampleLineType === 'deposit' ? sampleLineAmount : 0,
        withdrawal_amount: sampleLineType === 'withdrawal' ? sampleLineAmount : 0,
      };

      await financeApi.importBankStatement({
        bank_account_id: importBankAccountId,
        statement_date: statementDate,
        opening_balance: stmtOpeningBal,
        closing_balance: stmtClosingBal,
        lines: [line],
      });

      setShowImportModal(false);
      setActionSuccess('Bank statement imported successfully');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to import bank statement');
    }
  };

  const formatBDT = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '৳0.00';
    return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.bankManagementTitle', 'Bank Accounts & Electronic Statements')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('finance.bankManagementSubtitle', 'Commercial Bank Masters, Electronic Statement Lines & Feed Ingestion')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('finance.importStatement', 'Import Statement')}
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('finance.newBankAccount', 'Add Bank Account')}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500 rounded text-emerald-700 dark:text-emerald-300 text-sm flex justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.bankAccountsList', 'Registered Bank Accounts')}
          </h2>
          <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
            {accounts.length} Accounts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Bank & Branch</th>
                <th className="px-6 py-3">Account Title & Number</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Routing No</th>
                <th className="px-6 py-3 text-right">GL Current Balance</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No bank accounts registered yet.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{acc.bank_name}</div>
                      <div className="text-xs text-gray-500">{acc.branch_name || 'Main Branch'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{acc.account_name}</div>
                      <div className="text-xs font-mono text-gray-400">{acc.account_number}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{acc.account_type}</td>
                    <td className="px-6 py-4 font-mono text-xs">{acc.routing_number || '—'}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatBDT(acc.current_balance)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        acc.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {acc.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to="/finance/bank-reconciliation"
                        className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Reconcile <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t('finance.importedStatements', 'Imported Statement History')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Statement Date</th>
                <th className="px-6 py-3">Bank Account</th>
                <th className="px-6 py-3 text-right">Opening Balance</th>
                <th className="px-6 py-3 text-right">Closing Balance</th>
                <th className="px-6 py-3">Imported At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {statements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                    No electronic bank statements uploaded yet.
                  </td>
                </tr>
              ) : (
                statements.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{s.statement_date}</td>
                    <td className="px-6 py-3">{s.bank_account?.bank_name} - {s.bank_account?.account_name}</td>
                    <td className="px-6 py-3 text-right font-mono">{formatBDT(s.opening_balance)}</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-blue-600">{formatBDT(s.closing_balance)}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{s.created_at?.split('T')[0] || 'Today'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Add Commercial Bank Account
            </h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. BRAC Bank PLC"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Gulshan-1 Branch"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Account Title *</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="RetailCore Operations"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1501204567890001"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Routing Number</label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="060261234"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Opening Balance (BDT)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Register Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Import Electronic Bank Statement
            </h3>
            <form onSubmit={handleImportStatement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Select Bank Account *</label>
                <select
                  value={importBankAccountId}
                  onChange={(e) => setImportBankAccountId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name} ({a.account_number})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Statement Date</label>
                  <input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Opening Bal (BDT)</label>
                  <input
                    type="number"
                    value={stmtOpeningBal}
                    onChange={(e) => setStmtOpeningBal(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Closing Bal (BDT)</label>
                  <input
                    type="number"
                    value={stmtClosingBal}
                    onChange={(e) => setStmtClosingBal(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-3">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Statement Line Data</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1">Description</label>
                    <input
                      type="text"
                      value={sampleLineDesc}
                      onChange={(e) => setSampleLineDesc(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1">Reference No</label>
                    <input
                      type="text"
                      value={sampleLineRef}
                      onChange={(e) => setSampleLineRef(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1">Type</label>
                    <select
                      value={sampleLineType}
                      onChange={(e: any) => setSampleLineType(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="deposit">Deposit (Inflow)</option>
                      <option value="withdrawal">Withdrawal (Outflow)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1">Amount (BDT)</label>
                    <input
                      type="number"
                      value={sampleLineAmount}
                      onChange={(e) => setSampleLineAmount(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Import Statement Lines
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
