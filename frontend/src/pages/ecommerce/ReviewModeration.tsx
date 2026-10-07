import React, { useEffect, useState } from 'react';
import { Star, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ecommerceApi } from '../../api/ecommerce';
import { ProductReview } from '../../types/ecommerce';

export function ReviewModeration() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await ecommerceApi.getReviews({ status: filterStatus || undefined });
      setReviews(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [filterStatus]);

  const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await ecommerceApi.updateReviewStatus(id, status);
      setReviews(reviews.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Review Moderation</h1>
          <p className="text-sm text-slate-500">Approve or reject customer product ratings and reviews</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Rating</th>
              <th className="py-3 px-4">Review Content</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Moderation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading reviews...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No product reviews found
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    <div>{r.customer_name || 'Customer'}</div>
                    {r.is_verified_buyer && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">Verified Buyer</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
                      {r.rating}/5
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-slate-600">
                    <div className="font-semibold text-slate-800 text-xs">{r.title || 'Review'}</div>
                    <div className="text-xs truncate">{r.comment}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default ReviewModeration;
