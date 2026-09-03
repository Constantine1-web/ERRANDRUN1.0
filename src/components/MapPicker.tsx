'use client';

import dynamic from 'next/dynamic';

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white mt-4 font-bold text-sm tracking-wide animate-pulse">
        Initializing Campus Map…
      </p>
    </div>
  ),
});

export function MapPicker(props: any) {
  return <MapPickerInner {...props} />;
}
