import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { getWalletTopupsAdmin, approveWalletTopup, rejectWalletTopup, getAdminWallets, adjustAdminWallet } from '../lib/api';
import { Check, X, Search, Clock, CreditCard, PlusCircle, MinusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminWalletPanel() {
  const [activeTab, setActiveTab] = useState<'WALLETS' | 'TOPUPS'>('WALLETS');
  const [topups, setTopups] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [adjustModal, setAdjustModal] = useState<{ userId: string, userName: string, action: 'CREDIT' | 'DEBIT' } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const fetchTopups = async () => {
    try {
      const data = await getWalletTopupsAdmin();
      setTopups(data || []);
    } catch (err) {
      console.error('Failed to fetch topups', err);
    }
  };

  const fetchWallets = async () => {
    try {
      const data = await getAdminWallets(search);
      setWallets(data || []);
    } catch (err) {
      console.error('Failed to fetch wallets', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    if (activeTab === 'WALLETS') {
      await fetchWallets();
    } else {
      await fetchTopups();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'WALLETS') {
      const timeout = setTimeout(fetchWallets, 500);
      return () => clearTimeout(timeout);
    }
  }, [search]);

  const [reviewModal, setReviewModal] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewAmount, setReviewAmount] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal) return;
    
    try {
      setProcessingId(reviewModal.id);
      if (reviewAction === 'APPROVE') {
        await approveWalletTopup(reviewModal.id, {
          approvedAmount: Number(reviewAmount),
          adminNote: reviewNote
        });
      } else {
        await rejectWalletTopup(reviewModal.id, reviewNote);
      }
      setReviewModal(null);
      setReviewNote('');
      fetchTopups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !amount || !reason) return;
    
    try {
      setProcessingId(adjustModal.userId);
      await adjustAdminWallet(adjustModal.userId, Number(amount), reason, adjustModal.action);
      setAdjustModal(null);
      setAmount('');
      setReason('');
      fetchWallets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust wallet');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = topups.filter(t => t.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('WALLETS')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'WALLETS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          User Wallets
        </button>
        <button
          onClick={() => setActiveTab('TOPUPS')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'TOPUPS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Top-up Requests {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
      ) : activeTab === 'WALLETS' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 border-b">User</th>
                  <th className="p-4 border-b">Available Balance</th>
                  <th className="p-4 border-b">Held Balance</th>
                  <th className="p-4 border-b">Total</th>
                  <th className="p-4 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-sm">{w.user_name}</div>
                      <div className="text-xs text-slate-500">{w.user_email}</div>
                    </td>
                    <td className="p-4 font-black text-emerald-600">Rs. {w.available_balance.toLocaleString()}</td>
                    <td className="p-4 font-bold text-orange-500">Rs. {w.held_balance.toLocaleString()}</td>
                    <td className="p-4 font-bold text-slate-800">Rs. {(w.available_balance + w.held_balance).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => setAdjustModal({ userId: w.user_id, userName: w.user_name, action: 'CREDIT' })} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg mr-2" title="Credit">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => setAdjustModal({ userId: w.user_id, userName: w.user_name, action: 'DEBIT' })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Debit">
                        <MinusCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {wallets.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No wallets found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b">User</th>
                <th className="p-4 border-b">Amount & Method</th>
                <th className="p-4 border-b">Screenshot</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topups.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-bold text-sm">{t.user_name}</div>
                    <div className="text-xs text-slate-500">{t.user_email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-emerald-600">Rs. {(t.requested_amount || t.requestedAmount || 0).toLocaleString()}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">{t.payment_method || t.paymentMethod}</div>
                  </td>
                  <td className="p-4">
                    {(t.screenshot_url || t.screenshotUrl) ? (
                      <a href={t.screenshot_url || t.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs">View Proof</a>
                    ) : <span className="text-xs text-slate-400">None</span>}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {t.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                         <button onClick={() => {
                           setReviewModal(t);
                           setReviewAction('APPROVE');
                           setReviewAmount((t.requested_amount || t.requestedAmount || 0).toString());
                           setReviewNote('');
                         }} disabled={processingId === t.id} className="p-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-600 hover:text-white transition-colors"><Check className="w-4 h-4" /></button>
                         <button onClick={() => {
                           setReviewModal(t);
                           setReviewAction('REJECT');
                           setReviewNote('');
                         }} disabled={processingId === t.id} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {topups.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No requests found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {adjustModal.action === 'CREDIT' ? 'Add Credit to' : 'Deduct from'} {adjustModal.userName}
            </h3>
            <p className="text-xs text-slate-500 mb-6">Enter compulsory reason for audit logs.</p>
            
            <form onSubmit={handleAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR)</label>
                <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="1000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason (Compulsory)</label>
                <input type="text" required value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Test credit..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={!!processingId} className={`flex-1 py-2 text-sm font-bold text-white rounded-lg ${adjustModal.action === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {processingId === adjustModal.userId ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {reviewAction === 'APPROVE' ? 'Approve Top-Up' : 'Reject Top-Up'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">User: {reviewModal.user_name}</p>
            
            <form onSubmit={submitReview} className="space-y-4">
              {reviewAction === 'APPROVE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approved Amount (NPR)</label>
                  <input type="number" required min="1" value={reviewAmount} onChange={e => setReviewAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {reviewAction === 'APPROVE' ? 'Admin Note (Optional)' : 'Rejection Reason (Compulsory)'}
                </label>
                <input type="text" required={reviewAction === 'REJECT'} value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setReviewModal(null)} className="flex-1 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={!!processingId} className={`flex-1 py-2 text-sm font-bold text-white rounded-lg ${reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {processingId === reviewModal.id ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
