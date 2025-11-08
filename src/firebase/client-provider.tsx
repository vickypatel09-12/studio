'use client';
import { initializeFirebase, FirebaseProvider } from '@/firebase';
import { type PropsWithChildren } from 'react';

export function FirebaseClientProvider({ children }: PropsWithChildren) {
  const { app, auth, firestore } = initializeFirebase();

  if (!app || !auth || !firestore) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
