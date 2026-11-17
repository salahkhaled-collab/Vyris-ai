import { IBM_Plex_Sans_Arabic } from "next/font/google";

// Arabic pages get an Arabic typeface and right-to-left layout. The rest of
// the site keeps its own fonts.
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
});

export default function ArabicWaitlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ar" dir="rtl" className={`${arabic.variable} ${arabic.className}`}>
      {children}
    </div>
  );
}
