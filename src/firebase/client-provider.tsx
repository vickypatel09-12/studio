'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseConfig } from '@/firebase/firebase-config';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!services) {
        setIsTimedOut(true);
      }
    }, 5000); // 5-second timeout

    try {
      const config = getFirebaseConfig();
      if (config && config.apiKey) {
        console.log('Firebase config loaded, initializing app...');
        const app = getApps().length > 0 ? getApp() : initializeApp(config);
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setServices({ firebaseApp: app, auth, firestore });
      } else {
        console.error('Firebase configuration is missing or incomplete.');
        setError(
          'Firebase configuration is missing. Please ensure your environment variables (NEXT_PUBLIC_FIREBASE_*) are set correctly in your Vercel project.'
        );
      }
    } catch (e: any) {
      console.error('Error initializing Firebase:', e);
      setError(`An unexpected error occurred during Firebase initialization: ${e.message}`);
    }

    return () => clearTimeout(timer);
  }, []);

  if (services) {
    return (
      <FirebaseProvider
        firebaseApp={services.firebaseApp}
        auth={services.auth}
        firestore={services.firestore}
      >
        {children}
      </FirebaseProvider>
    );
  }

  // Display a loading indicator until timeout or error
  if (!isTimedOut && !error) {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to services...</p>
        </div>
      </div>
    );
  }

  // After timeout or if an error occurs, display an error message
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>
          {error || 'Could not connect to Firebase services. The application may be misconfigured or the service may be unavailable.'}
          <div className="mt-4 text-xs text-muted-foreground">
            Please check the browser console for more details and verify your project setup.
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
