import { useAuthStore } from "@/stores/authStore";

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL;

export const getMe = async (token: string) => {
    const res = await fetch(`${API}/user/@me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Session expired. Please log in again.");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch user");

    return data.data;
};

export type SearchUserRow = {
    id: string;
    email: string;
    username: string | null;
    photoURL: string | null;
};

export async function searchUsers(token: string, q: string): Promise<SearchUserRow[]> {
    const url = new URL(`${API}/user/search`);
    url.searchParams.set("q", q);
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Search failed");
    return data?.data?.users ?? [];
}

export async function checkUsernameAvailable(token: string, username: string): Promise<boolean> {
    const url = new URL(`${API}/user/username-available`);
    url.searchParams.set("username", username);
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Check failed");
    return Boolean(data?.data?.available);
}

export async function updateUsername(token: string, username: string) {
    const res = await fetch(`${API}/user/username`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) throw new Error(data?.message || "Could not save username");
    return data?.data?.user;
}
