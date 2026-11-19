"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Handshake, Inbox, Languages, Loader2, ShieldCheck, Sunrise } from "lucide-react";
import { VyrisMark } from "@/components/ui/VyrisMark";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// Arabic waitlist page (RTL). Same sign-up list as the English page; each
// sign-up is tagged with where it came from so the metrics show what this
// page brings in.

const DEFAULT_SOURCE = "arabic-page";

function ArabicWaitlistForm({ source }: { source: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website, source }),
      });
      if (!res.ok) {
        // The API answers in English; say it in Arabic here.
        setError(
          res.status === 400
            ? "اتأكد إن الاسم والإيميل مكتوبين صح."
            : res.status === 429
              ? "محاولات كتير ورا بعض. استنى دقيقة وجرب تاني."
              : "حصلت مشكلة وإحنا بنسجلك. جرب تاني."
        );
        setSending(false);
        return;
      }
      track("waitlist_join", { lang: "ar" });
      router.push("/waitlist/ar/success");
    } catch {
      setError("مش قادرين نوصل لـ Vyris. اتأكد من الإنترنت وجرب تاني.");
      setSending(false);
    }
  }

  const field =
    "w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-ink-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brass/40";
  const label = "mb-1.5 block text-xs font-medium text-muted";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="ar-name">الاسم</label>
          <input id="ar-name" dir="auto" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="ar-company">
            الشركة <span className="font-normal opacity-70">(اختياري)</span>
          </label>
          <input id="ar-company" dir="auto" autoComplete="organization" maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="اسم شركتك" className={field} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="ar-email">الإيميل</label>
        {/* Email addresses are left-to-right even on an Arabic page. */}
        <input id="ar-email" dir="ltr" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" className={cn(field, "text-left")} />
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brass px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        انضم لقائمة الانتظار
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
      </button>
      <p className="text-xs text-muted">
        هنبعتلك إيميل بس لما يبقى دورك. اقرأ{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          سياسة الخصوصية
        </Link>
        .
      </p>
    </form>
  );
}

const features = [
  { icon: Inbox, title: "بريد بيرتب نفسه", body: "Vyris بيقرأ الإيميلات الأول ويقسمها: عاجل، محتاج رد، شغل، أو مش مهم. وبيكتب الردود بأسلوبك." },
  { icon: Languages, title: "بالعربي زي الإنجليزي", body: "العميل كتبلك بالعربي؟ الرد بيتكتب بالعربي، وبالمصري لو هو كاتب مصري. واسأل Vyris أي حاجة بالعربي." },
  { icon: Handshake, title: "بيفتكر وعودك", body: "«هبعتهولك يوم الخميس». Vyris بيلقط الوعود من الإيميلات، وينبهك قبل ما تتأخر." },
  { icon: Sunrise, title: "ملخص كل صباح", body: "إيميل واحد الصبح فيه أهم ٣ حاجات النهارده، اجتماعاتك، ومين مستني ردك." },
  { icon: CalendarClock, title: "جاهز لكل اجتماع", body: "قبل أي اجتماع تعرف مين جاي، إيه المفتوح معاه، وإيه اللي محتاج تتكلم فيه." },
  { icon: ShieldCheck, title: "القرار في إيدك", body: "Vyris بيقترح ويكتب، وإنت اللي بتوافق. مفيش إيميل بيتبعت من غير موافقتك." },
];

const faq = [
  { q: "يعني إيه Vyris؟", a: "مدير مكتب بالذكاء الاصطناعي لأصحاب الشركات اللي بيديروا كل حاجة بنفسهم: البريد، الاجتماعات، المتابعات، والمشاريع في مكان واحد." },
  { q: "بيشتغل بالعربي فعلاً؟", a: "أيوه. بيقرأ الإيميلات العربي، وبيكتب الرد بنفس لغة الشخص اللي كتبلك، وتقدر تكلمه بالعربي في الشات. الواجهة نفسها لسه بالإنجليزي." },
  { q: "هل بيبعت إيميلات لوحده؟", a: "لأ. بيكتب الرد وإنت بتوافق على كل رد قبل ما يتبعت. وبيقرأ Gmail والـ Calendar بس لو إنت وصلتهم، وتقدر تفصلهم في أي وقت." },
  { q: "هيتكلف كام؟", a: "السعر لسه متحددش. اللي على القائمة هيعرفوا السعر قبل ما يتطلب منهم أي دفع." },
];

/** Arabic (RTL) version of the waitlist page. */
export function ArabicWaitlistPage() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setSource(q.get("utm_source") ?? q.get("ref") ?? DEFAULT_SOURCE);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-ink-text">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/waitlist/ar" className="flex items-center gap-3">
            <VyrisMark size="md" />
            <span className="text-lg font-semibold">Vyris</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/waitlist" lang="en" className="text-sm text-muted hover:text-ink-text">
              English
            </Link>
            <a href="#join" className="rounded-full bg-brass px-4 py-2 text-sm font-semibold text-white">
              انضم الآن
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div>
            <div className="text-xs font-medium text-brass">مدير مكتب بالذكاء الاصطناعي</div>
            <h1 className="mt-4 text-4xl font-bold leading-[1.3] sm:text-5xl">
              الشركات الكبيرة عندها مدير مكتب.
              <span className="mt-2 block text-brass">دلوقتي إنت كمان.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Vyris بيرتب بريدك، بيكتب الردود بالعربي والإنجليزي، بيفتكر الوعود اللي وعدتها، وبيبعتلك كل صباح أهم حاجات
              النهارده. معمول لأصحاب الشركات في مصر والخليج.
            </p>
          </div>
          <div id="join" className="scroll-mt-24 rounded-2xl border border-line bg-panel p-6 shadow-xl sm:p-8">
            <h2 className="text-xl font-semibold">احجز مكانك</h2>
            <p className="mb-5 mt-1 text-sm text-muted">بنفتح على دفعات صغيرة. سجل وهنبعتلك لما ييجي دورك.</p>
            <ArabicWaitlistForm source={source} />
          </div>
        </section>

        <section className="border-t border-line bg-panel/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">بيعمل إيه بالظبط؟</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-line bg-panel p-6">
                  <f.icon className="h-5 w-5 text-brass" strokeWidth={1.75} />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-3xl font-bold sm:text-4xl">أسئلة وإجابات</h2>
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-panel">
            {faq.map((item, i) => (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right font-medium"
                >
                  {item.q}
                  <span className="text-muted" aria-hidden>
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">جاهز تستلم وقتك تاني؟</h2>
          <a href="#join" className="mt-6 inline-block rounded-full bg-brass px-6 py-3 text-sm font-semibold text-white">
            انضم لقائمة الانتظار
          </a>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted">
          <span>© Vyris</span>
          <div className="flex gap-4">
            <Link href="/privacy">الخصوصية</Link>
            <Link href="/terms">الشروط</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
