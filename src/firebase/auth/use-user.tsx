'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth, useUser as useUserFromContext } from '@/firebase/provider';

export function useUser() {
  const auth = useAuth();
  const { user, isUserLoading } = useUserFromContext();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // The provider handles the state update.
      // This listener is just to ensure we catch the initial state.
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading };
}
