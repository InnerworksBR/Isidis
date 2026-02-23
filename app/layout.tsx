import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { PresenceProvider } from "@/components/providers/presence-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";


const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Isidis - Tarot & Esoterismo",
  description: "Conecte-se com cartomantes qualificadas para orientação e autoconhecimento.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Isidis",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={cn("min-h-screen bg-background font-sans antialiased flex flex-col", manrope.variable, playfair.variable)}>
        <PresenceProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </PresenceProvider>
      </body>
    </html>
  );
}
