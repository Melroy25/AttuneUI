// Browser side of sign-in. Firebase proves who you are; the server then sets the store cookie.
import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider, browserPopupRedirectResolver, createUserWithEmailAndPassword, getAuth,
  inMemoryPersistence, initializeAuth, signInWithEmailAndPassword, signInWithPopup, type Auth,
} from "firebase/auth";
import type { WebConfig } from "@/lib/server/firebase";

let auth: Auth | null = null;

export function firebaseAuth(config: WebConfig): Auth {
  if (auth) return auth;
  const fresh = getApps().length === 0;
  const app = fresh ? initializeApp(config) : getApps()[0];
  // Nothing is kept in the browser by Firebase: the store cookie is the session.
  auth = fresh
    ? initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver })
    : getAuth(app);
  return auth;
}

export const withGoogle = async (a: Auth) => (await signInWithPopup(a, new GoogleAuthProvider())).user.getIdToken();

export const withName = async (a: Auth, email: string, password: string, create: boolean) =>
  (await (create ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(a, email, password)).user.getIdToken();

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "That username is taken. Choose another, or sign in.",
  "auth/invalid-credential": "Wrong username or password.",
  "auth/user-not-found": "Wrong username or password.",
  "auth/wrong-password": "Wrong username or password.",
  "auth/weak-password": "Use at least 6 characters for the password.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/operation-not-allowed": "This sign-in method is switched off in Firebase Authentication.",
  "auth/unauthorized-domain": "This web address is not in Firebase's authorised domains.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before signing in.",
  "auth/network-request-failed": "No connection to Firebase. Check the network.",
};

export function signInMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  return MESSAGES[code] ?? (error instanceof Error ? error.message : "Sign-in failed.");
}
