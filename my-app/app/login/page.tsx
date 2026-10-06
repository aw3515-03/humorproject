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
        <main className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-4xl font-bold text-black dark:text-white mb-3">
                    Welcome back!
                </h1>

                <button
                onClick={handleLogin}
                className="w-full px-4 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                >
                    Log in with Google
                </button>
            </div>
        </main>
    );
}