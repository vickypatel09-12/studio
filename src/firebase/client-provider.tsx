'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
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

// This function is now self-contained within the provider.
function getFirebaseConfig() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Check if all required keys are present
  if (Object.values(firebaseConfig).some(value => !value)) {
    console.error('Firebase configuration is missing or incomplete. Make sure all NEXT_PUBLIC_FIREBASE_* environment variables are set.');
    return null;
  }
  
  return firebaseConfig;
}


export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const config = getFirebaseConfig();
    if (config) {
      try {
        const app =
          getApps().length > 0 ? getApp() : initializeApp(config);
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setServices({ firebaseApp: app, auth, firestore });
      } catch (e: any) {
        console.error('Error initializing Firebase:', e);
        setError(`An unexpected error occurred during Firebase initialization: ${e.message}`);
      }
    } else {
      setError(
        'Firebase configuration is missing. Please ensure your environment variables (NEXT_PUBLIC_FIREBASE_*) are set correctly in your Vercel project.'
      );
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Connecting to services...</p>
          </div>
        </div>
      );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4 text-xs text-muted-foreground">
              Please check the browser console for more details and verify your project setup and environment variables.
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
  
  // This should not be reached if logic is correct, but adding as a fallback.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Preparing application...</p>
      </div>
    </div>
  );
}
