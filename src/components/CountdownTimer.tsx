import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  endTime: string;
  onExpire?: () => void;
}

export default function CountdownTimer({ endTime, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    isCritical: false, // Under 2 minutes
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      const difference = +new Date(endTime) - +new Date();
      
      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          isCritical: false,
        });
        clearInterval(intervalId);
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const isCritical = difference <= 2 * 60 * 1000; // Under 2 minutes

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        isCritical,
      });
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [endTime]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        Auction Ended
      </span>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (timeLeft.isCritical) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200 animate-pulse glow-red">
        <AlertTriangle className="w-3.5 h-3.5" />
        Sniper Alert! {formatNumber(timeLeft.minutes)}m:{formatNumber(timeLeft.seconds)}s
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Timer className="w-3.5 h-3.5" />
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {formatNumber(timeLeft.hours)}h:{formatNumber(timeLeft.minutes)}m:{formatNumber(timeLeft.seconds)}s
    </span>
  );
}
