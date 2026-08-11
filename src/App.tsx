import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';

// Setup Pusher client
let pusherClient: Pusher | null = null;
if ((import.meta as any).env.VITE_PUSHER_KEY && (import.meta as any).env.VITE_PUSHER_CLUSTER) {
  pusherClient = new Pusher((import.meta as any).env.VITE_PUSHER_KEY, {
    cluster: (import.meta as any).env.VITE_PUSHER_CLUSTER
  });
}

import {
  User,
  Listing,
  Bid,
  Category,
  Notification,
  Report,
  Transaction,
  Review,
  Condition,
  PaymentMethod
} from './types';
import IdentitySwitcher from './components/IdentitySwitcher';
import ListingCard from './components/ListingCard';
import NotificationCenter from './components/NotificationCenter';

import { Suspense, lazy } from 'react';
const ListingDetail = lazy(() => import('./components/ListingDetail'));
const CreateListingForm = lazy(() => import('./components/CreateListingForm'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const WalletPage = lazy(() => import('./components/WalletPage'));
const PaymentPage = lazy(() => import('./components/PaymentPage'));





import { Wallet, Loader2 } from 'lucide-react';

import PaymentModal from './components/PaymentModal';
const Login = lazy(() => import('./components/Login'));
import BidHiveLogo from './components/BidHiveLogo';
import { NotificationListener } from './components/NotificationListener';
import { api } from './lib/api.ts';

const formatNPR = (amount: number) => `Rs. ${(amount || 0).toLocaleString()}`;

// Icons
import {
  Search,
  Plus,
  LayoutDashboard,
  ShieldAlert,
  Bell,
  Gavel,
  Filter,
  CheckCircle2,
  Star,
  Sparkles,
  Heart,
  HelpCircle,
  LogOut,
  Shield,
  UserCheck,
  TrendingUp,
  RefreshCw,
  QrCode,
  ArrowLeft,
  ChevronRight,
  Database,
  Lock,
  Menu,
  X,
  CreditCard,
  ShoppingBag,
  PlusCircle,
  Trash2
} from 'lucide-react';

import DeleteListingModal from './components/DeleteListingModal';

export default function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // --- MODAL STATE ---
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  // --- CORE SYSTEM STATE ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userBids, setUserBids] = useState<Bid[]>([]);
  
  // Admin Lists
  const [usersList, setUsersList] = useState<User[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(5.0);

  // --- NAVIGATION / VIEWS ---
  // Supported views: 'BROWSE' | 'DETAIL' | 'CREATE' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT' | 'SUPER_ADMIN_LOGIN' | 'SUPER_ADMIN_PANEL' | 'LOGIN'
  const [view, setView] = useState<'BROWSE' | 'DETAIL' | 'CREATE' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT' | 'SUPER_ADMIN_LOGIN' | 'SUPER_ADMIN_PANEL' | 'LOGIN' | 'WALLET'>('BROWSE');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListingDetail, setSelectedListingDetail] = useState<(Listing & { bids: Bid[] }) | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'PURCHASES' | 'LISTINGS' | 'BIDDING' | 'PAYMENTS'>('PURCHASES');
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Super Admin login credentials (local)
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- HISTORY ROUTING SYNC ---
  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new Event('popstate'));
  };

  useEffect(() => {
    if (loadingAuth) return;

    const handleUrlRouting = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      
      if (path === '/login') {
        setView('LOGIN');
      } else if (path === '/bidhive-admin/login') {
        setView('SUPER_ADMIN_LOGIN');
      } else if (path === '/bidhive-admin') {
        if (!currentUser) {
          navigate('/login');
        } else {
          setView('SUPER_ADMIN_PANEL');
        }
      } else if (path === '/payment') {
        if (!currentUser) {
          navigate('/login');
        } else {
          setView('PAYMENT');
        }
      } else if (path === '/create') {
        if (!currentUser) {
          navigate('/login');
        } else {
          setView('CREATE');
        }
      } else if (path === '/dashboard') {
        if (!currentUser) {
          navigate('/login');
        } else {
          setView('DASHBOARD');
        }
      } else if (path === '/user-admin' || path === '/admin') {
        if (!currentUser) {
          navigate('/login');
        } else {
          setView('SUPER_ADMIN_PANEL');
        }
      } else if (path.startsWith('/listing/')) {
        const listingId = path.split('/listing/')[1];
        if (listingId) {
          setSelectedListingId(listingId);
          setView('DETAIL');
        }
      } else {
        setView('BROWSE');
        setSelectedListingId(null);
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, [loadingAuth, currentUser]);

  // --- FILTERS & SEARCH ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'ENDING_SOON' | 'JUST_LISTED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'MOST_VIEWS'>('ENDING_SOON');

  // --- REVIEWS / PAYMENTS MODALS ---
  const [activePaymentTransaction, setActivePaymentTransaction] = useState<Transaction | null>(null);
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');

  // --- UNREAD NOTIFICATION DROPDOWN ---
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [kathmanduTime, setKathmanduTime] = useState('');

  // Ticking Clock for Kathmandu (UTC+5:45)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Calculate Kathmandu Time (UTC + 5:45)
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const ktmOffsetMs = 5.75 * 3600000; // 5 hours and 45 minutes
      const ktmDate = new Date(utc + ktmOffsetMs);
      
      const timeStr = ktmDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      });
      setKathmanduTime(timeStr);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // --- INITIAL LOAD & PROFILE CHECK ---
  useEffect(() => {
    async function checkAuth() {
      try {
        const profile = await api.getProfile();
        setCurrentUser(profile);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener('auth_token_changed', handleAuthChange);
    return () => window.removeEventListener('auth_token_changed', handleAuthChange);
  }, []);

  // --- RE-FETCH CORE DATA ON RE-LOGIN OR VIEW CHANGE ---
  const loadCoreData = async () => {
    if (!currentUser) return;
    try {
      const cats = await api.getCategories();
      setCategories(cats);

      const list = await api.getListings();
      setListings(list);

      const txns = await api.getTransactions();
      setTransactions(txns);

      const bidsData = await api.getBids();
      setUserBids(bidsData || []);

      const notifs = await api.getNotifications();
      setNotifications(notifs);

      try {
        const walletRes = await api.getWallet();
        if (walletRes && walletRes.wallet) {
          setWalletInfo(walletRes.wallet);
        }
      } catch (wErr) {
        console.error('Failed to load wallet in loadCoreData:', wErr);
      }

      if (currentUser.role === 'ADMIN') {
        const uList = await api.getAdminUsers();
        setUsersList(uList);

        const repList = await api.getAdminReports();
        setReportsList(repList);
      }
    } catch (err) {
      console.error('Failed to load data from PostgreSQL:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadCoreData();
    }
  }, [currentUser]);

  // Private Pusher User Channel Subscription
  useEffect(() => {
    if (currentUser && pusherClient) {
      const channelName = `private-user-${currentUser.id}`;
      (pusherClient.config as any).authEndpoint = '/api/pusher/auth';
      (pusherClient.config as any).auth = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('bidhive_token') || ''}`,
        },
      };

      const userChannel = pusherClient.subscribe(channelName);

      userChannel.bind('auction-won', (data: any) => {
        toast.success(`🎉 ${data.message || 'You won the auction!'}`, { duration: 6000 });
        loadCoreData();
      });

      userChannel.bind('listing-sold', (data: any) => {
        toast.success(`💰 ${data.message || 'Your listing sold!'}`, { duration: 5000 });
        loadCoreData();
      });

      userChannel.bind('auction-lost', (data: any) => {
        toast(data.message || 'An auction has ended.', { icon: 'ℹ️' });
        loadCoreData();
      });

      userChannel.bind('notification-created', (data: any) => {
        toast(data.message || 'New notification received.');
        loadCoreData();
      });

      return () => {
        pusherClient?.unsubscribe(channelName);
      };
    }
  }, [currentUser]);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleSelectNotification = (notif: Notification) => {
    const listingId = notif.listingId || notif.link;
    if (listingId) {
      setSelectedListingId(listingId);
      navigate(`/listing/${listingId}`);
      setView('DETAIL');
    }
  };

  // Fetch specific listing detail if selected
  useEffect(() => {
    async function loadListingDetail() {
      if (!selectedListingId) return;
      try {
        const detail = await api.getListing(selectedListingId);
        setSelectedListingDetail(detail);
      } catch (err) {
        console.error('Error loading listing details:', err);
      }
    }
    loadListingDetail();

    if (selectedListingId && pusherClient) {
      const channel = pusherClient.subscribe(`listing-${selectedListingId}`);
      channel.bind('new-bid', (data: { listing: Listing, bids: Bid[] }) => {
        setSelectedListingDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...data.listing,
            bids: data.bids,
          };
        });
      });

      return () => {
        pusherClient?.unsubscribe(`listing-${selectedListingId}`);
      };
    }
  }, [selectedListingId]);

  // Handle successful login
  const handleLoginSuccess = (userProfile: any) => {
    setCurrentUser(userProfile);
    // Sync redirect back to super admin if logging into the super admin email
    if (userProfile.email === 'aditya.shh15@gmail.com') {
      navigate('/bidhive-admin');
    } else {
      navigate('/');
    }
  };

  // Switch role dynamically in database
  const handleSwitchRole = async (newRole: 'BIDDER' | 'SELLER' | 'ADMIN') => {
    if (!currentUser) return;
    try {
      const updatedProfile = await api.updateRole(newRole);
      setCurrentUser(updatedProfile);
      setShowRoleSelector(false);
      
      // Pivot views based on new role
      if (newRole === 'ADMIN') {
        navigate('/bidhive-admin');
      } else if (newRole === 'SELLER') {
        navigate('/create');
      } else {
        navigate('/');
      }
      loadCoreData();
    } catch (err) {
      alert('Failed to switch role in PostgreSQL: ' + err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    navigate('/');
  };

  // --- CORE WORKFLOW HANDLERS ---

  // Handle new listing creation
  const handleCreateListing = async (formData: Partial<Listing>) => {
    try {
      const formattedData = {
        ...formData,
        status: formData.status || 'PENDING',
        startTime: formData.startTime || new Date().toISOString(),
        endTime: formData.endTime || new Date(Date.now() + Number((formData as any).durationDays || 3) * 24 * 60 * 60 * 1000).toISOString(),
      };
      await api.createListing(formattedData);
      toast.success('Listing created successfully! Your item is now live and ready for bidding.');
      navigate('/');
      loadCoreData();
    } catch (err: any) {
      alert('Failed to create listing in PostgreSQL: ' + err.message);
    }
  };

  // Handle standard or proxy bid placement
  const handlePlaceBid = async (amount: number, isAutoBid: boolean) => {
    if (!currentUser || !selectedListingId) return;
    try {
      if (isAutoBid) {
        await api.configureAutoBid(selectedListingId, amount);
        toast.success(`Automatic Proxy Bidding successfully armed up to Max Ceiling of NPR ${amount.toLocaleString()}`);
      } else {
        const updated = await api.placeBid(selectedListingId, amount);
        setSelectedListingDetail(updated);
        toast.success(`Congratulations! Your manual bid of NPR ${amount.toLocaleString()} was successfully placed.`);
      }
      loadCoreData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Buy now instant checkout (Skip Bidding Queue)
  const handleBuyNow = async () => {
    if (!currentUser || !selectedListingId) return;
    try {
      const txn = await api.buyNow(selectedListingId);
      // Directly route to the secure manual payment settlement page!
      navigate(`/payment?transactionId=${txn.id}`);
      loadCoreData();
    } catch (err: any) {
      alert('Failed to skip bidding queue: ' + err.message);
    }
  };

  // Report item
  const handleReportListing = async (reason: string) => {
    if (!currentUser || !selectedListingId || !selectedListingDetail) return;
    try {
      await api.submitReport({
        listingId: selectedListingId,
        listingTitle: selectedListingDetail.title,
        reason,
      });
      toast.success('Listing reported successfully. BidHive security admins will review the item immediately.');
      loadCoreData();
    } catch (err: any) {
      alert('Failed to submit report: ' + err.message);
    }
  };

  // Settle Escrow payments
  const handlePaymentSuccess = async (transactionId: string, method: PaymentMethod) => {
    if (!activePaymentTransaction) return;
    try {
      await api.settlePayment(transactionId, method);
      toast.success(`Transaction successfully settled! NPR payment routed securely via ${method}. Seller is preparing shipment.`);
      setActivePaymentTransaction(null);
      loadCoreData();
    } catch (err: any) {
      alert('Failed to route payment: ' + err.message);
    }
  };

  // Submit reviews
  const handleOpenReview = (txn: Transaction) => {
    setReviewTransaction(txn);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTransaction || !currentUser) return;

    try {
      await api.submitReview({
        transactionId: reviewTransaction.id,
        revieweeId: reviewTransaction.buyerId === currentUser.id ? reviewTransaction.sellerId : reviewTransaction.buyerId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Rating & peer review submitted successfully. Thank you for securing trust in Nepal auctions.');
      setReviewTransaction(null);
      loadCoreData();
    } catch (err: any) {
      alert('Failed to submit review: ' + err.message);
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationsRead();
      loadCoreData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- ADMIN ACTIONS ---
  const handleApproveListing = async (listingId: string) => {
    try {
      await api.updateListingStatus(listingId, 'ACTIVE');
      toast.success('Listing approved successfully and is now active for bidding!');
      loadCoreData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    try {
      await api.updateListingStatus(listingId, 'CANCELLED');
      toast.success('Listing has been rejected and cancelled.');
      loadCoreData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'RESOLVE' | 'DISMISS') => {
    try {
      const status = action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED';
      await api.resolveReport(reportId, status, 'Resolved by Administrator via system console.');
      toast.success(`Report marked as ${status}.`);
      loadCoreData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleUserBan = async (userId: string) => {
    const userToToggle = usersList.find((u) => u.id === userId);
    if (!userToToggle) return;
    try {
      await api.updateUserAction(userId, { isBanned: !userToToggle.isBanned });
      alert(`User is now ${!userToToggle.isBanned ? 'banned' : 'unbanned'}.`);
      loadCoreData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      toast.success('User account permanently deleted.');
      await loadCoreData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user.');
    }
  };

  const initiateDeleteListing = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId) || selectedListingDetail;
    if (listing) {
      setListingToDelete(listing);
    } else {
      toast.error('Listing not found');
    }
  };

  const performDeleteListing = async (reason: string, confirmationText: string) => {
    if (!listingToDelete) return;
    try {
      await api.deleteListing(listingToDelete.id, reason, confirmationText);
      toast.success('Listing permanently deleted.');
      if (view === 'DETAIL' && selectedListingDetail?.id === listingToDelete.id) {
        navigate('/');
      }
      setListingToDelete(null);
      await loadCoreData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete listing.');
      throw err;
    }
  };

  // --- SUPER ADMIN DEDICATED LOGIN HANDLER ---
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminError(null);

    if (superAdminEmail !== 'aditya.shh15@gmail.com') {
      setSuperAdminError('FORBIDDEN: Only the designated Owner account is authorized to access the BidHive Admin console.');
      return;
    }

    try {
      const profile = await api.login({ email: superAdminEmail, password: superAdminPassword });
      setCurrentUser(profile);
      navigate('/bidhive-admin');
    } catch (err: any) {
      setSuperAdminError(err.message || 'Credentials authentication failed. Please verify owner passcode keys.');
    }
  };

  // --- FILTERING & SORTING LOGIC ---
  const filteredListings = listings.filter((l) => {
    const categoryMatch = selectedCategoryId === 'ALL' || l.categoryId === selectedCategoryId;
    const conditionMatch = selectedCondition === 'ALL' || l.condition === selectedCondition;
    const searchMatch = !searchQuery || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.description.toLowerCase().includes(searchQuery.toLowerCase());

    return categoryMatch && conditionMatch && searchMatch;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'ENDING_SOON') {
      return +new Date(a.endTime) - +new Date(b.endTime);
    }
    if (sortBy === 'JUST_LISTED') {
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    }
    if (sortBy === 'PRICE_LOW') {
      return a.currentPrice - b.currentPrice;
    }
    if (sortBy === 'PRICE_HIGH') {
      return b.currentPrice - a.currentPrice;
    }
    if (sortBy === 'MOST_VIEWS') {
      return b.viewCount - a.viewCount;
    }
    return 0;
  });

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading BidHive Platform Database...</p>
        </div>
      </div>
    );
  }

  // Render login screen if the view is set to LOGIN
  if (view === 'LOGIN') {
    return (
      <Login
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          navigate('/');
        }}
      />
    );
  }

  // SECURE PATH EXCLUSIVITY GUARDS
  const isSuperAdmin = currentUser?.email === 'aditya.shh15@gmail.com';

  return (
    <div id="applet-viewport" className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      <NotificationListener userId={currentUser?.id || null} />
      
      {/* Top Banner Hub Info */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 text-[11px] px-4 py-2 flex flex-wrap items-center justify-end gap-4 z-50">
        
        {/* Super Admin Status Line */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-red-400 font-medium">
            <Shield className="w-3.5 h-3.5" /> Super Admin Active
          </div>
        )}

        {/* Dynamic Interactive Role Switcher */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <span className="font-medium hidden sm:inline">Act as:</span>
            <div className="relative">
              <button
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-[11px] border cursor-pointer transition-colors bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              >
                {currentUser.role === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                {currentUser.role === 'SELLER' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                {currentUser.role === 'BIDDER' && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{currentUser.role}</span>
              </button>

              {showRoleSelector && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-700/50">
                  <button
                    onClick={() => handleSwitchRole('BIDDER')}
                    className="w-full px-4 py-2 text-left font-medium text-emerald-400 hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>Bidder</span>
                  </button>
                  <button
                    onClick={() => handleSwitchRole('SELLER')}
                    className="w-full px-4 py-2 text-left font-medium text-amber-400 hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>Seller</span>
                  </button>
                  <button
                    onClick={() => handleSwitchRole('ADMIN')}
                    className="w-full px-4 py-2 text-left font-medium text-purple-400 hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>Admin</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CLEAN NAVBAR */}
      <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div
            onClick={() => { navigate('/'); }}
            className="cursor-pointer flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            <BidHiveLogo variant="compact" size="md" />
          </div>

          {/* Search bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, categories or locations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F7F5] border border-[#E5E7EB] rounded-lg pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-[#D99000] text-[#18181B]"
            />
          </div>

          {/* Navigation Controls (Desktop) */}
          <nav className="hidden lg:flex items-center gap-2">
            
            <button
              onClick={() => { navigate('/'); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                view === 'BROWSE' || view === 'DETAIL'
                  ? 'text-[#18181B] bg-gray-100 font-bold'
                  : 'text-[#6B7280] hover:text-[#18181B] hover:bg-gray-50'
              }`}
            >
              Browse Auctions
            </button>

            {/* Create Listing */}
            <button
              onClick={() => {
                if (!currentUser) {
                  navigate('/login');
                } else {
                  navigate('/create');
                }
              }}
              className="px-3.5 py-2 bg-[#D99000] hover:bg-[#B87500] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Sell an Item</span>
            </button>

            {/* User Dashboard */}
            <button
              onClick={() => {
                if (!currentUser) {
                  navigate('/login');
                } else {
                  navigate('/dashboard');
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                view === 'DASHBOARD'
                  ? 'bg-gray-900 text-white font-bold'
                  : 'text-[#6B7280] hover:text-[#18181B] hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            {/* BidHive Admin Access Link */}
            {(currentUser?.role === 'ADMIN' || isSuperAdmin) && (
              <button
                onClick={() => navigate('/bidhive-admin')}
                className={`px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  view === 'SUPER_ADMIN_PANEL' || view === 'ADMIN' ? 'ring-2 ring-[#D99000]' : ''
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            {currentUser ? (
              <>
                {/* Wallet Balance */}
                <button
                  onClick={() => navigate('/wallet')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    view === 'WALLET'
                      ? 'bg-amber-50 text-[#D99000] border border-amber-200'
                      : 'text-[#18181B] hover:bg-gray-50 border border-[#E5E7EB]'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 text-[#D99000]" />
                  <span>Wallet: Rs. {walletInfo?.availableBalance?.toLocaleString('en-IN') || '0'}</span>
                </button>
                
                {/* Notification Bell */}
                <div className="pl-1 border-l border-[#E5E7EB]">
                  <NotificationCenter
                    notifications={notifications}
                    onMarkAllRead={handleMarkNotificationsRead}
                    onMarkRead={handleMarkNotificationRead}
                    onSelectNotification={handleSelectNotification}
                  />
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#6B7280] hover:text-red-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Profile Avatar */}
                <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#E5E7EB]"
                  />
                  <span className="text-xs font-semibold text-[#18181B] truncate max-w-[80px]">{currentUser.name}</span>
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="ml-2 px-3.5 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-[#18181B] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Sign In / Register</span>
              </button>
            )}

          </nav>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-[#18181B]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* MOBILE SLIDE-OUT MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[#E5E7EB] p-4 space-y-3 shadow-md">
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#18181B] hover:bg-gray-50 block"
            >
              Browse Auctions
            </button>
            <button
              onClick={() => {
                if (!currentUser) { navigate('/login'); } else { navigate('/create'); }
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-[#D99000] hover:bg-amber-50 block"
            >
              Sell an Item
            </button>
            <button
              onClick={() => {
                if (!currentUser) { navigate('/login'); } else { navigate('/dashboard'); }
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#18181B] hover:bg-gray-50 block"
            >
              User Dashboard
            </button>
            {currentUser && (
              <button
                onClick={() => { navigate('/wallet'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#18181B] bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#D99000]" />
                  <span>My Wallet</span>
                </div>
                <span className="font-bold text-[#18181B]">Rs. {walletInfo?.availableBalance?.toLocaleString('en-IN') || '0'}</span>
              </button>
            )}
            {(currentUser?.role === 'ADMIN' || isSuperAdmin) && (
              <button
                onClick={() => { navigate('/bidhive-admin'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold block"
              >
                BidHive Admin Panel
              </button>
            )}
            
            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-2">
                    <img src={currentUser.avatar} className="w-7 h-7 rounded-full border object-cover" />
                    <span className="text-xs font-semibold text-[#18181B]">{currentUser.name}</span>
                  </div>
                  <button onClick={handleLogout} className="text-xs text-red-700 font-semibold px-3 py-1 bg-red-50 rounded">
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  className="w-full bg-[#D99000] text-white text-center py-2 rounded-lg text-xs font-bold"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN LAYOUT CORES */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
<Suspense fallback={<div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D99000]" /></div>}>
        
        {/* VIEW: BROWSE LISTINGS FEED */}
        {view === 'BROWSE' && (
          <div className="space-y-6">
            
            {/* Practical Introduction Section */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="max-w-2xl space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
                  Buy and bid on second-hand products
                </h1>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Browse active auctions or list an item for sale across Nepal.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('auctions-grid');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Browse auctions
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUser) navigate('/login');
                      else navigate('/create');
                    }}
                    className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#18181B] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Sell an item
                  </button>
                </div>
              </div>

              {/* Search bar inside intro section */}
              <div className="relative max-w-xl pt-1">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products, categories or locations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F7F7F5] border border-[#E5E7EB] rounded-lg pl-10 pr-3 py-2 text-xs font-medium text-[#18181B] focus:outline-none focus:border-[#D99000] focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Category Selector */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Categories</h3>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer ${
                    selectedCategoryId === 'ALL'
                      ? 'bg-[#18181B] text-white'
                      : 'bg-white text-[#18181B] hover:bg-gray-100 border border-[#E5E7EB]'
                  }`}
                >
                  All ({listings.filter((l) => l.status === 'ACTIVE' || l.status === 'SOLD').length})
                </button>
                {categories.map((cat) => {
                  const count = listings.filter((l) => l.categoryId === cat.id && (l.status === 'ACTIVE' || l.status === 'SOLD')).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer ${
                        selectedCategoryId === cat.id
                          ? 'bg-[#D99000] text-white'
                          : 'bg-white text-[#18181B] hover:bg-gray-100 border border-[#E5E7EB]'
                      }`}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      <span>{cat.name} ({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[#6B7280] flex items-center gap-1 uppercase">
                  <Filter className="w-3.5 h-3.5" /> Condition:
                </span>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="bg-[#F7F7F5] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#18181B] px-3 py-1.5 focus:outline-none focus:border-[#D99000]"
                >
                  <option value="ALL">All Conditions</option>
                  <option value="NEW">New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good Condition</option>
                  <option value="FAIR">Fair / Used</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#6B7280] uppercase">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#F7F7F5] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#18181B] px-3 py-1.5 focus:outline-none focus:border-[#D99000]"
                >
                  <option value="ENDING_SOON">Ending Soon</option>
                  <option value="JUST_LISTED">Just Listed</option>
                  <option value="PRICE_LOW">Price: Low to High</option>
                  <option value="PRICE_HIGH">Price: High to Low</option>
                  <option value="MOST_VIEWS">Most Viewed</option>
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            <div id="auctions-grid">
              {sortedListings.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-lg py-12 text-center space-y-2 max-w-xl mx-auto">
                  <Gavel className="w-10 h-10 text-[#6B7280] mx-auto" />
                  <h4 className="font-bold text-[#18181B] text-sm">No Active Auctions Found</h4>
                  <p className="text-xs text-[#6B7280] px-6">
                    Try adjusting your search terms or filter selections.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {sortedListings.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      category={categories.find(c => c.id === item.categoryId)}
                    onSelect={(id) => { navigate(`/listing/${id}`); }}
                    onExpire={loadCoreData}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        {/* VIEW: DETAIL SCREEN */}
        {view === 'DETAIL' && selectedListingId && selectedListingDetail && (
          <ListingDetail
            listing={selectedListingDetail}
            bids={selectedListingDetail.bids || []}
            currentUser={currentUser}
            walletInfo={walletInfo}
            category={categories.find(c => c.id === selectedListingDetail.categoryId)}
            sellerRating={{ rating: 4.8, count: 12 }}
            onPlaceBid={handlePlaceBid}
            onBuyNow={handleBuyNow}
            onReportListing={handleReportListing}
            onDeleteListing={(currentUser?.role === 'ADMIN' || isSuperAdmin || currentUser?.id === selectedListingDetail.sellerId) ? initiateDeleteListing : undefined}
            onGoBack={() => { navigate('/'); }}
            onAuthRequired={() => { navigate('/login'); }}
            onNavigateToWallet={() => { navigate('/wallet'); }}
          />
        )}

        {/* VIEW: CREATE LISTING */}
        {view === 'CREATE' && (
          <CreateListingForm
            categories={categories}
            onSubmit={handleCreateListing}
            onCancel={() => navigate('/')}
          />
        )}

        {/* VIEW: DASHBOARD TAB */}
        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">User Dashboard Console</h2>
                  <p className="text-xs text-slate-400 font-semibold">Track your active bids, listings, and checkout ledger statements.</p>
                </div>
              </div>

              {/* Sub tabs switcher */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'PURCHASES', label: 'Purchases 🛍️' },
                  { id: 'LISTINGS', label: 'Listings 📦' },
                  { id: 'BIDDING', label: 'Bidding Activity 🔨' },
                  { id: 'PAYMENTS', label: 'Payments 💳' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDashboardTab(t.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      dashboardTab === t.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PURCHASES SUB-TAB */}
            {dashboardTab === 'PURCHASES' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Purchased Items Ledger</h3>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Direct record of items you have won in auctions or purchased via "Buy Now".
                </p>

                {transactions.filter(t => t.buyerId === currentUser?.id).length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400 font-bold">No purchased items found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3">Order ID & Date</th>
                          <th className="p-3">Item Details</th>
                          <th className="p-3">Seller</th>
                          <th className="p-3 text-right">Amount Paid</th>
                          <th className="p-3 text-center">Payment Status</th>
                          <th className="p-3 text-right">Settlement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {transactions
                          .filter(t => t.buyerId === currentUser?.id)
                          .map((txn) => {
                            const isPaid = txn.paymentStatus === 'PAID';
                            return (
                              <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono text-[10px] text-slate-400">
                                  BH-{txn.id}
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-slate-900 block">{txn.listingTitle}</span>
                                </td>
                                <td className="p-3 text-slate-600">{txn.sellerName}</td>
                                <td className="p-3 text-right font-bold text-slate-900">{formatNPR(txn.finalAmount)}</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    isPaid 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : txn.paymentStatus === 'VERIFYING'
                                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse'
                                      : 'bg-red-50 border-red-200 text-red-700'
                                  }`}>
                                    {txn.paymentStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {!isPaid && txn.paymentStatus !== 'VERIFYING' ? (
                                    <button
                                      onClick={() => { navigate(`/payment?transactionId=${txn.id}`); }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all shadow-xs"
                                    >
                                      Pay Now
                                    </button>
                                  ) : isPaid ? (
                                    <span className="text-[10px] text-slate-400 font-bold italic">Settled</span>
                                  ) : (
                                    <span className="text-[10px] text-yellow-600 font-bold animate-pulse">Verifying...</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* LISTINGS SUB-TAB */}
            {dashboardTab === 'LISTINGS' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">My Listed Items</h3>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Auctions you have created and listed on the platform.
                </p>

                {listings.filter(l => l.sellerId === currentUser?.id).length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400 font-bold">No listed items found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3">Item Title</th>
                          <th className="p-3 text-center">Listing Status</th>
                          <th className="p-3 text-center">Auction Status</th>
                          <th className="p-3 text-right">Current Highest Bid</th>
                          <th className="p-3">Winning Bidder</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {listings
                          .filter(l => l.sellerId === currentUser?.id)
                          .map((item) => {
                            const isEnded = item.status === 'ENDED' || item.status === 'SOLD';
                            const associatedTxn = transactions.find(t => t.listingId === item.id);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <span className="font-bold text-slate-900 block">{item.title}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    item.status === 'ACTIVE' 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : 'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="text-[11px] font-bold text-slate-600">
                                    {isEnded ? 'Ended' : 'Ongoing'}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  {formatNPR(item.currentPrice)}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {isEnded ? (
                                    associatedTxn ? (
                                      <span className="font-extrabold text-slate-800">{associatedTxn.buyerName}</span>
                                    ) : (
                                      <span className="text-slate-400 font-semibold italic">No bids/No winner</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 italic">TBD (Auction Live)</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex justify-end gap-1.5 items-center">
                                    <button
                                      onClick={() => { navigate(`/listing/${item.id}`); }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      View Listing
                                    </button>
                                    <button
                                      onClick={() => initiateDeleteListing(item.id)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 hover:border-rose-600 active:scale-95 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-150 flex items-center gap-1 shadow-2xs"
                                      title="Delete Item from Database"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* BIDDING ACTIVITY SUB-TAB */}
            {dashboardTab === 'BIDDING' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Bidding Activity & Ledger</h3>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Real-time tracking of auctions you have participated in and placed live bids on.
                </p>

                {(() => {
                  const uniqueListingIds = Array.from(new Set(userBids.map(b => b.listingId)));
                  const userParticipatedListings = listings.filter(l => uniqueListingIds.includes(l.id));

                  if (userParticipatedListings.length === 0) {
                    return <p className="text-center py-12 text-xs text-slate-400 font-bold">No active bidding activity found.</p>;
                  }

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                            <th className="p-3">Auction Item</th>
                            <th className="p-3 text-center">Your High Bid</th>
                            <th className="p-3 text-center">Current Highest Bid</th>
                            <th className="p-3 text-center">Bidding Status</th>
                            <th className="p-3 text-center">Auction Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {userParticipatedListings.map((item) => {
                            const itemBids = userBids.filter(b => b.listingId === item.id);
                            const userMaxBid = Math.max(...itemBids.map(b => b.amount));
                            const isHighest = userMaxBid >= item.currentPrice;
                            const isEnded = item.status === 'ENDED' || item.status === 'SOLD';
                            const associatedTxn = transactions.find(t => t.listingId === item.id);
                            const hasWon = isEnded && associatedTxn && associatedTxn.buyerId === currentUser?.id;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <span className="font-bold text-slate-900 block">{item.title}</span>
                                </td>
                                <td className="p-3 text-center font-bold text-slate-900">
                                  {formatNPR(userMaxBid)}
                                </td>
                                <td className="p-3 text-center font-bold text-indigo-600">
                                  {formatNPR(item.currentPrice)}
                                </td>
                                <td className="p-3 text-center">
                                  {isEnded ? (
                                    hasWon ? (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        Won 🎉
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 border border-red-200 text-red-700">
                                        Lost ⚠️
                                      </span>
                                    )
                                  ) : isHighest ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600 animate-pulse">
                                      Winning 🔥
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">
                                      Outbid ⚠️
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="font-bold text-slate-500">
                                    {isEnded ? 'Ended' : 'Active'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => { navigate(`/listing/${item.id}`); }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Bid Console
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* PAYMENTS SUB-TAB */}
            {dashboardTab === 'PAYMENTS' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Payment Proofs & Verifications</h3>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Track your manual screenshot submissions, verification state, and admin approval logs.
                </p>

                {transactions.filter(t => t.buyerId === currentUser?.id).length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400 font-bold">No payments found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3">Purchased Item</th>
                          <th className="p-3">Payment Method</th>
                          <th className="p-3">Payment Date / Status</th>
                          <th className="p-3 text-center">Uploaded Proof</th>
                          <th className="p-3 text-center">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {transactions
                          .filter(t => t.buyerId === currentUser?.id)
                          .map((txn) => {
                            const hasScreenshot = !!txn.paymentScreenshot;
                            const isPaid = txn.paymentStatus === 'PAID';

                            return (
                              <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <span className="font-bold text-slate-900 block">{txn.listingTitle}</span>
                                  <span className="text-[10px] font-mono text-slate-400">Amt: {formatNPR(txn.finalAmount)}</span>
                                </td>
                                <td className="p-3">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                                    {txn.paymentMethod || 'QR_CODE'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="space-y-0.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      isPaid 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                        : txn.paymentStatus === 'VERIFYING'
                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse'
                                        : 'bg-red-50 border-red-200 text-red-700'
                                    }`}>
                                      {txn.paymentStatus}
                                    </span>
                                    {txn.completedAt && (
                                      <span className="block text-[10px] text-slate-400 mt-0.5">
                                        {new Date(txn.completedAt).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  {hasScreenshot ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <img 
                                        src={txn.paymentScreenshot || ''} 
                                        alt="Proof Receipt" 
                                        className="w-12 h-12 object-cover rounded-md border border-slate-200 shadow-xs hover:scale-105 transition-all cursor-zoom-in"
                                        onClick={() => {
                                          if (txn.paymentScreenshot) {
                                            window.open(txn.paymentScreenshot, '_blank');
                                          }
                                        }}
                                      />
                                      <span className="text-[9px] text-slate-400 font-bold">Click to view</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No screenshot uploaded yet</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    isPaid 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : txn.paymentStatus === 'VERIFYING'
                                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                    {isPaid ? 'Approved / Verified' : txn.paymentStatus === 'VERIFYING' ? 'Awaiting Admin Approval' : 'Unverified'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: DEDICATED MANUAL PAYMENT SETTLEMENT PAGE */}
        {view === 'PAYMENT' && (
          <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>}><PaymentPage
            transactionId={new URLSearchParams(window.location.search).get('transactionId') || new URLSearchParams(window.location.search).get('id')}
            onBack={() => navigate('/dashboard')}
          /></Suspense>
        )}

        {/* VIEW: DEDICATED SUPER ADMIN LOGIN PAGE */}
        {view === 'SUPER_ADMIN_LOGIN' && (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
            <div className="bg-slate-950 p-6 text-center space-y-2">
              <BidHiveLogo variant="compact" size="lg" />
              <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">Super Owner Settle Console</h3>
              <p className="text-[10px] text-red-500 font-black tracking-wide uppercase">Strictly Confidential - Restricted Entrance</p>
            </div>

            <form onSubmit={handleSuperAdminLogin} className="p-8 space-y-5">
              {superAdminError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 leading-relaxed text-center">
                  {superAdminError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Super Owner Email</label>
                <input
                  required
                  type="email"
                  value={superAdminEmail}
                  onChange={(e) => setSuperAdminEmail(e.target.value)}
                  placeholder="aditya.shh15@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Confidential Key Passcode</label>
                <input
                  required
                  type="password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs py-3 rounded-xl tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                Authenticate & Boot Panel
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-[10px] font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-wide cursor-pointer"
                >
                  Return to Nepal Marketplace
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW: DEDICATED SUPER ADMIN CONTROL PANEL */}
        {view === 'SUPER_ADMIN_PANEL' && (
          <div className="space-y-6">
            {!isSuperAdmin && currentUser?.role !== 'ADMIN' ? (
              <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 space-y-6 text-center">
                <ShieldAlert className="w-12 h-12 text-red-600 mx-auto animate-bounce" />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">403: Security Access Denied</h2>
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-sm mx-auto">
                  This console is restricted to the Super Owner <span className="font-extrabold text-red-600">aditya.shh15@gmail.com</span>. Normal users or regular moderators do not possess the digital signatures to unlock this ledger.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => navigate('/bidhive-admin/login')}
                    className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    Authenticate as Owner
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border rounded-xl font-bold text-xs px-5 py-2.5 cursor-pointer transition-all"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Database Access Credentials card on Super Admin console */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 text-slate-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 text-white">
                    <Database className="w-48 h-48" />
                  </div>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-red-500" />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">PostgreSQL Cloud Storage</h3>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
                      Your database is provisioned and securely hosted in Cloud SQL (PostgreSQL). Every single bid amount, proxy auto-bidding setup, verification status, and chat log is safely persisted inside the database.
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-400">
                      <span>• ORM: <strong>Drizzle ORM</strong></span>
                      <span>• Database Engine: <strong>PostgreSQL</strong></span>
                      <span>• Migration System: <strong>Drizzle Kit</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 relative z-10 flex flex-col gap-2">
                    <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl text-left">
                      <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-extrabold">Active Connection</span>
                      <span className="block font-mono text-[10px] text-red-400 font-bold">drizzle-client@postgresql-live</span>
                    </div>
                  </div>
                </div>

                <AdminPanel
                  listings={listings}
                  users={usersList}
                  reports={reportsList}
                  transactions={transactions}
                  commissionRate={commissionRate}
                  onSetCommissionRate={(rate) => {
                    setCommissionRate(rate);
                  }}
                  onApproveListing={handleApproveListing}
                  onRejectListing={handleRejectListing}
                  onResolveReport={handleResolveReport}
                  onToggleUserBan={handleToggleUserBan}
                  onDeleteListing={initiateDeleteListing}
                  onDeleteUser={handleDeleteUser}
                  onRefreshAllData={loadCoreData}
                />
              </div>
            )}
          </div>
        )}

        {view === 'WALLET' && (
          <div className="pt-4">
            <WalletPage currentUser={currentUser} />
          </div>
        )}

      </Suspense>
    </main>
        
        {/* FOOTER */}
      <footer className="mt-12 bg-white border-t border-[#E5E7EB] text-[#6B7280] py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="font-bold text-[#18181B] text-sm block">
              Bid<span className="text-[#D99000]">Hive</span> Nepal
            </span>
            <p className="max-w-sm text-[#6B7280]">
              Second-hand auction marketplace. Built as a university final-year project demonstration.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 font-semibold justify-center text-xs">
            <button onClick={() => setShowRulesModal(true)} className="hover:text-[#18181B] cursor-pointer">Auction Rules</button>
            <button onClick={() => navigate('/')} className="hover:text-[#18181B] cursor-pointer">Browse Listings</button>
            <a href="mailto:support@bidhive.com.np" className="hover:text-[#18181B]">Support</a>
          </div>

          <div className="text-center md:text-right font-medium">
            <span className="block text-[#6B7280]">© 2026 BidHive Nepal</span>
          </div>
        </div>
      </footer>

      {/* MODAL: CHECKOUT GATEWAY INTERFACES */}
      {activePaymentTransaction && (
        <PaymentModal
          transaction={activePaymentTransaction}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setActivePaymentTransaction(null)}
        />
      )}

      {/* MODAL: FORCE DELETE LISTING */}
      {listingToDelete && (
        <DeleteListingModal
          listing={listingToDelete}
          bidsCount={userBids.filter(b => b.listingId === listingToDelete.id).length} // This might just be an estimate depending on loaded bids, but works for UI
          isOpen={true}
          onClose={() => setListingToDelete(null)}
          onConfirm={performDeleteListing}
        />
      )}

      {/* MODAL: RULES & REGULATIONS */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowRulesModal(false)}
          ></div>
          
          {/* Content Card */}
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Nepal themed red/blue accent border at top */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-red-600 to-blue-600"></div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-red-500" />
                    <h3 className="font-display font-black text-white text-lg tracking-tight uppercase">Platform Rules & Regulations</h3>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required Guidelines for All BidHive Nepal Users</p>
                </div>
                <button 
                  onClick={() => setShowRulesModal(false)}
                  className="p-1.5 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-slate-300 leading-relaxed scrollbar-thin">
                
                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">1</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Integrity & Authenticity</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">All second-hand listings, descriptions, cosmetic ratings, and images must be entirely authentic and accurate. Deliberately misrepresenting items is strictly prohibited.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">2</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Bid Binding Commitment</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">Placing an auction bid is a binding commitment. If you emerge as the highest bidder and win, you are ethically and legally obligated to complete the payment within 48 hours.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">3</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Secure Payment Settlements</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">All winning bids or Buy Now settlements must be securely cleared through our integrated digital verification gateways (eSewa / Khalti upload). Handing over items before administrator verification is highly discouraged.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">4</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Prompt Asset Handoff</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">Once a transaction is verified and marked as PAID by the administration, the seller must dispatch or arrange the pickup of the item within 3 business days.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">5</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Community Safety Guidelines</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">When coordinating local meetups for item verification, always choose highly crowded, public spaces in Nepal (e.g., shopping malls, coffee houses, or transit hubs) during daylight hours. Never meet in isolated locations.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 text-red-400 font-extrabold flex items-center justify-center text-[10px] shrink-0">6</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wide">Penalties & Rating Blacklisting</h4>
                    <p className="text-slate-400 font-semibold text-[11px]">Accounts caught performing shill bidding, uploading fake or altered payment receipts, or repeatedly backing out of won bids will be permanently banned. The system automatically restricts high-risk profiles.</p>
                  </div>
                </div>

                {/* QR Code Section inside Action Rules */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <QrCode className="w-4 h-4" />
                    <span>Official Escrow Payment QR Code</span>
                  </div>
                  <div className="inline-block p-2 bg-white rounded-xl border border-slate-700">
                    <img 
                      src="/qr-code.png" 
                      alt="Official Payment QR Code" 
                      className="w-36 h-36 object-contain rounded"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    (Editable manually via <code className="text-amber-300 font-mono">/public/qr-code.png</code> in the code repository)
                  </p>
                </div>

              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-6 h-11 bg-red-600 hover:bg-red-700 text-white border border-red-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  I Understand & Agree
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
