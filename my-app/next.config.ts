import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "nxjgftxcmjonqcuuvmnc.supabase.co",
            },
        ],
    },
};

export default nextConfig;
