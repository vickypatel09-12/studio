'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config'; // Direct import from the new config file
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

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (
        firebaseConfig &&
        firebaseConfig.apiKey &&
        !firebaseConfig.apiKey.includes('PASTE_YOUR')
      ) {
        const app =
          getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setServices({ firebaseApp: app, auth, firestore });
      } else {
        setError(
          'Your Firebase configuration is missing or incomplete. Please paste your credentials into src/firebase/config.ts.'
        );
      }
    } catch (e: any) {
      console.error('Error initializing Firebase:', e);
      setError(
        `An unexpected error occurred during Firebase initialization: ${e.message}`
      );
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4 text-xs text-muted-foreground">
              This is a one-time setup step. This file is excluded from git
              commits for security. Please fill it out and then redeploy on Vercel.
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

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to services...</p>
      </div>
    </div>
  );
}
