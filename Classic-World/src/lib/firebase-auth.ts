import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser 
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  fullName: string;
  businessName: string;
  role: string;
  activated: boolean;
  createdAt?: any;
}

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Firebase Email and Password
 */
export async function loginWithFirebase(email: string, pass: string): Promise<FirebaseUserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const user = cred.user;
  
  // Read or create firestore user profile
  const userDocRef = doc(db, "users", user.uid);
  const snap = await getDoc(userDocRef);
  
  if (snap.exists()) {
    return snap.data() as FirebaseUserProfile;
  }
  
  const newProfile: FirebaseUserProfile = {
    uid: user.uid,
    email: user.email || email,
    fullName: user.displayName || email.split("@")[0],
    businessName: "Classic World",
    role: "owner",
    activated: true,
    createdAt: serverTimestamp(),
  };
  
  await setDoc(userDocRef, newProfile, { merge: true });
  return newProfile;
}

/**
 * Sign up with Firebase Email and Password
 */
export async function signupWithFirebase(email: string, pass: string, fullName: string, businessName = "Classic World"): Promise<FirebaseUserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = cred.user;
  
  if (fullName) {
    await updateProfile(user, { displayName: fullName });
  }
  
  const userDocRef = doc(db, "users", user.uid);
  const newProfile: FirebaseUserProfile = {
    uid: user.uid,
    email: user.email || email,
    fullName: fullName || email.split("@")[0],
    businessName: businessName || "Classic World",
    role: "owner",
    activated: true,
    createdAt: serverTimestamp(),
  };
  
  await setDoc(userDocRef, newProfile, { merge: true });
  return newProfile;
}

/**
 * Sign in with Google Popup
 */
export async function loginWithFirebaseGoogle(): Promise<FirebaseUserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;
  
  const userDocRef = doc(db, "users", user.uid);
  const snap = await getDoc(userDocRef);
  
  if (snap.exists()) {
    return snap.data() as FirebaseUserProfile;
  }
  
  const newProfile: FirebaseUserProfile = {
    uid: user.uid,
    email: user.email || "",
    fullName: user.displayName || "Classic World Admin",
    businessName: "Classic World",
    role: "owner",
    activated: true,
    createdAt: serverTimestamp(),
  };
  
  await setDoc(userDocRef, newProfile, { merge: true });
  return newProfile;
}

/**
 * Sign out from Firebase
 */
export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Observe Firebase Auth State
 */
export function onFirebaseUserChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
