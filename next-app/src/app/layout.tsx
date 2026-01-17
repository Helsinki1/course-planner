import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SelectedCoursesProvider } from "@/contexts/SelectedCoursesContext";
import { SearchProvider } from "@/contexts/SearchContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lion-Cal",
  description: "Search and plan your Columbia University courses with professor ratings and schedule information",
  icons: {
    icon: [
      { url: "/crown-image.png", type: "image/png" },
    ],
    shortcut: "/crown-image.png",
    apple: "/crown-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SelectedCoursesProvider>
            <SearchProvider>{children}</SearchProvider>
          </SelectedCoursesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
