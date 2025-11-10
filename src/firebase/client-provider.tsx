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

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the configuration from the public JSON file
    fetch('/firebase-config.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('firebase-config.json not found or failed to load. Please ensure the file exists in your /public directory.');
        }
        return response.json();
      })
      .then((config) => {
        if (Object.values(config).some(value => !value)) {
            throw new Error('Firebase configuration is incomplete. Check the values in /public/firebase-config.json.');
        }

        try {
          const app =
            getApps().length > 0 ? getApp() : initializeApp(config);
          const auth = getAuth(app);
          const firestore = getFirestore(app);
          setServices({ firebaseApp: app, auth, firestore });
        } catch (e: any) {
          console.error('Error initializing Firebase:', e);
          setError(`An unexpected error occurred during Firebase initialization: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Failed to fetch or parse Firebase config:', e);
        setError(e.message);
        setIsLoading(false);
      });

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
              Please check the browser console for more details. If you're running locally, ensure you have created `public/firebase-config.json`.
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
       <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fatal Error</AlertTitle>
          <AlertDescription>
            The application could not be loaded. Please contact support.
          </AlertDescription>
        </Alert>
    </div>
  );
}
