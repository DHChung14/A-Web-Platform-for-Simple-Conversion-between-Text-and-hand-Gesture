"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export default function UserLayout({
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

      // Redirect admin to admin panel (admin should not access user pages)
      if (role && role.toUpperCase() === "ADMIN") {
        router.replace("/admin");
        return;
      }

      // Only allow USER role
      if (!role || role.toUpperCase() !== "USER") {
        router.replace("/");
        return;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, role, isGuest, router]);

  // Show loading screen while checking authentication
  if (isChecking || !isAuthenticated || isGuest || !role || role.toUpperCase() !== "USER") {
    return (
      <div className="min-h-screen bg-[#050505] text-[#00ff41] flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-sm tracking-wider">VERIFYING USER ACCESS...</p>
        </div>
      </div>
    );
  }

  // User pages manage their own layout
  // This layout only handles authentication and role check
  return <>{children}</>;
}

