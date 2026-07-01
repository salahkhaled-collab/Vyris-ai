import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { AuthProvider } from "@/lib/auth-provider";

export const metadata: Metadata = {
  title: "Vyris — AI Chief of Staff",
  description: "Your AI-powered Chief of Staff for strategic execution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <AuthProvider>
          <UserProvider>{children}</UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
