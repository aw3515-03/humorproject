"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const supabase = createClient();

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <main style={{ padding: "2rem" }}>
            <h1>Log in</h1>
            <button onClick={handleLogin}>Continue with Google</button>
        </main>
    );
}