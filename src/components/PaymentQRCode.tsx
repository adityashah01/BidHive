import React, { useState } from 'react';
import { Copy, Check, QrCode, ShieldCheck } from 'lucide-react';

interface PaymentQRCodeProps {
  size?: number;
  showDetails?: boolean;
}

export default function PaymentQRCode({ size = 180, showDetails = true }: PaymentQRCodeProps) {
  const [selectedGateway, setSelectedGateway] = useState<'ESEWA' | 'KHALTI'>('ESEWA');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const esewaNumber = '9801234567';
  const khaltiNumber = '9860123456';
  const currentNumber = selectedGateway === 'ESEWA' ? esewaNumber : khaltiNumber;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center space-y-3 shadow-2xs">
      
      {/* Gateway Switcher */}
      <div className="flex items-center justify-center gap-2 p-1 bg-[#F7F7F5] rounded-lg border border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => setSelectedGateway('ESEWA')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedGateway === 'ESEWA'
              ? 'bg-[#60BB46] text-white shadow-2xs'
              : 'text-[#18181B] hover:bg-gray-200/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          eSewa QR
        </button>
        <button
          type="button"
          onClick={() => setSelectedGateway('KHALTI')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedGateway === 'KHALTI'
              ? 'bg-[#5C2D91] text-white shadow-2xs'
              : 'text-[#18181B] hover:bg-gray-200/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Khalti QR
        </button>
      </div>

      {/* QR Code Container */}
      <div className="relative inline-block p-3 bg-white rounded-xl border-2 border-dashed border-[#E5E7EB] shadow-2xs">
        {!imgError ? (
          <div className="relative flex items-center justify-center bg-white p-2 rounded-lg" style={{ width: size, height: size }}>
            <img
              src="/qr-code.png"
              alt="Payment QR Code"
              className="w-full h-full object-contain rounded-md"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          /* SVG QR Visual Fallback */
          <div className="relative flex items-center justify-center bg-white p-2 rounded-lg" style={{ width: size, height: size }}>
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full text-[#18181B]"
              fill="currentColor"
            >
              {/* Corner Position Detection Squares */}
              {/* Top Left */}
              <rect x="5" y="5" width="28" height="28" rx="3" fill="#18181B" />
              <rect x="9" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="13" y="13" width="12" height="12" rx="1" fill={selectedGateway === 'ESEWA' ? '#60BB46' : '#5C2D91'} />

              {/* Top Right */}
              <rect x="67" y="5" width="28" height="28" rx="3" fill="#18181B" />
              <rect x="71" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="75" y="13" width="12" height="12" rx="1" fill={selectedGateway === 'ESEWA' ? '#60BB46' : '#5C2D91'} />

              {/* Bottom Left */}
              <rect x="5" y="67" width="28" height="28" rx="3" fill="#18181B" />
              <rect x="9" y="71" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="13" y="75" width="12" height="12" rx="1" fill={selectedGateway === 'ESEWA' ? '#60BB46' : '#5C2D91'} />

              {/* Simulated QR Data Matrix Modules */}
              <rect x="38" y="7" width="6" height="6" rx="1" />
              <rect x="48" y="7" width="6" height="6" rx="1" />
              <rect x="56" y="7" width="6" height="6" rx="1" />
              
              <rect x="38" y="17" width="6" height="6" rx="1" />
              <rect x="48" y="17" width="6" height="6" rx="1" />
              <rect x="56" y="17" width="6" height="6" rx="1" />

              <rect x="7" y="38" width="6" height="6" rx="1" />
              <rect x="17" y="38" width="6" height="6" rx="1" />
              <rect x="27" y="38" width="6" height="6" rx="1" />
              <rect x="38" y="38" width="8" height="8" rx="2" fill={selectedGateway === 'ESEWA' ? '#60BB46' : '#5C2D91'} />
              <rect x="50" y="38" width="6" height="6" rx="1" />
              <rect x="60" y="38" width="6" height="6" rx="1" />
              <rect x="70" y="38" width="6" height="6" rx="1" />
              <rect x="80" y="38" width="6" height="6" rx="1" />

              <rect x="7" y="48" width="6" height="6" rx="1" />
              <rect x="17" y="48" width="6" height="6" rx="1" />
              <rect x="27" y="48" width="6" height="6" rx="1" />
              <rect x="38" y="50" width="6" height="6" rx="1" />
              <rect x="48" y="50" width="8" height="8" rx="2" fill={selectedGateway === 'ESEWA' ? '#60BB46' : '#5C2D91'} />
              <rect x="60" y="50" width="6" height="6" rx="1" />
              <rect x="70" y="50" width="6" height="6" rx="1" />
              <rect x="80" y="50" width="6" height="6" rx="1" />

              <rect x="7" y="58" width="6" height="6" rx="1" />
              <rect x="17" y="58" width="6" height="6" rx="1" />
              <rect x="27" y="58" width="6" height="6" rx="1" />
              <rect x="38" y="60" width="6" height="6" rx="1" />
              <rect x="48" y="60" width="6" height="6" rx="1" />
              <rect x="58" y="60" width="6" height="6" rx="1" />

              <rect x="38" y="70" width="6" height="6" rx="1" />
              <rect x="48" y="70" width="6" height="6" rx="1" />
              <rect x="58" y="70" width="6" height="6" rx="1" />
              <rect x="68" y="70" width="6" height="6" rx="1" />
              <rect x="78" y="70" width="6" height="6" rx="1" />
              <rect x="88" y="70" width="6" height="6" rx="1" />

              <rect x="38" y="80" width="6" height="6" rx="1" />
              <rect x="48" y="80" width="6" height="6" rx="1" />
              <rect x="58" y="80" width="6" height="6" rx="1" />
              <rect x="68" y="80" width="6" height="6" rx="1" />
              <rect x="78" y="80" width="6" height="6" rx="1" />
              <rect x="88" y="80" width="6" height="6" rx="1" />

              <rect x="38" y="88" width="6" height="6" rx="1" />
              <rect x="48" y="88" width="6" height="6" rx="1" />
              <rect x="58" y="88" width="6" height="6" rx="1" />
              <rect x="68" y="88" width="6" height="6" rx="1" />
              <rect x="78" y="88" width="6" height="6" rx="1" />
              <rect x="88" y="88" width="6" height="6" rx="1" />
            </svg>

            {/* Center Brand Badge */}
            <div className={`absolute inset-0 m-auto w-10 h-10 rounded-full border-2 border-white flex items-center justify-center font-black text-[10px] text-white shadow-md ${
              selectedGateway === 'ESEWA' ? 'bg-[#60BB46]' : 'bg-[#5C2D91]'
            }`}>
              {selectedGateway === 'ESEWA' ? 'eSewa' : 'Khalti'}
            </div>
          </div>
        )}
      </div>

      {/* Details & Copy Actions */}
      {showDetails && (
        <div className="space-y-2 text-xs text-left bg-[#F7F7F5] border border-[#E5E7EB] p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">Account Name:</span>
            <span className="font-bold text-[#18181B]">BidHive Nepal Admin Escrow</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#6B7280]">{selectedGateway === 'ESEWA' ? 'eSewa Number:' : 'Khalti Number:'}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-[#18181B]">{currentNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(currentNumber, selectedGateway)}
                className="p-1 hover:bg-gray-200 rounded text-[#6B7280] cursor-pointer transition-colors"
                title="Copy Mobile Number"
              >
                {copiedField === selectedGateway ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1 border-t border-[#E5E7EB] flex items-center gap-1.5 text-[11px] text-[#6B7280]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D99000] shrink-0" />
            <span>Official BidHive Nepal Escrow QR Code</span>
          </div>
        </div>
      )}
    </div>
  );
}
