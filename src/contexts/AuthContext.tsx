import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  status: 'online' | 'offline';
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  updateProfile: (updates: Partial<User>) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('fyrechat_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser({ ...parsedUser, status: 'online' });
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock sign in - in production, this would validate against backend
    const storedUsers = JSON.parse(localStorage.getItem('fyrechat_users') || '[]');
    const existingUser = storedUsers.find((u: User) => u.email === email);
    
    if (existingUser) {
      const loggedInUser = { ...existingUser, status: 'online' as const };
      setUser(loggedInUser);
      localStorage.setItem('fyrechat_user', JSON.stringify(loggedInUser));
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const storedUsers = JSON.parse(localStorage.getItem('fyrechat_users') || '[]');
    
    if (storedUsers.find((u: User) => u.email === email)) {
      throw new Error('Email already exists');
    }
    
    if (storedUsers.find((u: User) => u.username === username)) {
      throw new Error('Username already taken');
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      username,
      nickname: username,
      status: 'online',
      createdAt: new Date(),
    };

    storedUsers.push(newUser);
    localStorage.setItem('fyrechat_users', JSON.stringify(storedUsers));
    localStorage.setItem('fyrechat_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const signInWithGoogle = async () => {
    // Mock Google sign in
    const mockGoogleUser: User = {
      id: crypto.randomUUID(),
      email: 'demo@gmail.com',
      username: 'demo_user',
      nickname: 'Demo User',
      status: 'online',
      createdAt: new Date(),
    };
    
    localStorage.setItem('fyrechat_user', JSON.stringify(mockGoogleUser));
    setUser(mockGoogleUser);
  };

  const signOut = () => {
    if (user) {
      const updatedUser = { ...user, status: 'offline' as const };
      const storedUsers = JSON.parse(localStorage.getItem('fyrechat_users') || '[]');
      const userIndex = storedUsers.findIndex((u: User) => u.id === user.id);
      if (userIndex >= 0) {
        storedUsers[userIndex] = updatedUser;
        localStorage.setItem('fyrechat_users', JSON.stringify(storedUsers));
      }
    }
    localStorage.removeItem('fyrechat_user');
    setUser(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('fyrechat_user', JSON.stringify(updatedUser));
      
      const storedUsers = JSON.parse(localStorage.getItem('fyrechat_users') || '[]');
      const userIndex = storedUsers.findIndex((u: User) => u.id === user.id);
      if (userIndex >= 0) {
        storedUsers[userIndex] = updatedUser;
        localStorage.setItem('fyrechat_users', JSON.stringify(storedUsers));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
