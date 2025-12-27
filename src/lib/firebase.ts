import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC0iC7vvpqB-X3mbI7dk59ITjyYvvNd-7U",
  authDomain: "fyrechat-12c6b.firebaseapp.com",
  projectId: "fyrechat-12c6b",
  storageBucket: "fyrechat-12c6b.firebasestorage.app",
  messagingSenderId: "1074485985118",
  appId: "1:1074485985118:web:674bbbc06baf659c9a99cf",
  measurementId: "G-KNW0Z08VVY",
  databaseURL: "https://fyrechat-12c6b-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
