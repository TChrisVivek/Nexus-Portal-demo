import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { OfflineProvider } from "@/components/OfflineProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { LoginScreen, PendingScreen, BlockedScreen } from "@/components/AuthScreens";

interface SessionWithRole {
  user?: { name?: string | null; email?: string | null; image?: string | null; role?: string };
}

export const metadata: Metadata = {
  title: "CMM Grid — Electrical Inventory",
  description: "Professional inventory and project management for CMM Electricals.",
  keywords: ["CMM Electricals", "inventory", "project allocation", "electrical goods"],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" style={{ background: '#f1f5f9' }}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Critical inline CSS — fires before any stylesheet loads, eliminates FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: #f1f5f9 !important;
            color: #0f172a;
            margin: 0;
          }
          /* Hide body briefly until CSS is ready — removes flash of unstyled content */
          body { opacity: 0; transition: opacity 0.15s ease; }
        ` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            document.body.style.opacity = '1';
          });
        ` }} />
        <meta name="theme-color" content="#f1f5f9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CMM Grid" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Service Worker — register on load. skipWaiting() in sw.js handles self-updates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    // If a new SW is waiting, tell it to skip waiting and take control immediately
                    if (reg.waiting) {
                      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    reg.addEventListener('updatefound', function() {
                      var newSW = reg.installing;
                      if (newSW) {
                        newSW.addEventListener('statechange', function() {
                          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            newSW.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      }
                    });
                  }).catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#f1f5f9] text-text-primary antialiased">
        <AuthProvider session={session}>
          <ToastProvider />
          <OfflineProvider>
            {!session ? (
              <LoginScreen />
            ) : (session as SessionWithRole).user?.role === "PENDING" ? (
              <PendingScreen />
            ) : (session as SessionWithRole).user?.role === "REJECTED" ? (
              <BlockedScreen />
            ) : (
              <div className="relative flex min-h-screen">
                <Sidebar isAdmin={(session as SessionWithRole).user?.role === "ADMIN"} />
                <main className="flex-1 lg:pl-64 min-h-screen">
                  <div className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-8 pt-20 lg:pt-10">
                    {children}
                  </div>
                </main>
              </div>
            )}
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
