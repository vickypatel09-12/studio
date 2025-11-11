'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';

/**
 * A client-side only wrapper for the Toaster component to prevent hydration errors.
 */
export function ClientToaster() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setIsClient(true);
  }, []);

  // Render the Toaster only on the client-side.
  if (!isClient) {
    return null;
  }

  return <Toaster />;
}
