import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaAutoUpdater } from "@/components/pwa-auto-updater";
import "../styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hakim.qzz.io"),
  title: "Dream It pos and billing software",
  description: "Dream It pos and billing software — Automated inventory, sales, accounting, and store management system for any shop.",
  authors: [{ name: "Dream IT" }],
  icons: {
    icon: "/logo.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Dream It pos and billing software",
    description: "Dream It pos and billing software — Automated inventory, sales, accounting, and store management system for any shop.",
    images: [
      {
        url: "/og-banner.svg",
        width: 1200,
        height: 630,
        alt: "Dream It pos and billing software",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dream It pos and billing software",
    description: "Dream It pos and billing software — Automated inventory, sales, accounting, and store management system for any shop.",
    images: ["/og-banner.svg"],
  },
  appleWebApp: {
    capable: true,
    title: "Dream IT",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased site-bg text-foreground min-h-screen relative overflow-x-hidden" suppressHydrationWarning>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('hz-theme') || 'light';
                  var accent = localStorage.getItem('hz-accent') || 'mechanix';
                  var accents = {
                    mechanix: { light: '#228B22', dark: '#228B22' },
                    emerald: { light: 'oklch(0.38 0.12 155)', dark: 'oklch(0.65 0.14 155)' },
                    indigo: { light: 'oklch(0.5 0.2 264)', dark: 'oklch(0.68 0.18 264)' },
                    violet: { light: 'oklch(0.55 0.22 290)', dark: 'oklch(0.7 0.2 290)' },
                    blue: { light: 'oklch(0.5 0.18 245)', dark: 'oklch(0.68 0.16 245)' },
                    rose: { light: 'oklch(0.55 0.22 15)', dark: 'oklch(0.7 0.18 15)' }
                  };
                  var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var cfg = accents[accent] || accents.mechanix;
                  var val = isDark ? cfg.dark : cfg.light;
                  var st = document.getElementById('theme-init-style');
                  if (!st) {
                    st = document.createElement('style');
                    st.id = 'theme-init-style';
                    document.head.appendChild(st);
                  }
                  st.textContent = ':root { --primary: ' + val + '; --ring: ' + val + '; --loader-color: ' + val + '; --sidebar-primary: ' + val + '; }';
                } catch (e) {}

                // Early recovery for stale chunk load errors (deployments / cache mismatch)
                window.addEventListener('error', function(e) {
                  var m = (e && e.message) || '';
                  if (m.indexOf('ChunkLoadError') !== -1 || m.indexOf('Loading chunk') !== -1 || m.indexOf('Cannot find module') !== -1) {
                    var last = sessionStorage.getItem('last_chunk_reload');
                    var now = Date.now();
                    if (!last || (now - Number(last) > 8000)) {
                      sessionStorage.setItem('last_chunk_reload', String(now));
                      if (typeof caches !== 'undefined') {
                        caches.keys().then(function(keys) {
                          Promise.all(keys.map(function(k) { return caches.delete(k); })).then(function() {
                            window.location.reload();
                          });
                        }).catch(function() { window.location.reload(); });
                      } else {
                        window.location.reload();
                      }
                    }
                  }
                });

                // Register PWA Service Worker for phone browsers & standalone mode
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
                      reg.update().catch(function() {});
                    }).catch(function() {});
                  });
                }
              })();
            `,
          }}
        />
        <div className="content relative z-10 w-full min-h-screen">
          <Providers>
            {children}
            <PwaInstallPrompt />
            <PwaAutoUpdater />
          </Providers>
        </div>
      </body>
    </html>
  );
}
