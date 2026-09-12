const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/components/ui/ErrandCard.tsx');

const content = `import React from 'react';
import { MapPin, Clock, Navigation, Zap, Package, Utensils, Printer, MoreHorizontal } from 'lucide-react';
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

const CategoryIcon = ({ category, className = "w-4 h-4" }: { category: string, className?: string }) => {
  switch (category) {
    case 'food_delivery': return <Utensils className={className} />;
    case 'academic': return <Printer className={className} />;
    case 'campus_errand': return <Clock className={className} />;
    case 'personal': return <Package className={className} />;
    default: return <MoreHorizontal className={className} />;
  }
};

export function ErrandCard({ errand, onAccept, onCounter, onView, mode = 'runner', className = '' }: ErrandCardProps) {
  const isRunner = mode === 'runner';
  const primaryColor = isRunner ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';
  const primaryBgColor = isRunner ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20';

  return (
    <div className={\`bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-5 \${className}\`}>
      
      {/* Title & Tags */}
      <div>
        <div className="flex justify-between items-start gap-3 mb-2">
          <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white line-clamp-2 leading-tight">
            {errand.title}
          </h3>
          <span className={\`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 \${primaryBgColor} \${primaryColor}\`}>
            {errand.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Category Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
            <CategoryIcon category={errand.category} className="w-3.5 h-3.5" />
            {errand.category?.replace('_', ' ')}
          </div>
          
          {/* Priority Tag */}
          {errand.priority === 'urgent' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold ring-1 ring-amber-200 dark:ring-amber-500/30">
              <Zap className="w-3.5 h-3.5" />
              Express
            </div>
          )}
          
          {/* Bulky Tag */}
          {errand.is_bulky && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold ring-1 ring-indigo-200 dark:ring-indigo-500/30">
              <Package className="w-3.5 h-3.5" />
              Heavy
            </div>
          )}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-900 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Pickup</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{errand.pickup_location}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 relative z-10">
          <div className={\`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-900 mt-0.5 \${isRunner ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}\`}>
            <Navigation className="w-3 h-3" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Dropoff</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">{errand.delivery_location}</p>
          </div>
        </div>
      </div>

      {/* Context & Price */}
      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          {errand.distance_km && (
            <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-slate-400" />
              {errand.distance_km.toFixed(1)} km est.
            </p>
          )}
          <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            {new Date(errand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRunner ? 'Your Payout' : 'Total Fare'}</p>
          <p className={\`text-3xl font-black font-mono \${isRunner ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}\`}>
            {formatCurrency(errand.total_fee)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex gap-3">
        {onView && (
          <Button variant="secondary" className="flex-1 text-sm h-12 font-bold" onClick={onView}>
            Details
          </Button>
        )}
        {onCounter && (
          <Button variant="secondary" className="flex-1 text-sm h-12 font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50" onClick={onCounter}>
            Counter
          </Button>
        )}
        {onAccept && (
          <Button 
            className={\`flex-1 text-sm h-12 font-black shadow-md border-none \${isRunner ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}\`}
            onClick={onAccept}
          >
            Accept Errand
          </Button>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully refactored ErrandCard to include Category, Priority, and Bulky tags!');
