import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  studentId: string;
  phoneNumber: string;
  role: 'user' | 'runner' | 'admin';
  avatarUrl?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  rating?: number;
  insurancePlanId?: string;
}

interface Session {
  id: string;
  loginAt: string;
  userId: string;
}

interface Wallet {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface AppState {
  user: User | null;
  session: Session | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isDarkMode: boolean;
  activeTaskId: string | null;
  
  // User actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setWallet: (wallet: Wallet | null) => void;
  setIsLoading: (loading: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setActiveTask: (taskId: string | null) => void;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  updateWalletBalance: (balance: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      wallet: null,
      isLoading: false,
      isDarkMode: true,
      activeTaskId: null,
      
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setWallet: (wallet) => set({ wallet }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      setActiveTask: (taskId) => set({ activeTaskId: taskId }),
      
      logout: () => set({
        user: null,
        session: null,
        wallet: null,
        activeTaskId: null,
      }),
      
      updateUserProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      updateWalletBalance: (balance) =>
        set((state) => ({
          wallet: state.wallet ? { ...state.wallet, balance } : null,
        })),
    }),
    {
      name: 'errandrun-store',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
