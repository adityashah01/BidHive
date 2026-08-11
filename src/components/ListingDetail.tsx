import React, { useState, useEffect } from 'react';
import { Listing, Bid, User, Category, ListingFollow } from '../types';
import { ChevronLeft, Hammer, Trash2, Calendar, Wallet, AlertCircle, MapPin, CheckCircle, Clock, ShieldAlert, Bell, BellRing, Settings, Mail, TrendingUp } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import LeafletMap from './LeafletMap';
import { api } from '../lib/api';

interface ListingDetailProps {
  listing: Listing;
  bids: Bid[];
  currentUser: User | null;
  walletInfo?: any;
  category?: Category;
  sellerRating: { rating: number; count: number };
  onPlaceBid: (amount: number, isAutoBid: boolean) => void;
  onBuyNow: () => void;
  onReportListing: (reason: string) => void;
  onDeleteListing?: (listingId: string) => void;
  onGoBack: () => void;
  onAuthRequired?: () => void;
  onNavigateToWallet?: () => void;
}

export default function ListingDetail({
  listing,
  bids,
  currentUser,
  walletInfo,
  category,
  sellerRating,
  onPlaceBid,
  onBuyNow,
  onReportListing,
  onDeleteListing,
  onGoBack,
  onAuthRequired,
  onNavigateToWallet
}: ListingDetailProps) {
  const [activeImage, setActiveImage] = useState(listing.images[0] || '');
  const [customBid, setCustomBid] = useState('');
  const [proxyBidMax, setProxyBidMax] = useState('');
  const [isAutoBidActive, setIsAutoBidActive] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Item Follow & Notification Alert State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followData, setFollowData] = useState<ListingFollow | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [targetThresholdInput, setTargetThresholdInput] = useState('');
  const [notifyOnOutbid, setNotifyOnOutbid] = useState(true);
  const [notifyOnPriceThreshold, setNotifyOnPriceThreshold] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [savingFollow, setSavingFollow] = useState(false);

  useEffect(() => {
    if (!currentUser || !listing?.id) {
      setIsFollowing(false);
      setFollowData(null);
      return;
    }
    let isMounted = true;
    api.getListingFollow(listing.id)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setIsFollowing(true);
          setFollowData(data);
          setTargetThresholdInput(data.targetPriceThreshold ? String(data.targetPriceThreshold) : '');
          setNotifyOnOutbid(data.notifyOnOutbid ?? true);
          setNotifyOnPriceThreshold(data.notifyOnPriceThreshold ?? true);
          setNotifyInApp(data.notifyInApp ?? true);
          setNotifyEmail(data.notifyEmail ?? true);
        } else {
          setIsFollowing(false);
          setFollowData(null);
        }
      })
      .catch((err) => {
        console.warn('Follow fetch status:', err?.message || err);
      });

    return () => { isMounted = false; };
  }, [listing.id, currentUser]);

  const handleSaveFollow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setSavingFollow(true);

    try {
      const parsedThresh = targetThresholdInput ? parseFloat(targetThresholdInput) : null;
      const res = await api.setListingFollow(listing.id, {
        targetPriceThreshold: parsedThresh,
        notifyOnOutbid,
        notifyOnPriceThreshold,
        notifyInApp,
        notifyEmail,
      });

      setIsFollowing(true);
      setFollowData(res);
      setShowFollowModal(false);
      setSuccessMsg(`Now following "${listing.title}". Alert settings updated!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update follow settings.');
    } finally {
      setSavingFollow(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser) return;
    setSavingFollow(true);
    try {
      await api.unfollowListing(listing.id);
      setIsFollowing(false);
      setFollowData(null);
      setShowFollowModal(false);
      setSuccessMsg(`Unfollowed "${listing.title}". Notifications disabled.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unfollow listing.');
    } finally {
      setSavingFollow(false);
    }
  };

  const availableBal = walletInfo?.availableBalance ?? 0;
  const userPrevBid = bids.find(b => b.bidderId === currentUser?.id)?.amount || 0;
  const isSameHighestBidder = bids.length > 0 && bids[0].bidderId === currentUser?.id;
  const enteredManualVal = parseFloat(customBid) || 0;
  const enteredProxyVal = parseFloat(proxyBidMax) || 0;
  const activeEnteredVal = isAutoBidActive ? enteredProxyVal : enteredManualVal;
  const requiredHoldAmount = (isSameHighestBidder && userPrevBid > 0)
    ? Math.max(0, activeEnteredVal - userPrevBid)
    : activeEnteredVal;
  const isInsufficientWalletBalance = activeEnteredVal > 0 && requiredHoldAmount > availableBal;

  // Format NPR helper
  const formatNPR = (amount: number) => {
    return `Rs. ${(amount || 0).toLocaleString('en-IN')}`;
  };

  const getMinIncrement = (currentPrice: number) => {
    if (currentPrice < 500) return 10;
    if (currentPrice < 5000) return 50;
    return 100;
  };

  const minIncrement = getMinIncrement(listing.currentPrice);
  const minRequiredBid = listing.currentPrice + minIncrement;

  const handleManualBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    if (listing.sellerId === currentUser.id) {
      setErrorMsg('You cannot bid on your own listing.');
      return;
    }

    const bidVal = parseFloat(customBid);
    if (isNaN(bidVal)) {
      setErrorMsg('Please enter a valid bid amount.');
      return;
    }

    if (bidVal < minRequiredBid) {
      setErrorMsg(`Bid must be at least ${formatNPR(minRequiredBid)} (Current Price + ${formatNPR(minIncrement)} increment)`);
      return;
    }

    onPlaceBid(bidVal, false);
    setCustomBid('');
    setSuccessMsg('Bid submitted successfully.');
  };

  const handleProxyBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    if (listing.sellerId === currentUser.id) {
      setErrorMsg('You cannot auto-bid on your own listing.');
      return;
    }

    const maxVal = parseFloat(proxyBidMax);
    if (isNaN(maxVal)) {
      setErrorMsg('Please enter a valid max amount.');
      return;
    }

    if (maxVal <= minRequiredBid) {
      setErrorMsg(`Max auto-bid limit must be strictly greater than ${formatNPR(minRequiredBid)}`);
      return;
    }

    onPlaceBid(maxVal, true);
    setProxyBidMax('');
    setSuccessMsg(`Auto-bid set up to maximum ${formatNPR(maxVal)}.`);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    if (!reportReason.trim()) return;
    onReportListing(reportReason);
    setReportReason('');
    setShowReportForm(false);
    setSuccessMsg('Report submitted for review.');
  };

  const conditionLabels: Record<string, string> = {
    NEW: 'New (Seal Packed)',
    LIKE_NEW: 'Like New',
    GOOD: 'Good Condition',
    FAIR: 'Fair/Used',
    POOR: 'Poor/Salvage'
  };

  const isSeller = currentUser ? listing.sellerId === currentUser.id : false;
  const isActive = listing.status === 'ACTIVE';
  const isSold = listing.status === 'SOLD';
  const isEnded = listing.status === 'ENDED';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          id="btn-back-to-listings"
          onClick={onGoBack}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#18181B] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Listings
        </button>

        {onDeleteListing && (
          <button
            id={`btn-admin-delete-${listing.id}`}
            onClick={() => onDeleteListing(listing.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Listing
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Gallery */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 overflow-hidden aspect-[4/3]">
            <img
              src={activeImage || listing.images[0]}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded"
            />
          </div>

          {listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-16 h-16 border rounded overflow-hidden shrink-0 ${
                    activeImage === imgUrl ? 'border-[#D99000] ring-1 ring-[#D99000]' : 'border-[#E5E7EB]'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Bidding Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#F7F7F5] border border-[#E5E7EB] text-[#18181B] px-2 py-0.5 rounded text-[11px] font-semibold">
                  {conditionLabels[listing.condition] || listing.condition}
                </span>
                {category && (
                  <span className="text-xs text-[#6B7280] font-medium">
                    {category.name}
                  </span>
                )}
              </div>

              <h1 className="text-lg font-bold text-[#18181B] leading-snug">
                {listing.title}
              </h1>

              <div className="text-xs text-[#6B7280] mt-1 flex items-center gap-3">
                <span>Seller: <strong className="text-[#18181B]">{listing.sellerName}</strong></span>
                {listing.locationName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {listing.locationName.split(',')[0]}
                  </span>
                )}
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-[#F7F7F5] border border-[#E5E7EB] rounded-lg p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-[#6B7280] font-semibold block uppercase">
                    {isSold ? 'Final Sold Price' : 'Current Highest Bid'}
                  </span>
                  <span className="text-2xl font-black text-[#18181B]">
                    {formatNPR(listing.currentPrice)}
                  </span>
                </div>

                {isActive && (
                  <div className="text-right">
                    <span className="text-xs text-[#6B7280] font-semibold block uppercase">Time Left</span>
                    <div className="text-sm font-bold text-[#18181B]">
                      <CountdownTimer endTime={listing.endTime} />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-[#6B7280] flex justify-between pt-1 border-t border-[#E5E7EB]">
                <span>Total Bids: <strong className="text-[#18181B]">{bids.length}</strong></span>
                <span>Min Next Bid: <strong className="text-[#18181B]">{formatNPR(minRequiredBid)}</strong></span>
              </div>
            </div>

            {/* Follow & Real-Time Alert Banner */}
            <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isFollowing ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-200'}`}>
                  {isFollowing ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#18181B]">
                      {isFollowing ? 'Following Item' : 'Follow & Alert Engine'}
                    </span>
                    {isFollowing && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    {isFollowing && followData?.targetPriceThreshold
                      ? `Alerts set for target ${formatNPR(followData.targetPriceThreshold)} & outbids`
                      : isFollowing
                      ? 'In-app & email alerts enabled for outbids'
                      : 'Get instant in-app/email alerts if outbid or target price reached'}
                  </p>
                </div>
              </div>

              <button
                id={`btn-follow-toggle-${listing.id}`}
                onClick={() => {
                  if (!currentUser) {
                    if (onAuthRequired) onAuthRequired();
                    return;
                  }
                  setShowFollowModal(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                  isFollowing
                    ? 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-[#18181B] text-white hover:bg-black'
                }`}
              >
                {isFollowing ? <Settings className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                {isFollowing ? 'Alert Settings' : 'Follow Item'}
              </button>
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                {successMsg}
              </div>
            )}

            {/* Bidding Section */}
            {isActive && !isSeller && (
              <div className="space-y-3 pt-2">
                <div className="flex border-b border-[#E5E7EB] text-xs font-semibold">
                  <button
                    onClick={() => setIsAutoBidActive(false)}
                    className={`pb-2 px-3 border-b-2 cursor-pointer ${
                      !isAutoBidActive ? 'border-[#D99000] text-[#D99000] font-bold' : 'border-transparent text-[#6B7280]'
                    }`}
                  >
                    Direct Bid
                  </button>
                  <button
                    onClick={() => setIsAutoBidActive(true)}
                    className={`pb-2 px-3 border-b-2 cursor-pointer ${
                      isAutoBidActive ? 'border-[#D99000] text-[#D99000] font-bold' : 'border-transparent text-[#6B7280]'
                    }`}
                  >
                    Auto-Bid Engine
                  </button>
                </div>

                {!isAutoBidActive ? (
                  <form onSubmit={handleManualBidSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>Enter Amount (NPR)</span>
                        {currentUser && walletInfo && (
                          <span className="flex items-center gap-1 text-xs">
                            <Wallet className="w-3 h-3 text-[#D99000]" />
                            Available: <strong>{formatNPR(availableBal)}</strong>
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="10"
                        min={minRequiredBid}
                        placeholder={`e.g. ${minRequiredBid}`}
                        value={customBid}
                        onChange={(e) => setCustomBid(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isInsufficientWalletBalance}
                      className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Hammer className="w-4 h-4" />
                      Place Bid ({formatNPR(enteredManualVal || minRequiredBid)})
                    </button>

                    {isInsufficientWalletBalance && (
                      <div className="text-xs text-red-600 font-medium flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
                        <span>Insufficient wallet balance to place this bid.</span>
                        {onNavigateToWallet && (
                          <button
                            type="button"
                            onClick={onNavigateToWallet}
                            className="text-xs font-bold text-[#D99000] underline"
                          >
                            Top Up
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleProxyBidSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#6B7280]">
                        <span>Maximum Proxy Limit (NPR)</span>
                        {currentUser && walletInfo && (
                          <span className="text-xs">Available: {formatNPR(availableBal)}</span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="100"
                        min={minRequiredBid + 100}
                        placeholder={`e.g. ${minRequiredBid + 1000}`}
                        value={proxyBidMax}
                        onChange={(e) => setProxyBidMax(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isInsufficientWalletBalance}
                      className="w-full h-10 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Set Auto-Bid Limit
                    </button>
                  </form>
                )}

                {listing.buyNowPrice && (
                  <div className="pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={onBuyNow}
                      className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Buy Now for {formatNPR(listing.buyNowPrice)}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isSeller && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-xs">
                You are the seller of this auction. You cannot place bids on your own items.
              </div>
            )}

            {isSold && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                This item has been sold.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description & Bid History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-[#E5E7EB]">
        
        {/* Description & Location */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-sm text-[#18181B]">Item Description</h3>
            <p className="text-xs text-[#18181B] leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {listing.latitude && listing.longitude && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3 shadow-xs">
              <h3 className="font-bold text-sm text-[#18181B]">Item Location</h3>
              <p className="text-xs text-[#6B7280]">{listing.locationName}</p>
              <div className="h-60 rounded overflow-hidden border border-[#E5E7EB]">
                <LeafletMap
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  locationName={listing.locationName}
                  readonly={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bid History Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-sm text-[#18181B] flex items-center justify-between">
              <span>Bid Log ({bids.length})</span>
            </h3>

            {bids.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No bids placed yet. Be the first bidder!</p>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {bids.map((b) => (
                  <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#18181B]">{b.bidderName}</span>
                      {b.isAutoBid && <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1 rounded">Auto</span>}
                    </div>
                    <span className="font-bold text-[#18181B]">{formatNPR(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Button */}
          <div className="text-right">
            <button
              onClick={() => setShowReportForm(!showReportForm)}
              className="text-xs text-[#6B7280] hover:text-red-700 underline font-medium cursor-pointer"
            >
              Report this listing
            </button>

            {showReportForm && (
              <form onSubmit={handleReportSubmit} className="mt-2 text-left bg-white border border-[#E5E7EB] p-3 rounded-lg space-y-2">
                <label className="block text-xs font-semibold text-[#18181B]">Reason for report</label>
                <textarea
                  required
                  rows={2}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Counterfeit item or incorrect description"
                  className="w-full p-2 border border-[#E5E7EB] rounded text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-red-700 text-white font-bold text-xs rounded hover:bg-red-800"
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* Follow & Alert Configuration Modal */}
      {showFollowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#E5E7EB] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-[#18181B]">
                  Item Alert & Follow Settings
                </h3>
              </div>
              <button
                onClick={() => setShowFollowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-[#6B7280]">
              Configure real-time notifications for <strong className="text-[#18181B]">{listing.title}</strong>.
            </p>

            <form onSubmit={handleSaveFollow} className="space-y-4">
              {/* Target Price Alert Threshold */}
              <div className="space-y-1.5 bg-[#F7F7F5] p-3 rounded-lg border border-[#E5E7EB]">
                <label className="block text-xs font-bold text-[#18181B] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Target Price Alert Threshold (NPR)
                </label>
                <p className="text-[11px] text-[#6B7280]">
                  Notify me immediately when current bid reaches or exceeds:
                </p>
                <input
                  type="number"
                  step="100"
                  placeholder={`e.g. ${listing.currentPrice + 1000}`}
                  value={targetThresholdInput}
                  onChange={(e) => setTargetThresholdInput(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-amber-500"
                />

                {/* Quick Price Increment Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#6B7280]">Presets:</span>
                  {[500, 1000, 5000].map((step) => {
                    const presetVal = listing.currentPrice + step;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setTargetThresholdInput(String(presetVal))}
                        className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[10px] font-semibold text-[#18181B] hover:border-amber-500 cursor-pointer"
                      >
                        +{formatNPR(step)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trigger Toggles */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#18181B] block">Alert Triggers:</span>
                
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#18181B]">
                  <input
                    type="checkbox"
                    checked={notifyOnOutbid}
                    onChange={(e) => setNotifyOnOutbid(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Notify me immediately if I am outbid on this item</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#18181B]">
                  <input
                    type="checkbox"
                    checked={notifyOnPriceThreshold}
                    onChange={(e) => setNotifyOnPriceThreshold(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Notify me when price reaches or exceeds my target threshold</span>
                </label>
              </div>

              {/* Notification Channels */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <span className="text-xs font-bold text-[#18181B] block">Delivery Channels:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#18181B] bg-gray-50 p-2.5 rounded border border-[#E5E7EB]">
                    <input
                      type="checkbox"
                      checked={notifyInApp}
                      onChange={(e) => setNotifyInApp(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <Bell className="w-3.5 h-3.5 text-gray-600" />
                    <span>In-App Alert</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#18181B] bg-gray-50 p-2.5 rounded border border-[#E5E7EB]">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <Mail className="w-3.5 h-3.5 text-gray-600" />
                    <span>Email Alert</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                {isFollowing && (
                  <button
                    type="button"
                    onClick={handleUnfollow}
                    disabled={savingFollow}
                    className="px-3 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Unfollow Item
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowFollowModal(false)}
                  className="px-3 py-2 border border-[#E5E7EB] text-[#6B7280] hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingFollow}
                  className="px-4 py-2 bg-[#18181B] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {savingFollow ? 'Saving...' : (isFollowing ? 'Update Preferences' : 'Follow & Save Alerts')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
