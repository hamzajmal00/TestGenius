// src/app/providers.jsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store/store';
import { useState } from 'react';

export default function Providers({ children }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </ReduxProvider>
  );
}
