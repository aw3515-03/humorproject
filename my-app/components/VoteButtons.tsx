"use client";

import { useState } from "react";
import LoginRequiredModal from "@/components/LoginRequiredModal";

export default function VoteButtons({
  captionId,
  isLoggedIn,
  initialUpvotes,
  initialDownvotes,
}: {
  captionId: number;
  isLoggedIn: boolean;
  initialUpvotes: number;
  initialDownvotes: number;
}) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [score, setScore] = useState(initialUpvotes - initialDownvotes);
  const [showModal, setShowModal] = useState(false);

  const vote = async (voteType: "up" | "down") => {
    if (!isLoggedIn) {
      setShowModal(true);
      return;
    }

    const isSameVote = voted === voteType;

    if (isSameVote) {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captionId, voteType, remove: true }),
      });

      if (res.ok) {
        setVoted(null);
        setScore((current) => (voteType === "up" ? current - 1 : current + 1));
      }
      return;
    }

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captionId, voteType }),
    });

    if (res.ok) {
      if (voted === "up" && voteType === "down") {
        setScore((current) => current - 2);
      } else if (voted === "down" && voteType === "up") {
        setScore((current) => current + 2);
      } else if (voted === null) {
        setScore((current) => (voteType === "up" ? current + 1 : current - 1));
      }

      setVoted(voteType);
    }
  };

  const buttonBase = "flex h-5 w-5 items-center justify-center rounded-sm text-base leading-none transition-colors duration-150";
  const inactive = "bg-transparent text-zinc-500 hover:text-zinc-200";
  const active = "bg-transparent text-yellow-400";

  return (
    <>
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={() => vote("up")}
          className={`${buttonBase} ${voted === "up" ? active : inactive}`}
          aria-label="Upvote"
        >
          ⌃
        </button>

        <div className="flex h-8 min-w-8 items-center justify-center text-lg font-bold text-white">
          {score}
        </div>

        <button
          type="button"
          onClick={() => vote("down")}
          className={`${buttonBase} ${voted === "down" ? active : inactive}`}
          aria-label="Downvote"
        >
          ⌄
        </button>
      </div>

      <LoginRequiredModal
        open={showModal}
        onClose={() => setShowModal(false)}
        message="Please log in to vote on captions. You will be redirected to the login page."
        next="/"
      />
    </>
  );
}