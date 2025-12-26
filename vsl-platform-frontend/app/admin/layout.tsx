"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, role, isGuest } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to ensure state is loaded from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false);
      
      // Redirect to login if not authenticated
      if (!isAuthenticated || isGuest) {
        router.replace("/login");
        return;
      }

      // Redirect to home if not admin (case-insensitive check)
      if (!role || role.toUpperCase() !== "ADMIN") {
        router.replace("/");
        return;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, role, isGuest, router]);

  // Show loading screen while checking authentication
  if (isChecking || !isAuthenticated || isGuest || !role || role.toUpperCase() !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#050505] text-[#00ff41] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-sm tracking-wider">VERIFYING ADMIN ACCESS...</p>
        </div>
      </div>
    );
  }

  // Admin pages manage their own layout (sidebar, status bar, etc.)
  // This layout only handles authentication check
  return <>{children}</>;
}
