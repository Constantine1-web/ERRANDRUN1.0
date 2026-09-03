'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
      {children}
      <Toaster position="bottom-center" />
    </ThemeProvider>
  );
}
