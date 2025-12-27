import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, set, onDisconnect, onValue, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db, rtdb, googleProvider } from '@/lib/firebase';
import { UserProfile } from '@/types/chat';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up presence system
  const setupPresence = (uid: string) => {
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        set(userStatusRef, {
          state: 'online',
          lastChanged: rtdbServerTimestamp(),
        });

        // Set offline status on disconnect
        onDisconnect(userStatusRef).set({
          state: 'offline',
          lastChanged: rtdbServerTimestamp(),
        });
      }
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              username: userData.username,
              nickname: userData.nickname,
              avatar: userData.avatar,
              bio: userData.bio,
              createdAt: userData.createdAt?.toDate() || new Date(),
            });
            setupPresence(firebaseUser.uid);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setUser({
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        username: userData.username,
        nickname: userData.nickname,
        avatar: userData.avatar,
        bio: userData.bio,
        createdAt: userData.createdAt?.toDate() || new Date(),
      });
      setupPresence(userCredential.user.uid);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    try {
      const newUserData = {
        email,
        username: username.toLowerCase(),
        nickname: username,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newUserData);
      
      // Also create a username lookup entry
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        odId: userCredential.user.uid,
      });

      setUser({
        id: userCredential.user.uid,
        email,
        username: username.toLowerCase(),
        nickname: username,
        createdAt: new Date(),
      });
      
      try {
        setupPresence(userCredential.user.uid);
      } catch (presenceError) {
        console.error('Presence setup failed:', presenceError);
      }
    } catch (firestoreError) {
      console.error('Firestore write failed:', firestoreError);
      // Still set user since auth succeeded - profile will be created on next sign in
      setUser({
        id: userCredential.user.uid,
        email,
        username: username.toLowerCase(),
        nickname: username,
        createdAt: new Date(),
      });
      throw new Error('Account created but profile setup failed. Please check Firestore rules.');
    }
  };

  const signInWithGoogle = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      // Create new user profile for Google sign-in
      const username = userCredential.user.email?.split('@')[0] || `user_${Date.now()}`;
      const newUser = {
        email: userCredential.user.email || '',
        username: username.toLowerCase(),
        nickname: userCredential.user.displayName || username,
        avatar: userCredential.user.photoURL || undefined,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        odId: userCredential.user.uid,
      });

      setUser({
        id: userCredential.user.uid,
        ...newUser,
        createdAt: new Date(),
      });
    } else {
      const userData = userDoc.data();
      setUser({
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        username: userData.username,
        nickname: userData.nickname,
        avatar: userData.avatar,
        bio: userData.bio,
        createdAt: userData.createdAt?.toDate() || new Date(),
      });
    }
    
    setupPresence(userCredential.user.uid);
  };

  const signOut = async () => {
    try {
      if (firebaseUser) {
        // Set offline status before signing out
        const userStatusRef = ref(rtdb, `/status/${firebaseUser.uid}`);
        await set(userStatusRef, {
          state: 'offline',
          lastChanged: rtdbServerTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
    
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!firebaseUser || !user) return;
    
    await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
    setUser({ ...user, ...updates });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      isLoading, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut, 
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
