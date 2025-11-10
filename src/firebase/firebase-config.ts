// This file is responsible for exporting the Firebase configuration object.
// It reads the environment variables and exports them in the format
// expected by Firebase.

export function getFirebaseConfig() {
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    
    // Basic validation to ensure that the config is not empty.
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        return null;
    }

    return firebaseConfig;
}
