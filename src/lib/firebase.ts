import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC0iC7vvpqB-X3mbI7dk59ITjyYvvNd-7U",
  authDomain: "fyrechat-12c6b.firebaseapp.com",
  projectId: "fyrechat-12c6b",
  storageBucket: "fyrechat-12c6b.firebasestorage.app",
  messagingSenderId: "1074485985118",
  appId: "1:1074485985118:web:674bbbc06baf659c9a99cf",
  measurementId: "G-KNW0Z08VVY",
};

// Initialize Firebase (Auth only)
const app = initializeApp(firebaseConfig);

// Initialize Auth service only
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
