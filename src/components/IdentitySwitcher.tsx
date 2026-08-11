import React from 'react';
import { User } from '../types';
import { Shield, User as UserIcon } from 'lucide-react';

interface IdentitySwitcherProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
}

export default function IdentitySwitcher({ currentUser, allUsers, onSwitchUser }: IdentitySwitcherProps) {
  return (
    <div id="identity-switcher-container" className="bg-slate-900 border-b border-red-900/30 text-white text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium text-slate-300">Nepal Demo Testnet Mode:</span>
        <div className="flex items-center gap-1.5 bg-slate-800 text-red-200 px-2 py-0.5 rounded-full border border-red-900/40">
          <span className="font-bold">रू NPR</span>
          <span>Standard Time (UTC+5:45)</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400">Act as:</span>
        <div className="flex flex-wrap gap-1">
          {allUsers.map((user) => {
            const isSelected = user.id === currentUser.id;
            return (
              <button
                key={user.id}
                id={`btn-act-as-${user.id}`}
                onClick={() => onSwitchUser(user)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white font-semibold ring-1 ring-offset-1 ring-offset-slate-950 ring-red-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {user.role === 'ADMIN' ? (
                  <Shield className="w-3.5 h-3.5 text-yellow-400" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{user.name}</span>
                <span className="text-[10px] opacity-70">
                  ({user.role === 'ADMIN' ? 'Admin' : `Buyer Rating: ${user.buyerReliabilityScore}%`})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
