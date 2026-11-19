import type { Metadata } from "next";
import { ArabicWaitlistPage } from "@/components/marketing/ArabicWaitlistPage";

export const metadata: Metadata = {
  title: "انضم لقائمة الانتظار",
  description:
    "Vyris مدير مكتب بالذكاء الاصطناعي لأصحاب الشركات: يرتب بريدك، يكتب الردود بالعربي والإنجليزي، يفتكر وعودك، ويبعتلك كل صباح أهم حاجات اليوم.",
  alternates: { canonical: "/waitlist/ar", languages: { en: "/", ar: "/waitlist/ar" } },
};

export default function ArabicWaitlist() {
  return <ArabicWaitlistPage />;
}
