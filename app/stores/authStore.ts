import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

type User = {
    id: string;
    email: string;
    username: string | null;
    photoURL: string | null;
};

type AuthState = {
    token: string | null;
    user: User | null;
    isReady: boolean;
    setAuth: (token: string, user: User) => void;
    logout: () => void;
    hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isReady: false,

    setAuth: (token, user) => {
        SecureStore.setItemAsync("token", token);
        SecureStore.setItemAsync("user", JSON.stringify(user));
        set({ token, user });
    },

    logout: () => {
        SecureStore.deleteItemAsync("token");
        SecureStore.deleteItemAsync("user");
        set({ token: null, user: null });
        router.replace("/(auth)")
    },

    hydrate: async () => {
        try {
            const token = await SecureStore.getItemAsync("token");
            const raw = await SecureStore.getItemAsync("user");
            const user = raw ? JSON.parse(raw) : null;
            set({ token, user, isReady: true });
        } catch {
            set({ token: null, user: null, isReady: true });
        }
    },
}));