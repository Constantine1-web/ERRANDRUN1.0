'use client';

import dynamic from 'next/dynamic';

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] bg-dark-base/90 flex flex-col items-center justify-center backdrop-blur-md">
      <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white/60 mt-4 font-medium animate-pulse">Loading Map...</p>
    </div>
  ),
});

export function MapPicker(props: any) {
  return <MapPickerInner {...props} />;
}
