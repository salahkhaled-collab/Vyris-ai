"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";

export default function Home() {
  const router = useRouter();
  const { onboarded } = useUser();

  useEffect(() => {
    router.replace(onboarded ? "/dashboard" : "/onboarding");
  }, [onboarded, router]);

  return null;
}
