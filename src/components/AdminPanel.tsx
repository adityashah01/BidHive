import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import AdminWalletPanel from './AdminWalletPanel';
import { Listing, User, Report, Category, Transaction, PaymentScreenshot } from '../types';
import { 
  ShieldCheck, 
  AlertCircle, 
  Ban, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ShieldAlert, 
  Coins, 
  History, 
  Mail, 
  Eye, 
  TrendingUp, 
  ShoppingBag, 
  Key, 
  Clock, 
  UserCheck, 
  Activity, 
  Search,
  Filter,
  DollarSign,
  QrCode,
  Hammer,
  HelpCircle,
  FileImage,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { api, getAuthToken } from '../lib/api';

interface AdminPanelProps {
  listings: Listing[];
  users: User[];
  reports: Report[];
  transactions: Transaction[];
  commissionRate: number;
  onSetCommissionRate: (rate: number) => void;
  onApproveListing: (listingId: string) => void;
  onRejectListing: (listingId: string) => void;
  onResolveReport: (reportId: string, action: 'RESOLVE' | 'DISMISS') => void;
  onToggleUserBan: (userId: string) => void;
  onDeleteListing: (listingId: string, skipConfirm?: boolean) => void;
  onDeleteUser?: (userId: string) => void;
  onRefreshAllData?: () => void;
}

export default function AdminPanel({
  listings,
  users,
  reports,
  transactions = [],
  commissionRate,
  onSetCommissionRate,
  onApproveListing,
  onRejectListing,
  onResolveReport,
  onToggleUserBan,
  onDeleteListing,
  onDeleteUser,
  onRefreshAllData
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'RECEIPTS' | 'WALLET' | 'LOGS'>('DASHBOARD');
  const [rateInput, setRateInput] = useState(commissionRate.toString());

  // Neon Payment Screenshots table state
  const [screenshots, setScreenshots] = useState<PaymentScreenshot[]>([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [errorScreenshots, setErrorScreenshots] = useState<string | null>(null);

  // Filter and search states
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatusFilter, setListingStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'ENDED' | 'SOLD'>('ALL');
  const [userSearch, setUserSearch] = useState('');
  
  // Audits & Emails logs state
  const [emails, setEmails] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedEmailHtml, setSelectedEmailHtml] = useState<string | null>(null);

  // Consolidated server-side stats state
  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Modal / Zoom state
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);

  // Database Explorer state
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [activeDbTable, setActiveDbTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [makingAllLive, setMakingAllLive] = useState(false);

  const handleMakeAllLive = async () => {
    setMakingAllLive(true);
    try {
      await api.makeAllListingsLive();
      toast.success('All products are now live and open for bidding!');
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to make products live');
    } finally {
      setMakingAllLive(false);
    }
  };

  const fetchScreenshots = async () => {
    if (!getAuthToken()) return;
    setLoadingScreenshots(true);
    setErrorScreenshots(null);
    try {
      const data = await api.getPaymentScreenshots().catch(() => []);
      setScreenshots(data || []);
    } catch (err: any) {
      console.warn('Payment screenshots call notice:', err?.message || err);
    } finally {
      setLoadingScreenshots(false);
    }
  };

  const handleApproveScreenshot = async (id: string) => {
    try {
      await api.approvePaymentScreenshot(id);
      toast.success('Payment screenshot has been successfully approved. Corresponding transaction is now settled!');
      fetchScreenshots();
      if (onRefreshAllData) {
        onRefreshAllData();
      }
      fetchLogs();
    } catch (err: any) {
      alert('Failed to approve screenshot: ' + err.message);
    }
  };

  const handleRejectScreenshot = async (id: string) => {
    const reason = window.prompt(
      "Enter rejection reason (dispatched to buyer and keeps payment pending):", 
      "Incorrect or unreadable payment proof screenshot. Please upload a clear valid receipt."
    );
    if (reason === null) return; // cancelled

    try {
      await api.rejectPaymentScreenshot(id, reason);
      toast.success('Payment screenshot has been successfully rejected. Notification has been dispatched.');
      fetchScreenshots();
      if (onRefreshAllData) {
        onRefreshAllData();
      }
      fetchLogs();
    } catch (err: any) {
      alert('Failed to reject screenshot: ' + err.message);
    }
  };

  const fetchDbTables = async () => {
    setLoadingDb(true);
    try {
      const data = await api.getAdminDbTables();
      setDbTables(data.tables || []);
    } catch (err: any) {
      console.error('Failed to load database tables:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  const fetchDbTableRows = async (tableName: string) => {
    setLoadingDb(true);
    try {
      const data = await api.getAdminDbTables(tableName);
      if (data.table === tableName) {
        setTableRows(data.rows || []);
        setActiveDbTable(tableName);
      }
    } catch (err: any) {
      alert(`Failed to fetch records for table ${tableName}: ` + err.message);
    } finally {
      setLoadingDb(false);
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('Are you absolutely sure you want to completely clear and reset the entire database? All records will be deleted and initialized with clean professional Nepali mock listing data.')) {
      return;
    }
    setResettingDb(true);
    try {
      const res = await api.resetAdminDb();
      alert(res.message || 'Database reset successfully!');
      if (onRefreshAllData) {
        onRefreshAllData();
      }
      setActiveDbTable(null);
      setTableRows([]);
      fetchDbTables();
      fetchLogs();
    } catch (err: any) {
      alert('Failed to reset database: ' + err.message);
    } finally {
      setResettingDb(false);
    }
  };

  const fetchLogs = async () => {
    if (!getAuthToken()) return;
    setLoadingLogs(true);
    setLoadingStats(true);
    try {
      const [auditList, emailList, statsData] = await Promise.all([
        api.getAdminAudits().catch(() => []),
        api.getAdminEmails().catch(() => []),
        api.getAdminStats().catch(() => null)
      ]);
      setAudits(auditList || []);
      setEmails(emailList || []);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err: any) {
      console.warn('Admin logs/stats call notice:', err?.message || err);
    } finally {
      setLoadingLogs(false);
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchScreenshots();
  }, [transactions, listings, users]);

  useEffect(() => {
    if (activeTab === 'RECEIPTS') {
      fetchScreenshots();
    }
    if (activeTab === 'LOGS') {
      fetchDbTables();
    }
  }, [activeTab]);

  // Format NPR helper
  const formatNPR = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount || 0).replace('NPR', 'Rs.');
  };

  // Calculations
  const pendingApprovals = listings.filter((l) => l.status === 'PENDING');
  const activeAuctions = listings.filter((l) => l.status === 'ACTIVE');
  const paidTransactions = transactions.filter(t => t.paymentStatus === 'PAID');
  const totalSalesVolume = transactions.reduce((sum, t) => sum + t.finalAmount, 0);
  const totalVolumePaid = paidTransactions.reduce((sum, t) => sum + t.finalAmount, 0);
  const totalRevenueCollected = totalVolumePaid * (commissionRate / 100);

  // Filter listings based on search and status
  const filteredListings = listings.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(listingSearch.toLowerCase()) ||
                          item.sellerName.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesStatus = listingStatusFilter === 'ALL' || item.status === listingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter users based on search
  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(rateInput);
    if (!isNaN(rate) && rate >= 0 && rate <= 30) {
      onSetCommissionRate(rate);
      toast.success(`Global commission rate updated to ${rate}% successfully!`);
    } else {
      toast.error('Please enter a valid percentage between 0 and 30%.');
    }
  };

  return (
    <div id="admin-panel-container" className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 lg:p-8 space-y-6">
      
      {/* Super Admin Title Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              BidHive Super Admin Dashboard
              <span className="hidden sm:inline-block text-[10px] bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                System Root Console
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-semibold">Real-time database audits, screenshot verification queues, active bid streams, and listed inventory managers.</p>
          </div>
        </div>

        <button
          id="btn-admin-make-all-live"
          onClick={handleMakeAllLive}
          disabled={makingAllLive}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          {makingAllLive ? 'Activating All Products...' : 'Make All Products Live ⚡'}
        </button>
      </div>

      {/* Simplified focused tabs switcher */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
        {[
          { id: 'DASHBOARD', label: 'Dashboard & Listings 📈' },
          { id: 'USERS', label: 'User Directory 👥' },
          { id: 'RECEIPTS', label: `Screenshot Verifications (${screenshots.filter(s => s.status === 'PENDING_REVIEW').length}) 📑` },
          { id: 'WALLET', label: 'Wallet Topups 💰' },
          { id: 'LOGS', label: 'System Logs & Tools 🗄️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW & LISTINGS */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 relative overflow-hidden">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Registered Users</span>
              <span className="text-2xl font-black text-slate-950 block mt-1">{users.length} users</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Sellers & Bidders directory active</span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 relative overflow-hidden">
              <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider block">Ongoing Active Auctions</span>
              <span className="text-2xl font-black text-indigo-950 block mt-1">{activeAuctions.length} live</span>
              <span className="text-[10px] text-indigo-500 font-medium block mt-0.5">Bidding timers ticking</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 relative overflow-hidden">
              <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">Total Sales Volume</span>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{formatNPR(totalSalesVolume)}</span>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">NPR checkout throughput</span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 relative overflow-hidden">
              <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block">Est. Revenue Collected</span>
              <span className="text-2xl font-black text-rose-950 block mt-1">{formatNPR(totalRevenueCollected)}</span>
              <span className="text-[10px] text-rose-600 font-medium block mt-0.5">Surcharge Share ({commissionRate}%)</span>
            </div>
          </div>

          {/* Active Bidding Monitor Widget */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Hammer className="w-4 h-4 text-indigo-600" />
                Live Active Bidding Monitor (Latest Platform Activity)
              </h3>
              <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-black uppercase">
                Real-Time stream
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3">Bidder</th>
                    <th className="p-3">Product Title</th>
                    <th className="p-3 text-center">Bid Amount</th>
                    <th className="p-3 text-right">Time Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!stats?.activeBidList || stats.activeBidList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-6 text-slate-400 font-bold">
                        No active bid records available in audit log.
                      </td>
                    </tr>
                  ) : (
                    stats.activeBidList.slice(0, 5).map((bid: any) => (
                      <tr key={bid.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{bid.bidderName}</td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{bid.productTitle}</td>
                        <td className="p-3 text-center font-extrabold text-indigo-600">{formatNPR(bid.bidAmount)}</td>
                        <td className="p-3 text-right text-slate-400 font-mono text-[10px]">
                          {new Date(bid.bidTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Listings Management Block */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <ShoppingBag className="w-4.5 h-4.5 text-slate-700" />
                  Inventory & Listing State Controller
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Approve pending seller listings, track status, or remove flagged items.</p>
              </div>

              {/* Status Filters and Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by product, seller..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-400 max-w-[200px]"
                  />
                </div>

                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(['ALL', 'PENDING', 'ACTIVE', 'ENDED', 'SOLD'] as const).map((filterVal) => (
                    <button
                      key={filterVal}
                      onClick={() => setListingStatusFilter(filterVal)}
                      className={`px-2 py-1 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                        listingStatusFilter === filterVal
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {filterVal}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Listings Directory Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3">Product Listing</th>
                    <th className="p-3">Seller Name</th>
                    <th className="p-3 text-right">Start Price</th>
                    <th className="p-3 text-right">Current Price</th>
                    <th className="p-3 text-center">System State</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredListings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                        No listings matching search filters were found.
                      </td>
                    </tr>
                  ) : (
                    filteredListings.map((item) => {
                      const isPending = item.status === 'PENDING';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-900 block">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">ID: {item.id}</span>
                          </td>
                          <td className="p-3 text-slate-600 font-bold">{item.sellerName}</td>
                          <td className="p-3 text-right text-slate-500">{formatNPR(item.startingPrice)}</td>
                          <td className="p-3 text-right font-extrabold text-slate-900">{formatNPR(item.currentPrice)}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : isPending
                                ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => onApproveListing(item.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => onRejectListing(item.id)}
                                    className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteListing(item.id);
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 active:scale-95 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-xs"
                                title="Delete Listing from Inventory and Database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: USER DIRECTORY */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Registered Members Directory Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Search users, audit system privileges, or revoke access for rules violators.</p>
            </div>

            {/* User Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-400 min-w-[240px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-3">User Details & ID</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3 text-center">Assigned Role</th>
                  <th className="p-3 text-center">Access Status</th>
                  <th className="p-3 text-right">Account Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-bold">
                      No members matched the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isBanned = u.isBanned || false;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3">
                          <span className="font-extrabold text-slate-900 block">{u.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">UID: {u.id}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{u.email}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : u.role === 'SELLER'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isBanned 
                              ? 'bg-rose-50 border-rose-200 text-rose-700' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to ${isBanned ? 'REVOKE BAN' : 'BAN'} the user "${u.name}"?`)) {
                                  onToggleUserBan(u.id);
                                }
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all ${
                                isBanned
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                              }`}
                            >
                              {isBanned ? 'Unban User' : 'Ban User'}
                            </button>
                            {onDeleteUser && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`PERMANENT DELETE: Are you sure you want to delete user "${u.name}" (${u.email}) from the database?`)) {
                                    onDeleteUser(u.id);
                                  }
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCREENSHOT VERIFICATIONS (NEON DB) */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <FileImage className="w-5 h-5 text-indigo-600" />
                Manual Payment Receipts Verification Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Audit manual bank transfers, cross-examine screenshots, and verify payments in Neon DB.</p>
            </div>

            <button
              onClick={fetchScreenshots}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer border"
            >
              Sync Receipts Queue
            </button>
          </div>

          {errorScreenshots && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorScreenshots}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-3">ID & Date</th>
                  <th className="p-3">Associated Transaction</th>
                  <th className="p-3">Buyer (Depositor)</th>
                  <th className="p-3 text-right">Deposit Amt</th>
                  <th className="p-3 text-center">Screenshot</th>
                  <th className="p-3 text-center">Status Label</th>
                  <th className="p-3 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingScreenshots ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <span className="inline-block h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                      <p className="text-xs text-slate-400 mt-2">Streaming receipts logs...</p>
                    </td>
                  </tr>
                ) : screenshots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                      No bank proof screenshot uploads found in the Neon database.
                    </td>
                  </tr>
                ) : (
                  screenshots.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3">
                        <span className="text-[9px] text-slate-400 font-mono block">REC-{item.id.slice(0,8)}</span>
                        <span className="text-slate-500 block text-[10px]">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-950">
                        <span className="text-[10px] text-slate-400 font-mono block">Txn ID: {item.transactionId}</span>
                        Manual Ledger Match
                      </td>
                      <td className="p-3">
                        <span className="block text-[11px] font-extrabold text-slate-800">{item.buyerName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{item.buyerEmail}</span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900">{formatNPR(item.amount)}</td>
                      <td className="p-3 text-center">
                        {item.screenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => window.open(item.screenshotUrl, '_blank')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            Inspect Receipt
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">No file</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            item.status === 'DONE'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse'
                          }`}
                        >
                          {item.status === 'DONE' ? 'Done' : item.status === 'REJECTED' ? 'Rejected' : 'Pending to review'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {item.status === 'PENDING_REVIEW' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveScreenshot(item.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectScreenshot(item.id)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">{item.status === 'DONE' ? 'Verified' : 'Rejected'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WALLET TOP-UPS */}
      {activeTab === 'WALLET' && (
        <AdminWalletPanel />
      )}

      {/* TAB 5: SYSTEM LOGS & TOOLS */}
      {activeTab === 'LOGS' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Reported Items Review Section */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce" />
                  Flags & Reported Listing Queue
                </h3>
              </div>

              {reports.filter((r) => r.status === 'PENDING').length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400 font-bold">No active reports or flags in queue.</p>
              ) : (
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
                  {reports
                    .filter((r) => r.status === 'PENDING')
                    .map((rep) => (
                      <div key={rep.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Report ID: {rep.id}</span>
                            <span className="font-extrabold text-slate-900 text-xs">Listing: {rep.listingTitle}</span>
                          </div>
                          <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-black uppercase">PENDING</span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100">
                          Reason: <span className="text-slate-800">{rep.reason}</span>
                        </p>
                        <div className="flex justify-end gap-2 mt-1">
                          <button
                            onClick={() => onResolveReport(rep.id, 'RESOLVE')}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Resolve (Remove Listing)
                          </button>
                          <button
                            onClick={() => onResolveReport(rep.id, 'DISMISS')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Adjust Commission Rate Section */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  Surcharge & Platform Commission Adjuster
                </h3>
              </div>

              <form onSubmit={handleRateSubmit} className="space-y-3">
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Modify the global commission fee deducted from second-hand winning transactions. Range: 0% to 30%.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                  >
                    Update Rate
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 text-[11px] text-slate-400 font-semibold">
                  Current Surcharge: <strong className="text-slate-800">{commissionRate}%</strong>
                </div>
              </form>
            </div>

          </div>

          {/* Database Explorer block */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                🗄️ Database Diagnostics & Raw Tables Explorer
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={fetchDbTables}
                  className="text-[10px] bg-white border px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Refresh Tables
                </button>
                <button
                  onClick={handleResetDb}
                  disabled={resettingDb}
                  className="text-[10px] bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-200 font-bold"
                >
                  {resettingDb ? 'Resetting DB...' : 'Reset Database'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider pb-1">PostgreSQL Tables</span>
                {dbTables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => fetchDbTableRows(t.name)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] font-bold block transition-all ${
                      activeDbTable === t.name
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.name} ({t.count})
                  </button>
                ))}
              </div>

              <div className="md:col-span-9">
                <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider pb-1">
                  {activeDbTable ? `Raw Records in "${activeDbTable}"` : 'Select a table to inspect raw rows'}
                </span>
                
                {activeDbTable ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-[300px]">
                    <table className="w-full text-left text-[10px] border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[8px]">
                          {tableRows.length > 0 && Object.keys(tableRows[0]).map((key) => (
                            <th key={key} className="p-2 font-bold">{key}</th>
                          ))}
                          {tableRows.length > 0 && tableRows[0]?.id && <th className="p-2 font-bold text-right">Admin Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tableRows.length === 0 ? (
                          <tr>
                            <td className="p-4 text-center text-slate-400 font-bold italic">No records in table.</td>
                          </tr>
                        ) : (
                          tableRows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="p-2 truncate max-w-xs text-slate-600">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                </td>
                              ))}
                              {row.id && (
                                <td className="p-2 text-right">
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Delete record ID ${row.id} from table "${activeDbTable}"?`)) {
                                        try {
                                          if (activeDbTable === 'listings') {
                                            onDeleteListing(row.id);
                                          } else if (activeDbTable === 'users' && onDeleteUser) {
                                            await onDeleteUser(row.id);
                                          } else {
                                            await api.deleteDbRecord(activeDbTable, row.id);
                                          }
                                          setTimeout(() => fetchDbTableRows(activeDbTable), 500);
                                          if (onRefreshAllData) onRefreshAllData();
                                        } catch (err: any) {
                                          toast.error(err.message || 'Failed to delete record.');
                                        }
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 hover:shadow-sm active:scale-95 text-white rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1 justify-end ml-auto"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 bg-white rounded-lg p-12 text-center text-xs text-slate-400 font-semibold">
                    Select any PostgreSQL schema table from the left to diagnostic inspect its columns and records.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs Trail */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                Root Security Audit Trail & Access Logs
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[250px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Operator</th>
                    <th className="p-2.5">Action Type</th>
                    <th className="p-2.5">Description details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {audits.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40">
                      <td className="p-2.5 text-slate-400 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-700 font-extrabold">{log.userName}</td>
                      <td className="p-2.5 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[9px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
