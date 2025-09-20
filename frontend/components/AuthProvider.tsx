"use client";
import { createContext , useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, getIdToken } from "firebase/auth";
import { auth } from "../lib/firebase";
import { string } from "zod";

type AuthCtx = {
    user: User | null;
    loading: boolean;
    idToken: string | null;
    refreshToken: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>({
    user: null, loading: true, idToken: null, refreshToken: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [idToken, setIdToken] = useState<string | null>(null);

    async function refreshToken() {
        if (!auth.currentUser) return setIdToken(null);
        const t = await getIdToken(auth.currentUser, true);
        setIdToken(t);
    }

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            setLoading(false);
            setIdToken(u ? await getIdToken(u) : null);
        });
        return () => unsub();
    }, []);

    return (
        <Ctx.Provider value={{ user, loading, idToken, refreshToken }}>
            {children}
        </Ctx.Provider>
    );
}
export const useAuth = () => useContext(Ctx);