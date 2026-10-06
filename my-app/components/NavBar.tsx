import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function NavBar() {
  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-zinc-200 dark:border-zinc-800">
      <Link href="/" className="text-2xl font-bold text-black dark:text-white">
        Humor Project
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/generate"
          className="text-sm font-medium text-black dark:text-white hover:underline"
        >
          Generate
        </Link>
        <Link
          href="/images"
          className="text-sm font-medium text-black dark:text-white hover:underline"
        >
          Images
        </Link>
        <Link
          href="/profile"
          className="text-sm font-medium text-black dark:text-white hover:underline"
        >
          Profile
        </Link>
        <AuthButton />
      </div>
    </header>
  );
}