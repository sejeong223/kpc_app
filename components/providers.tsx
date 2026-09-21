'use client';

import * as React from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
// import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
// import { getQueryClient } from '@/lib/reactQuery';
// import { Provider as JotaiProvider } from 'jotai';

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

export default function Providers({ children, session }: ProvidersProps) {
  // const client = React.useRef(getQueryClient());

  return (
    <NuqsAdapter>
      {/* <QueryClientProvider client={client.current}> */}
      <SessionProvider
        refetchInterval={15 * 60}
        refetchOnWindowFocus={true}
        session={session}
      >
        {/* <JotaiProvider> */}
        {children}
        {/* </JotaiProvider> */}
      </SessionProvider>
      {/* </QueryClientProvider> */}
    </NuqsAdapter>
  );
}
