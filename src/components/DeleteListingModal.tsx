import React, { useState } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { Listing, Bid } from '../types';

interface DeleteListingModalProps {
  listing: Listing;
  bidsCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, confirmationText: string) => Promise<void>;
}

export default function DeleteListingModal({
  listing,
  bidsCount = 0,
  isOpen,
  onClose,
  onConfirm,
}: DeleteListingModalProps) {
  const [reason, setReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for deletion.');
      return;
    }
    if (confirmationText !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    setError('');
    setIsDeleting(true);
    try {
      await onConfirm(reason, confirmationText);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete listing.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 bg-rose-50 dark:bg-rose-900/10">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-black uppercase tracking-wider">Force Delete Listing</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-800/30 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-sm uppercase tracking-wider">Listing Details</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-slate-500 dark:text-slate-400">Title:</div>
              <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">{listing.title}</div>
              
              <div className="text-slate-500 dark:text-slate-400">Seller:</div>
              <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">{listing.sellerName}</div>
              
              <div className="text-slate-500 dark:text-slate-400">Status:</div>
              <div className="font-semibold text-slate-900 dark:text-slate-200">
                <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold ${
                  listing.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {listing.status}
                </span>
              </div>
              
              <div className="text-slate-500 dark:text-slate-400">Total Bids:</div>
              <div className="font-semibold text-slate-900 dark:text-slate-200">{bidsCount}</div>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-sm border border-rose-100 dark:border-rose-900/50">
            <p className="font-bold mb-1">⚠️ Warning: Destructive Action</p>
            <p>This listing will immediately disappear publicly from the homepage, search, and categories. Bids and wallet transactions will be preserved for audit purposes.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Deletion Reason (Required)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Violation of marketplace rules"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all dark:text-white"
                disabled={isDeleting}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Type <span className="text-rose-600 font-black select-none">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all dark:text-white uppercase font-mono tracking-widest"
                disabled={isDeleting}
              />
            </div>
          </div>

          {error && (
            <div className="text-rose-600 text-sm font-semibold bg-rose-50 dark:bg-rose-950/50 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting || confirmationText !== 'DELETE' || !reason.trim()}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Force Delete Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}
