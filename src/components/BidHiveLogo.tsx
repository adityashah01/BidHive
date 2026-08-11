import React, { useState } from 'react';

interface BidHiveLogoProps {
  variant?: 'compact' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  className?: string;
}

export default function BidHiveLogo({ variant = 'compact', size = 'md', theme = 'light', className = '' }: BidHiveLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        {/* Logo Image from /public/logo.png with fallback icon */}
        {!imgError ? (
          <img
            src="/logo.png"
            alt="BidHive Logo"
            className="w-8 h-8 rounded-lg object-contain bg-white shrink-0"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#D99000] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )}

        {/* Brand Name */}
        <div className="flex flex-col leading-none">
          <span className={`font-black text-lg tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#18181B]'}`}>
            <span className="text-[#D99000]">Bid</span>Hive
          </span>
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            Nepal Marketplace
          </span>
        </div>
      </div>
    );
  }

  // Full logo for Auth / Header banners
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {!imgError ? (
        <img
          src="/logo.png"
          alt="BidHive Logo"
          className="w-16 h-16 rounded-xl object-contain bg-white mb-2 shadow-2xs"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-[#D99000] text-white flex items-center justify-center font-black text-xl shadow-xs mb-2">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
      )}

      <h1 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#18181B]'}`}>
        <span className="text-[#D99000]">Bid</span>Hive
      </h1>
      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-[#6B7280]'}`}>
        Second-Hand Auctions in Nepal
      </p>
    </div>
  );
}
