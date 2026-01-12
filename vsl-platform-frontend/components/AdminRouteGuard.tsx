"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Client-side route guard to:
 * 1. Restrict admin access to only /admin routes (redirect to /admin if accessing other routes)
 * 2. Restrict user access to /admin routes (redirect to /users if accessing /admin)
 *
 * This component should be used in the root layout to protect all routes
 */
export default function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, role, isGuest } = useAuthStore();

  useEffect(() => {
    // Skip check for unauthenticated users or guests
    if (!isAuthenticated || isGuest || !role) {
      return;
    }

    const userRole = role.toUpperCase();
    const isAdmin = userRole === "ADMIN";
    const isUser = userRole === "USER";
    const isAdminRoute = pathname?.startsWith("/admin");

    // Public routes that everyone can access
    const isPublicRoute =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname?.startsWith("/_next") ||
      pathname?.startsWith("/api");

    // Skip check for public routes
    if (isPublicRoute) {
      return;
    }

    // 1. Admin restriction: Admin can only access /admin routes
    //    If admin tries to access non-admin routes, redirect to /admin
    if (isAdmin && !isAdminRoute) {
      router.replace("/admin");
      return;
    }

    // 2. User restriction: User cannot access /admin routes
    //    If user tries to access /admin routes, redirect to /users (user profile page)
    if (isUser && isAdminRoute) {
      router.replace("/users");
      return;
    }
  }, [isAuthenticated, role, isGuest, pathname, router]);

  return <>{children}</>;
}
