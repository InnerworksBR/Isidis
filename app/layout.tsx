import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { PresenceProvider } from "@/components/providers/presence-provider";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Isidis - Tarot & Esoterismo",
  description: "Conecte-se com tarólogas qualificadas para orientação e autoconhecimento.",
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
        </PresenceProvider>
      </body>
    </html>
  );
}
