'use client';
import { initializeFirebase, FirebaseProvider } from '@/firebase';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { type FirebaseContextValue } from './provider';

export function FirebaseClientProvider({ children }: PropsWithChildren) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    const { app, auth, firestore } = initializeFirebase();
    if (app && auth && firestore) {
      setFirebase({ app, auth, firestore });
    }
  }, []);

  if (!firebase) {
    // You can return a loader here if you'd like
    return <>{children}</>;
  }

  return (
    <FirebaseProvider
      app={firebase.app}
      auth={firebase.auth}
      firestore={firebase.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
