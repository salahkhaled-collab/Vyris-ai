import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { VyrisMark } from "@/components/ui/VyrisMark";

export const metadata: Metadata = {
  title: "تم تسجيلك",
  robots: { index: false, follow: false },
};

const next = [
  { n: "١", title: "مكانك محفوظ", body: "تم تسجيلك في القائمة. مش محتاج تعمل أي حاجة تانية." },
  { n: "٢", title: "بنفتح على دفعات صغيرة", body: "بندخّل عدد قليل كل مرة، عشان كل founder ياخد اهتمام حقيقي ومنتج شغال." },
  { n: "٣", title: "إيميل واحد لما ييجي دورك", body: "هيوصلك إيميل واحد فيه رابط الدخول. من غير أي رسائل دعائية." },
];

export default function ArabicWaitlistSuccess() {
  return (
    <div className="min-h-screen bg-ink text-ink-text">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/waitlist/ar" className="flex items-center gap-3">
          <VyrisMark size="md" />
          <span className="text-lg font-semibold">Vyris</span>
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-16">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brass text-white">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">أنت على القائمة.</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">شكراً إنك انضميت. ده اللي هيحصل بعد كده:</p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {next.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line bg-panel p-5">
              <div className="text-sm font-semibold text-brass">{s.n}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/waitlist/ar" className="mt-10 inline-block text-sm text-muted underline underline-offset-4">
          الرجوع للصفحة الرئيسية
        </Link>
      </main>
    </div>
  );
}
