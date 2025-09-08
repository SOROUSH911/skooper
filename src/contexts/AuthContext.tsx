"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignIn, 
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  type SignInOutput,
  type SignUpOutput
} from 'aws-amplify/auth';

interface User {
  username: string;
  userId: string;
  signInDetails?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<SignInOutput>;
  signUp: (username: string, password: string, email: string) => Promise<SignUpOutput>;
  signOut: () => Promise<void>;
  confirmSignIn: (challengeResponse: string) => Promise<SignInOutput>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  resendSignUpCode: (username: string) => Promise<any>;
  resetPassword: (username: string) => Promise<any>;
  confirmResetPassword: (username: string, code: string, newPassword: string) => Promise<any>;
  checkAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const session = await fetchAuthSession();
      
      if (session?.tokens?.idToken) {
        const currentUser = await getCurrentUser();
        setUser({
          username: currentUser.username,
          userId: currentUser.userId,
          signInDetails: currentUser.signInDetails
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('Not authenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const handleSignIn = async (username: string, password: string): Promise<SignInOutput> => {
    try {
      setError(null);
      const result = await signIn({ username, password });
      
      // If sign-in is complete, fetch user info
      if (result.nextStep.signInStep === 'DONE') {
        await checkAuthState();
      }
      
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleSignUp = async (username: string, password: string, email: string): Promise<SignUpOutput> => {
    try {
      setError(null);
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleConfirmSignIn = async (challengeResponse: string): Promise<SignInOutput> => {
    try {
      setError(null);
      const result = await confirmSignIn({ challengeResponse });
      
      if (result.nextStep.signInStep === 'DONE') {
        await checkAuthState();
      }
      
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleConfirmSignUp = async (username: string, code: string) => {
    try {
      setError(null);
      const result = await confirmSignUp({ username, confirmationCode: code });
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleResendSignUpCode = async (username: string) => {
    try {
      setError(null);
      const result = await resendSignUpCode({ username });
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      setError(null);
      const result = await resetPassword({ username });
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const handleConfirmResetPassword = async (username: string, confirmationCode: string, newPassword: string) => {
    try {
      setError(null);
      const result = await confirmResetPassword({ username, confirmationCode, newPassword });
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        error,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        confirmSignIn: handleConfirmSignIn,
        confirmSignUp: handleConfirmSignUp,
        resendSignUpCode: handleResendSignUpCode,
        resetPassword: handleResetPassword,
        confirmResetPassword: handleConfirmResetPassword,
        checkAuthState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}