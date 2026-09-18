// Firebase Client Initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const googleProvider = new GoogleAuthProvider();

// Request permissions/prompt for account selection
googleProvider.setCustomParameters({
  // Always show Google's account chooser instead of silently reusing the last account.
  prompt: 'select_account',
});

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged };
export type { User };
