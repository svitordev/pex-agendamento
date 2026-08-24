import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PEX Agendamento",
  description: "Plataforma de Agendamento para Beleza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-gray-50">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}