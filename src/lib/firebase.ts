import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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

// Firestore with offline persistence
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  db = getFirestore(app);
}
export { db };

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
