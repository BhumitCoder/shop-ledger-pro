import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDInBeT_ytLjhkRv_J3rtagRXUdY4WfEds",
  authDomain: "ibellmobiles-123.firebaseapp.com",
  projectId: "ibellmobiles-123",
  storageBucket: "ibellmobiles-123.firebasestorage.app",
  messagingSenderId: "191077483403",
  appId: "1:191077483403:web:1c934544f5b7e3cbc0658e",
  measurementId: "G-3WSQ6FXD71",
};

export const app = initializeApp(firebaseConfig);

// Firestore with offline persistence (falls back to memory cache if it fails)
let _db: Firestore;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  }, "teligramboat");
} catch {
  _db = getFirestore(app, "teligramboat");
}
export const db: Firestore = _db;

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
