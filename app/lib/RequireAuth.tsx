"use client";

import React, { useEffect, useState } from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const logged = typeof window !== "undefined" && localStorage.getItem("loggedIn") === "1";
    if (!logged) {
      if (typeof window !== "undefined") window.location.href = "/";
    } else {
      setOk(true);
    }
  }, []);
  if (!ok) return null;
  return <>{children}</>;
}
