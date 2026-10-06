"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";


export default function AuthButton() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
    };

    if (loading) return null;
    
    if (user) {
          return (
            <button
                onClick={handleLogout}
                className="text-sm font-medium text-black dark:text-white hover:underline"
            >
                Log out
            </button>
        );
    }
    

    return (
        <Link
            href="/login"
            className="text-sm font-medium text-black dark:text-white hover:underline"
        >
            Log in
        </Link>
    );
}