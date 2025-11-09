'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const isConfigured = getApps().length > 0;
  const firebaseApp = isConfigured ? getApp() : initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
    // In development, emulator host is set via .env.local
    // e.g. NEXT_PUBLIC_EMULATOR_HOST=localhost:8080
    //
    // Don't connect to emulators in production.
    // Production build will not have NEXT_PUBLIC_EMULATOR_HOST defined.
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST.split(':')[0];
    const firestorePort = 8080;
    const authPort = 9099;
    
    try {
      connectFirestoreEmulator(firestore, host, firestorePort);
      connectAuthEmulator(auth, `http://${host}:${authPort}`);
    } catch (e) {
        // already connected
    }
  }
  
  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
