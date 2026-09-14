import React, { useState, useEffect } from 'react';
import api from '../api/axios';

interface AccountGroup {
  id: number;
  name: string;
  code: string;
  account_type: string;
  parent_id: number | null;
}

interface Account {
  id: number;
  account_name: string;
  account_code: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
  account_group_id: number | null;
}

interface JournalEntry {
  id: number;
  journal_number: string;
  journal_date: string;
  description: string;
  status: string;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  account_id: number;
  debit: string;
  credit: string;
  account?: Account;
}

const Accounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journals' | 'ledger' | 'trialBalance'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  
  useEffect(() => {
    if (activeTab === 'accounts') fetchAccounts();
    if (activeTab === 'journals') fetchJournals();
    if (activeTab === 'trialBalance') fetchTrialBalance();
  }, [activeTab]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchJournals = async () => {
    try {
      const response = await api.get('/journals');
      setJournals(response.data.data.data || response.data.data); // Handle pagination structure
    } catch (error) {
      console.error('Failed to fetch journals:', error);
    }
  };
  
  const fetchTrialBalance = async () => {
    try {
      const response = await api.get('/trial-balance');
      setTrialBalanceData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch trial balance:', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Accounting Engine</h1>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('accounts')} 
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'accounts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Chart of Accounts
        </button>
        <button 
          onClick={() => setActiveTab('journals')} 
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'journals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Journal Entries
        </button>
        <button 
          onClick={() => setActiveTab('trialBalance')} 
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'trialBalance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Trial Balance
        </button>
      </div>

      {activeTab === 'accounts' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{acc.account_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{acc.account_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{acc.account_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{acc.normal_balance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${acc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {acc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'journals' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journal No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lines</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {journals.map(journal => (
                <tr key={journal.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{journal.journal_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{journal.journal_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{journal.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{journal.lines?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${journal.status === 'POSTED' ? 'bg-green-100 text-green-800' : 
                        journal.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {journal.status}
                    </span>
                  </td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No journals found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {activeTab === 'trialBalance' && trialBalanceData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Trial Balance</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${trialBalanceData.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {trialBalanceData.is_balanced ? 'BALANCED' : 'UNBALANCED'}
            </div>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200 mt-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trialBalanceData.lines?.map((line: any) => (
                <tr key={line.account_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.account_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{line.account_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {line.debit_balance > 0 ? parseFloat(line.debit_balance).toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {line.credit_balance > 0 ? parseFloat(line.credit_balance).toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
              {(!trialBalanceData.lines || trialBalanceData.lines.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No posted transactions found.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-right text-sm text-gray-900 uppercase">Grand Totals:</td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">{parseFloat(trialBalanceData.total_debit).toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">{parseFloat(trialBalanceData.total_credit).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default Accounting;
