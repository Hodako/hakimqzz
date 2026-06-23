import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "../styles.css";

export const metadata: Metadata = {
  title: "HakimQzz — Inventory & Sales",
  description: "Inventory and sales management for HakimQzz.",
  authors: [{ name: "HakimQzz" }],
  icons: {
    icon: "/logo.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Dream Fashion",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a3d2e",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Hind+Siliguri:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Montserrat:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Ubuntu:wght@400;500;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="https://banglawebfonts.pages.dev/css/siyam-rupali.css" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dream Fashion" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
