"use client";

import { useState } from "react";

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
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);

  const vote = async (voteType: "up" | "down") => {
    if (!isLoggedIn) {
      alert("Log in to vote.");
      return;
    }

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captionId, voteType }),
    });

    if (res.ok) {
      if (voted === "up" && voteType === "down") {
        setUpvotes((n) => n - 1);
        setDownvotes((n) => n + 1);
      } else if (voted === "down" && voteType === "up") {
        setDownvotes((n) => n - 1);
        setUpvotes((n) => n + 1);
      } else if (voted === null) {
        voteType === "up" ? setUpvotes((n) => n + 1) : setDownvotes((n) => n + 1);
      }
      setVoted(voteType);
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <button onClick={() => vote("up")} disabled={voted === "up"} className="flex items-center gap-1">
        👍 {upvotes}
      </button>
      <button onClick={() => vote("down")} disabled={voted === "down"} className="flex items-center gap-1">
        👎 {downvotes}
      </button>
    </div>
  );
}