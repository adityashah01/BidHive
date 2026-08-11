import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { getWallet, getWalletTransactions, getWalletTopups, cancelWalletTopup } from '../lib/api';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, Clock, AlertCircle, Check, ListOrdered, Plus, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AddMoneyModal from './AddMoneyModal';
import PaymentQRCode from './PaymentQRCode';
import type { User } from '../types';

interface WalletPageProps {
  currentUser: User | null;
}

export default function WalletPage({ currentUser }: WalletPageProps) {
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'QR_PAGE'>('OVERVIEW');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [wRes, tRes, topRes] = await Promise.all([
        getWallet(),
        getWalletTransactions(),
        getWalletTopups()
      ]);
      setWalletInfo(wRes.wallet);
      setTransactions(tRes || []);
      setTopups(topRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 flex justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#D99000] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!walletInfo) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center justify-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Could not load wallet data.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      
      {/* Wallet Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-lg border border-[#E5E7EB] p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#D99000]/10 text-[#D99000] flex items-center justify-center">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#18181B]">BidHive Wallet</h2>
            <p className="text-xs text-[#6B7280]">
              Manage your balance, scan QR code for top-ups, and review transaction ledgers.
            </p>
          </div>
        </div>

        {/* Navigation Switcher */}
        <div className="flex items-center gap-1 bg-[#F7F7F5] p-1 rounded-lg border border-[#E5E7EB]">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-[#18181B] shadow-2xs border border-[#E5E7EB]'
                : 'text-[#6B7280] hover:text-[#18181B]'
            }`}
          >
            <WalletIcon className="w-3.5 h-3.5" />
            Balance & Ledger
          </button>
          <button
            onClick={() => setActiveTab('QR_PAGE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'QR_PAGE'
                ? 'bg-[#D99000] text-white shadow-2xs'
                : 'text-[#6B7280] hover:text-[#18181B]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code Payment Page
          </button>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & TRANSACTIONS */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* Overview Metric Cards */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
              <div>
                <h3 className="font-bold text-[#18181B] text-base">Account Balance Overview</h3>
                <p className="text-xs text-[#6B7280]">Real-time available funds and locked active bid holds.</p>
              </div>

              <button 
                onClick={() => setShowAddMoneyModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#D99000] hover:bg-[#B87500] text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Add Money via QR
              </button>
            </div>

            {/* Metric Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#F7F7F5] border border-[#E5E7EB] p-4 rounded-lg">
                <span className="text-xs font-semibold text-[#6B7280] block">Available Balance</span>
                <div className="text-2xl font-black text-[#18181B] mt-1">
                  Rs. {walletInfo.availableBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-[#F7F7F5] border border-[#E5E7EB] p-4 rounded-lg">
                <span className="text-xs font-semibold text-[#6B7280] block">Held in Active Bids</span>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  Rs. {walletInfo.heldBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-[#F7F7F5] border border-[#E5E7EB] p-4 rounded-lg">
                <span className="text-xs font-semibold text-[#6B7280] block">Total Account Balance</span>
                <div className="text-2xl font-black text-[#18181B] mt-1">
                  Rs. {walletInfo.totalBalance.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {walletInfo.welcomeBonusReceived && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rs. 1,000 promotional welcome credit added to your account.</span>
              </div>
            )}
          </div>

          {/* Quick QR Banner inside overview */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-[#D99000] rounded-lg border border-amber-200">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#18181B] text-sm">Need to add wallet funds?</h4>
                <p className="text-xs text-[#6B7280]">Scan our merchant QR code via eSewa or Khalti to credit your account.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('QR_PAGE')}
              className="px-4 py-2 bg-[#18181B] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Open QR Payment Page
            </button>
          </div>
        </>
      )}

      {/* VIEW 2: STATIC QR CODE PAYMENT PAGE */}
      {activeTab === 'QR_PAGE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-6">
            <div className="border-b border-[#E5E7EB] pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#18181B] text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#D99000]" />
                  Merchant QR Code Payment Page
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Scan the QR code below using eSewa or Khalti app to complete your wallet top-up transfer.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-md">
                Verified Merchant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: QR Code Component */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Select Gateway & Scan QR Code
                </label>
                <PaymentQRCode size={200} showDetails={true} />
              </div>

              {/* Right Column: Instructions & Submit Button */}
              <div className="space-y-5 text-xs">
                <div className="bg-[#F7F7F5] border border-[#E5E7EB] p-4 rounded-lg space-y-3">
                  <h4 className="font-bold text-[#18181B] text-sm border-b border-[#E5E7EB] pb-2">
                    Step-by-Step Payment Instructions
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-[#6B7280] leading-relaxed">
                    <li>Open <strong>eSewa</strong> or <strong>Khalti</strong> app on your smartphone.</li>
                    <li>Tap <strong>Scan QR</strong> or send direct payment to number <strong>9801234567</strong> (eSewa) or <strong>9860123456</strong> (Khalti).</li>
                    <li>Enter your desired top-up amount in Nepalese Rupees (Rs).</li>
                    <li>Include your BidHive account name in the payment remarks/remarks field.</li>
                    <li>Confirm the transfer and take a screenshot of the completed payment receipt.</li>
                    <li>Click the <strong>"Submit Payment Reference & Proof"</strong> button below to notify the administrator.</li>
                  </ol>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-amber-900 text-xs space-y-1">
                  <span className="font-bold block">🔒 Verification & Credit Guarantee:</span>
                  <p className="leading-normal">
                    The administrator verifies payment references within minutes. Once verified, the exact amount will be credited directly to your BidHive available balance.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddMoneyModal(true)}
                  className="w-full bg-[#D99000] hover:bg-[#B87500] text-white font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Submit Payment Reference & Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Top-Up Requests */}
      {topups.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#D99000]" />
            <h3 className="font-bold text-[#18181B] text-sm">Top-Up Requests</h3>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {topups.map((topup) => (
              <div key={topup.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-bold text-[#18181B] text-sm">
                    Rs. {topup.requestedAmount.toLocaleString('en-IN')} via {topup.paymentMethod}
                  </div>
                  <div className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-2">
                    <span>{formatDistanceToNow(new Date(topup.submittedAt), { addSuffix: true })}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      topup.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      topup.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      topup.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {topup.status}
                    </span>
                  </div>
                  {topup.rejectionReason && topup.status === 'REJECTED' && (
                    <p className="text-xs text-red-600 mt-1 font-medium">Reason: {topup.rejectionReason}</p>
                  )}
                </div>
                {topup.status === 'PENDING' && (
                  <button 
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to cancel this top-up request?')) return;
                      try {
                        await cancelWalletTopup(topup.id);
                        fetchData();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to cancel request');
                      }
                    }}
                    className="text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Ledger Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6B7280]" />
          <h3 className="font-bold text-[#18181B] text-sm">Transaction History</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-[#6B7280] text-xs">
            No transactions found in your wallet history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F7F5] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase">
                  <th className="p-3 pl-4">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-xs">
                {transactions.map((tx) => {
                  const isCredit = ['WELCOME_BONUS', 'TOP_UP', 'BID_RELEASE', 'ADMIN_CREDIT', 'REFUND'].includes(tx.type);
                  const isHeld = tx.type === 'BID_HOLD';

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-[#18181B]">
                        <span className={`inline-flex items-center gap-1 ${
                          isCredit ? 'text-emerald-700' : isHeld ? 'text-amber-700' : 'text-red-700'
                        }`}>
                          {isCredit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-[#18181B]">{tx.description}</td>
                      <td className="p-3 text-[#6B7280]">
                        {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                      </td>
                      <td className={`p-3 pr-4 text-right font-bold ${
                        isCredit ? 'text-emerald-700' : isHeld ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {isCredit ? '+' : '-'}Rs. {Math.abs(tx.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddMoneyModal && (
        <AddMoneyModal 
          isOpen={showAddMoneyModal} 
          onClose={() => {
            setShowAddMoneyModal(false);
            fetchData();
          }} 
        />
      )}
    </div>
  );
}
