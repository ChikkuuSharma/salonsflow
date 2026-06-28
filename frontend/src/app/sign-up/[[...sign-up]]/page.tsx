"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/login?role=owner&mode=register");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#070519] text-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
        <p className="text-xs text-purple-200 font-semibold uppercase tracking-wider">Redirecting to Secure Register Gateway...</p>
      </div>
    </div>
  );
}
