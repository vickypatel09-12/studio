'use client';

// This file is the single entrypoint for all Firebase-related functionality.
// It should not contain any initialization logic, but rather re-export
// components and hooks from other modules.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { useUser } from './provider'; // Re-export the correct useUser hook
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
