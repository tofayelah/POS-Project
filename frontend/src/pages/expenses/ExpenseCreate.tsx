import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';

export default function ExpenseCreate() {
  const navigate = useNavigate();
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_cost: 0, discount: 0, tax: 0 }]);
  const [formData, setFormData] = useState({
    expense_category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    discount: 0,
    tax: 0,
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => axios.get('/api/v1/expense-categories').then(res => res.data.data),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/expenses', {
        ...formData,
        items
      });
      navigate('/expenses');
    } catch (error) {
      console.error(error);
      alert('Error creating expense');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-6">Create Expense</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={formData.expense_category_id}
            onChange={(e) => setFormData({...formData, expense_category_id: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input 
            type="date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={formData.expense_date}
            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
            required
          />
        </div>
        
        <div>
            <h3 className="text-lg font-medium">Items</h3>
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 mt-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" value={item.description} onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].description = e.target.value;
                    setItems(newItems);
                  }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700">Qty</label>
                  <input type="number" value={item.quantity} onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].quantity = parseFloat(e.target.value);
                    setItems(newItems);
                  }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0.0001" step="0.0001" />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  <input type="number" value={item.unit_cost} onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].unit_cost = parseFloat(e.target.value);
                    setItems(newItems);
                  }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0" step="0.01" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { description: '', quantity: 1, unit_cost: 0, discount: 0, tax: 0 }])} className="mt-2 text-indigo-600 text-sm">
              + Add Item
            </button>
        </div>

        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Create
        </button>
      </form>
    </div>
  );
}
