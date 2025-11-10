'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';

// Context for Firebase services
export interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}
const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

// Context for Firebase user
export interface UserContextValue {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}
const UserContext = createContext<UserContextValue | undefined>(undefined);


// Combined Provider
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, firebaseApp, firestore, auth }) => {
  const [userAuthState, setUserAuthState] = useState<UserContextValue>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => setUserAuthState({ user, isUserLoading: false, userError: null }),
      (error) => setUserAuthState({ user: null, isUserLoading: false, userError: error })
    );
    return () => unsubscribe();
  }, [auth]);

  const servicesValue = useMemo(() => ({ firebaseApp, firestore, auth }), [firebaseApp, firestore, auth]);

  return (
    <FirebaseContext.Provider value={servicesValue}>
      <UserContext.Provider value={userAuthState}>
        {children}
      </UserContext.Provider>
    </FirebaseContext.Provider>
  );
};


// Hooks
const useFirebaseContext = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useFirebaseApp = (): FirebaseApp => useFirebaseContext().firebaseApp;
export const useFirestore = (): Firestore => useFirebaseContext().firestore;
export const useAuth = (): Auth => useFirebaseContext().auth;


export const useUser = (): UserContextValue => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a FirebaseProvider.');
    }
    return context;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
