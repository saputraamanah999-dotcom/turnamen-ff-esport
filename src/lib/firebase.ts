import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

const getFirebaseConfig = () => {
  if (firebaseConfigJson && firebaseConfigJson.projectId && firebaseConfigJson.apiKey) {
    return firebaseConfigJson;
  }

  const env = (import.meta as any).env || {};

  return {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
    firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ""
  };
};

const config = getFirebaseConfig();

console.log('[Firebase] Initializing with project:', config.projectId);
console.log('[Firebase] Database ID:', config.firestoreDatabaseId || '(default)');

if (!getApps().length) {
  app = initializeApp(config);
} else {
  app = getApp();
}

if (config.firestoreDatabaseId) {
  db = getFirestore(app, config.firestoreDatabaseId);
} else {
  db = getFirestore(app);
}

auth = getAuth(app);
// Ensure persistence is enabled for offline support
// Firebase Auth v12+ enables persistence by default

export { app, db, auth };
