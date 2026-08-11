import React, { useState } from 'react';
import { Bell, CheckCheck, Trophy, Tag, AlertTriangle, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Notification } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onSelectNotification?: (notif: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAllRead,
  onMarkRead,
  onSelectNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const safeNotifs = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifs.filter((n) => !n.isRead).length;

  const filteredNotifs = safeNotifs.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'AUCTION_WON':
        return <Trophy className="w-4 h-4 text-emerald-600" />;
      case 'LISTING_SOLD':
        return <Tag className="w-4 h-4 text-blue-600" />;
      case 'AUCTION_LOST':
      case 'RESERVE_NOT_MET':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'OUTBID':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'AUCTION_WON':
        return { text: 'Auction Won', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'LISTING_SOLD':
        return { text: 'Listing Sold', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'AUCTION_LOST':
        return { text: 'Auction Ended', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'RESERVE_NOT_MET':
        return { text: 'Reserve Unmet', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'OUTBID':
        return { text: 'Outbid Alert', bg: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { text: 'Notification', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors focus:outline-hidden"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop to close panel on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Notification Center</span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    onMarkAllRead();
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 px-3 pt-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                All ({safeNotifs.length})
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'unread'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredNotifs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">No notifications found.</p>
                </div>
              ) : (
                filteredNotifs.map((notif) => {
                  const badge = getTypeLabel(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) onMarkRead(notif.id);
                        if (onSelectNotification) {
                          onSelectNotification(notif);
                          setIsOpen(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex gap-3 relative ${
                        !notif.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Unread dot */}
                      {!notif.isRead && (
                        <span className="absolute top-4 left-2 w-2 h-2 bg-blue-600 rounded-full" />
                      )}

                      {/* Icon */}
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0 self-start shadow-xs">
                        {getBadgeIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                            {badge.text}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 ml-auto">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {notif.title && (
                          <h4 className="text-xs font-bold text-slate-900 leading-snug mb-0.5">
                            {notif.title}
                          </h4>
                        )}

                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                          {notif.message}
                        </p>
                      </div>

                      {/* Individual Mark Read Button */}
                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                          }}
                          className="self-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
