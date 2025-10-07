"use client";
import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function RenewalsRedirect() {
  useEffect(() => {
    redirect("/presence");
  }, []);
  return null;
}
