'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return null;
  }, []); // Empty dependency array ensures this runs only once on mount

  if (!firebaseServices) {
    // During SSR or build, firebaseServices will be null.
    // You can render a loader or null. Returning children might be okay
    // if child components are also client-only or handle the null case.
    return <>{children}</>;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
