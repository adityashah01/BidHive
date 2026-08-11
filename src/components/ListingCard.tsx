import React from 'react';
import { Listing, Category } from '../types';
import { MapPin, Clock, Tag, CheckCircle } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface ListingCardProps {
  key?: string;
  listing: Listing;
  category?: Category;
  onSelect: (listingId: string) => void;
  onExpire: (listingId: string) => void;
}

export default function ListingCard({ listing, category, onSelect, onExpire }: ListingCardProps) {
  // Format price consistently as Rs. 25,000
  const formatNPR = (amount: number) => {
    return `Rs. ${(amount || 0).toLocaleString('en-IN')}`;
  };

  const conditionLabels: Record<string, string> = {
    NEW: 'New',
    LIKE_NEW: 'Like New',
    GOOD: 'Good',
    FAIR: 'Fair',
    POOR: 'Used'
  };

  const isPending = listing.status === 'PENDING';
  const isActive = listing.status === 'ACTIVE';
  const isSold = listing.status === 'SOLD';
  const isEnded = listing.status === 'ENDED';

  return (
    <div
      id={`listing-card-${listing.id}`}
      className="bg-white rounded-lg border border-[#E5E7EB] hover:border-[#D99000]/60 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col h-full overflow-hidden"
    >
      {/* Image Header */}
      <div 
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer"
        onClick={() => onSelect(listing.id)}
      >
        <img
          src={listing.images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
        />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="bg-white/90 backdrop-blur-xs text-[#18181B] border border-gray-200 px-2 py-0.5 rounded text-[11px] font-semibold shadow-2xs">
            {conditionLabels[listing.condition] || listing.condition}
          </span>
          {category && (
            <span className="bg-gray-900/80 text-white px-2 py-0.5 rounded text-[11px] font-medium shadow-2xs">
              {category.name}
            </span>
          )}
        </div>

        {isPending && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center p-3 text-center">
            <span className="bg-amber-500 text-gray-900 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
              Pending Approval
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h3
            id={`title-${listing.id}`}
            onClick={() => onSelect(listing.id)}
            className="font-bold text-[#18181B] text-sm line-clamp-2 hover:text-[#D99000] transition-colors cursor-pointer min-h-[40px] leading-snug"
          >
            {listing.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Seller: <strong className="text-[#18181B] font-medium">{listing.sellerName}</strong></span>
            {listing.locationName && (
              <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                <span className="truncate">{listing.locationName.split(',')[0]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="pt-2 border-t border-[#E5E7EB] space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wider block font-semibold">
                {isSold ? 'Final Price' : 'Current Bid'}
              </span>
              <span className="text-base font-extrabold text-[#18181B]">
                {formatNPR(listing.currentPrice)}
              </span>
            </div>

            {listing.buyNowPrice && isActive && (
              <div className="text-right">
                <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-semibold flex items-center justify-end gap-0.5">
                  <Tag className="w-2.5 h-2.5" />
                  Buy Now
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  {formatNPR(listing.buyNowPrice)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-xs text-[#6B7280]">
              {isActive ? (
                <CountdownTimer endTime={listing.endTime} onExpire={() => onExpire(listing.id)} />
              ) : isSold ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Sold
                </span>
              ) : isEnded ? (
                <span className="text-gray-500 font-medium">Auction Ended</span>
              ) : (
                <span className="text-blue-600 font-medium">Upcoming</span>
              )}
            </div>

            <button
              id={`btn-view-auction-${listing.id}`}
              onClick={() => onSelect(listing.id)}
              className="px-3 py-1.5 rounded-md bg-[#D99000] hover:bg-[#B87500] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isPending ? 'Inspect' : 'View Auction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
