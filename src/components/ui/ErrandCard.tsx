import React from 'react';
import { MapPin, Clock, Navigation, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/utils/pricing';
import { Button } from './Button';

interface ErrandCardProps {
  errand: any;
  onAccept?: () => void;
  onCounter?: () => void;
  onView?: () => void;
  mode?: 'request' | 'runner';
  className?: string;
}

export function ErrandCard({ errand, onAccept, onCounter, onView, mode = 'runner', className = '' }: ErrandCardProps) {
  const isRunner = mode === 'runner';
  const primaryColor = isRunner ? 'text-runner-dark dark:text-runner-celadon' : 'text-student-charcoal dark:text-student-icy';
  const bgColor = isRunner ? 'bg-runner-celadon/10' : 'bg-student-icy/10';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4 ${className}`}>
      
      {/* Title & Status */}
      <div className="flex justify-between items-start gap-3">
        <h3 className="font-black text-lg text-slate-900 dark:text-white line-clamp-2">
          {errand.title}
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${bgColor} ${primaryColor}`}>
          {errand.status.replace('_', ' ')}
        </span>
      </div>

      {/* Locations */}
      <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-900">
            <MapPin className="w-3 h-3 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Pickup</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{errand.pickup_location}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 relative z-10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-900 ${isRunner ? 'bg-runner-dark text-runner-celadon' : 'bg-student-charcoal text-student-icy'}`}>
            <Navigation className="w-3 h-3" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Delivery</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{errand.delivery_location}</p>
          </div>
        </div>
      </div>

      {/* Context & Price */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-3">
        <div className="space-y-1">
          {errand.distance_km && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {errand.distance_km.toFixed(1)} km
            </p>
          )}
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(errand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Payout</p>
          <p className={`text-2xl font-black font-mono ${isRunner ? 'text-runner-dark dark:text-runner-celadon' : 'text-slate-900 dark:text-white'}`}>
            {formatCurrency(errand.total_fee)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex gap-2">
        {onView && (
          <Button variant="outline" className="flex-1 text-xs h-10 border-slate-200 dark:border-slate-700" onClick={onView}>
            View Details
          </Button>
        )}
        {onCounter && (
          <Button variant="outline" className="flex-1 text-xs h-10 border-slate-200 dark:border-slate-700" onClick={onCounter}>
            Counter
          </Button>
        )}
        {onAccept && (
          <Button 
            className={`flex-1 text-xs h-10 font-bold ${isRunner ? 'bg-runner-dark hover:bg-runner-dark/90 text-white' : 'bg-student-charcoal hover:bg-student-charcoal/90 text-white'}`}
            onClick={onAccept}
          >
            Accept Errand
          </Button>
        )}
      </div>
    </div>
  );
}
