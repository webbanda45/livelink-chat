import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { UserProfile } from '@/types/chat';
import { 
  syncProfileToSupabase, 
  setUserPresence, 
  getProfileByFirebaseUid 
} from '@/services/supabaseChatService';

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

  // Set up presence system (Lovable Cloud only)
  const setupPresence = async (uid: string) => {
    await setUserPresence(uid, true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch profile from Lovable Cloud (Supabase)
          let profile = await getProfileByFirebaseUid(firebaseUser.uid);
          
          if (!profile) {
            // Profile doesn't exist - create one from Firebase user data
            const username = firebaseUser.email?.split('@')[0] || `user_${Date.now()}`;
            await syncProfileToSupabase(
              firebaseUser.uid,
              username.toLowerCase(),
              firebaseUser.displayName || username,
              firebaseUser.photoURL || undefined
            );
            profile = await getProfileByFirebaseUid(firebaseUser.uid);
          }
          
          if (profile) {
            setUser({
              ...profile,
              email: firebaseUser.email || '',
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
    
    // Fetch profile from Lovable Cloud
    let profile = await getProfileByFirebaseUid(userCredential.user.uid);
    
    if (!profile) {
      // Create profile if it doesn't exist
      const username = email.split('@')[0] || `user_${Date.now()}`;
      await syncProfileToSupabase(
        userCredential.user.uid,
        username.toLowerCase(),
        username
      );
      profile = await getProfileByFirebaseUid(userCredential.user.uid);
    }
    
    if (profile) {
      setUser({
        ...profile,
        email: userCredential.user.email || '',
      });
      setupPresence(userCredential.user.uid);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create profile in Lovable Cloud
    await syncProfileToSupabase(
      userCredential.user.uid,
      username.toLowerCase(),
      username
    );

    setUser({
      id: userCredential.user.uid,
      email,
      username: username.toLowerCase(),
      nickname: username,
      createdAt: new Date(),
    });
    
    setupPresence(userCredential.user.uid);
  };

  const signInWithGoogle = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    
    // Check if profile exists in Lovable Cloud
    let profile = await getProfileByFirebaseUid(userCredential.user.uid);
    
    if (!profile) {
      // Create new user profile for Google sign-in in Lovable Cloud
      const username = userCredential.user.email?.split('@')[0] || `user_${Date.now()}`;
      
      await syncProfileToSupabase(
        userCredential.user.uid,
        username.toLowerCase(),
        userCredential.user.displayName || username,
        userCredential.user.photoURL || undefined
      );

      setUser({
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        username: username.toLowerCase(),
        nickname: userCredential.user.displayName || username,
        avatar: userCredential.user.photoURL || undefined,
        createdAt: new Date(),
      });
    } else {
      setUser({
        ...profile,
        email: userCredential.user.email || '',
      });
    }
    
    setupPresence(userCredential.user.uid);
  };

  const signOut = async () => {
    try {
      if (firebaseUser) {
        // Set offline status in Lovable Cloud
        await setUserPresence(firebaseUser.uid, false);
      }
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
    
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!firebaseUser || !user) return;
    
    // Update profile in Lovable Cloud
    await syncProfileToSupabase(
      firebaseUser.uid,
      updates.username || user.username,
      updates.nickname || user.nickname,
      updates.avatar || user.avatar
    );
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
