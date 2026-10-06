"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";

export default function ProfilePage() {
    const router = useRouter();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setUserId(user.id);

            const { data } = await supabase
                .from("profiles")
                .select("first_name, last_name, avatar_url")
                .eq("id", user.id)
                .single();

            if (data) {
                setFirstName(data.first_name ?? "");
                setLastName(data.last_name ?? "");
                setAvatarUrl(data.avatar_url ?? "");
            }
            setLoading(false);
        }

        void load();
    }, [router]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        const supabase = createClient();
        const filePath = `${userId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            alert("Upload failed: " + uploadError.message);
            return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        setAvatarUrl(data.publicUrl);
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({
                first_name: firstName,
                last_name: lastName,
                avatar_url: avatarUrl,
            })
            .eq("id", userId);
        setSaving(false);
        if (error) alert("Save failed: " + error.message);
        else alert("Saved!");
    };

    if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <NavBar />
            <main style={{ padding: "2rem" }}>
                <h1>Your Profile</h1>

                {avatarUrl && (
                    <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={100}
                        height={100}
                        style={{ borderRadius: "50%" }}
                    />
                )}
                <div>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                </div>

                <div>
                    <label>First name</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                    <label>Last name</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                <button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </button>
            </main>
        </div>
    );
}