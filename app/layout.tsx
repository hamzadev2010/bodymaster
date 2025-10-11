import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/app/AppShell";

export const metadata: Metadata = {
  title: "BODYMASTER — Gestion de Salle de Sport",
  description: "Gestion des Clients, Coachs, Promotions, Paiements et Présence",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

