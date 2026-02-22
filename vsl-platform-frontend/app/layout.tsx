import type { Metadata } from "next";
import { Space_Mono } from "next/font/google"; // Import font từ Google
import "./globals.css";
import { Toaster } from "react-hot-toast"; // Thông báo popup
import AdminRouteGuard from "@/components/AdminRouteGuard";

// Cấu hình font - disable preload để tránh warnings
const spaceMono = Space_Mono({ 
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  variable: "--font-mono", // Biến CSS
  display: "swap", // Use font-display: swap to reduce layout shift
  preload: true, // Keep preload but Next.js will optimize it
});

export const metadata: Metadata = {
  title: "VSL Platform | Cyberpunk Edition",
  description: "Vietnamese Sign Language Translator",
  other: {
    "font-awesome": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={spaceMono.className}>
        <AdminRouteGuard>
          {children}
        </AdminRouteGuard>
        {/* Nơi hiển thị thông báo (Toast) */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#000',
              color: '#00ff41',
              border: '1px solid #00ff41',
              fontFamily: 'var(--font-mono)'
            }
          }}
        />
      </body>
    </html>
  );
}// Cache bust: 1765629378
