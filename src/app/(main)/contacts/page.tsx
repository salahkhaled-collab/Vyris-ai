"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";
import {
  Plus, Trash2, Mail, Phone, Building2, X,
  Users, Upload, Search, ChevronDown, User,
} from "lucide-react";

// ── Contacts types ────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  tag: string | null;
  teamId: string | null;
}

const TAGS = ["Investor", "Press", "Client", "Partner", "Advisor", "Other"];

const tagTone: Record<string, string> = {
  Investor: "text-brass bg-brass-soft",
  Press:    "text-signal bg-signal/[0.12]",
  Client:   "text-brass bg-brass-soft",
  Partner:  "text-signal bg-signal/[0.12]",
  Advisor:  "text-muted bg-panel-2",
  Other:    "text-muted bg-panel-2",
};

const emptyForm = { name: "", email: "", phone: "", company: "", role: "", notes: "", tag: "" };

// ── Team member types ─────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  photo: string | null;
  status: "online" | "away" | "offline";
}

const SEED: Member[] = [
  { id: "m1", name: "Maya Chen",       role: "Head of Product",    department: "Product",     email: "maya@vyris.app",  phone: "+1 (415) 555-0182", photo: null, status: "online"  },
  { id: "m2", name: "David Okafor",    role: "VP Engineering",     department: "Engineering", email: "david@vyris.app", phone: "+1 (212) 555-0347", photo: null, status: "online"  },
  { id: "m3", name: "Priya Nair",      role: "Head of Marketing",  department: "Marketing",   email: "priya@vyris.app", phone: "+44 20 7946 0821",  photo: null, status: "away"    },
  { id: "m4", name: "Tom Reyes",       role: "Finance Lead",       department: "Finance",     email: "tom@vyris.app",   phone: "+1 (312) 555-0593", photo: null, status: "offline" },
  { id: "m5", name: "Sarah Klein",     role: "Operations Manager", department: "Operations",  email: "sarah@vyris.app", phone: "+1 (650) 555-0274", photo: null, status: "online"  },
  { id: "m6", name: "James Whitfield", role: "General Counsel",    department: "Legal",       email: "james@vyris.app", phone: "+1 (202) 555-0461", photo: null, status: "online"  },
  { id: "m7", name: "Aisha Oduya",     role: "Chief of Staff",     department: "Executive",   email: "aisha@vyris.app", phone: "+1 (415) 555-0739", photo: null, status: "away"    },
  { id: "m8", name: "Leo Martínez",    role: "Head of Design",     department: "Design",      email: "leo@vyris.app",   phone: "+34 91 555 0126",   photo: null, status: "online"  },
];

const DEPARTMENTS = ["Product","Engineering","Marketing","Finance","Operations","Legal","Executive","Design","Sales","HR","Other"];

const AVATAR_BG = [
  "from-violet-500/30 to-violet-600/20 text-violet-300",
  "from-sky-500/30 to-sky-600/20 text-sky-300",
  "from-pink-500/30 to-pink-600/20 text-pink-300",
  "from-emerald-500/30 to-emerald-600/20 text-emerald-300",
  "from-amber-500/30 to-amber-600/20 text-amber-300",
  "from-orange-500/30 to-orange-600/20 text-orange-300",
  "from-teal-500/30 to-teal-600/20 text-teal-300",
  "from-indigo-500/30 to-indigo-600/20 text-indigo-300",
];

const DEPT_COLOR: Record<string, string> = {
  Product:     "bg-violet-500/10 text-violet-400",
  Engineering: "bg-sky-500/10 text-sky-400",
  Marketing:   "bg-pink-500/10 text-pink-400",
  Finance:     "bg-emerald-500/10 text-emerald-400",
  Operations:  "bg-amber-500/10 text-amber-400",
  Legal:       "bg-orange-500/10 text-orange-400",
  Executive:   "bg-brass/10 text-brass",
  Design:      "bg-teal-500/10 text-teal-400",
};

const STATUS_DOT: Record<string, string> = {
  online:  "bg-emerald-400",
  away:    "bg-amber-400",
  offline: "bg-white/20",
};

function avatarGrad(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return AVATAR_BG[n % AVATAR_BG.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const MEMBER_STORAGE_KEY = "vyris-team-members";
function loadMembers(): Member[] {
  if (typeof window === "undefined") return SEED;
  try { const r = localStorage.getItem(MEMBER_STORAGE_KEY); return r ? JSON.parse(r) : SEED; }
  catch { return SEED; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "w-10 h-10 text-base", md: "w-14 h-14 text-xl", lg: "w-20 h-20 text-3xl" }[size];
  if (member.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.photo} alt={member.name} className={cn(cls, "rounded-full object-cover shrink-0")} />;
  }
  return (
    <div className={cn(cls, "rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center font-display font-semibold", avatarGrad(member.id))}>
      {initials(member.name)}
    </div>
  );
}

function MemberCard({ member, onDelete }: { member: Member; onDelete: () => void }) {
  const deptColor = DEPT_COLOR[member.department] ?? "bg-white/5 text-white/50";
  return (
    <div className="group relative flex flex-col bg-panel border border-line rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-panel-2 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-muted transition-all"
        title="Remove"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      <div className="flex flex-col items-center text-center px-6 pt-8 pb-5 gap-3">
        <div className="relative">
          <MemberAvatar member={member} size="lg" />
          <span className={cn("absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-panel", STATUS_DOT[member.status])} />
        </div>
        <div>
          <div className="font-display text-lg leading-tight">{member.name}</div>
          <div className="text-sm text-muted mt-0.5">{member.role}</div>
        </div>
        <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium", deptColor)}>{member.department}</span>
        <div className="w-full border-t border-line" />
        <div className="w-full space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-xs text-muted"><Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75}/><span className="truncate">{member.email}</span></div>
          {member.phone && <div className="flex items-center gap-2 text-xs text-muted"><Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75}/><span>{member.phone}</span></div>}
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-line mt-auto">
        <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-muted hover:text-brass hover:bg-brass-soft transition-all border-r border-line">
          <Mail className="w-4 h-4" strokeWidth={1.75} /> Email
        </a>
        <a
          href={member.phone ? `tel:${member.phone.replace(/\s/g,"")}` : "#"}
          className={cn("flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all",
            member.phone ? "text-muted hover:text-signal hover:bg-signal/[0.06]" : "text-white/20 cursor-not-allowed")}
        >
          <Phone className="w-4 h-4" strokeWidth={1.75} /> Call
        </a>
      </div>
    </div>
  );
}

const BLANK_MEMBER: Omit<Member, "id"> = { name: "", role: "", department: "Product", email: "", phone: "", photo: null, status: "online" };

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (m: Member) => void }) {
  const [form, setForm] = useState(BLANK_MEMBER);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string | null) => setForm((f) => ({ ...f, [k]: v }));

  function handlePhoto(file: File) {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = (e) => set("photo", e.target?.result as string);
    r.readAsDataURL(file);
  }
  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function submit() { if (!validate()) return; onAdd({ ...form, id: `m-${Date.now()}` }); onClose(); }
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-panel border border-line rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Operations</div>
            <h2 className="font-display text-xl mt-0.5">Add Team Member</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-panel-2 text-muted hover:text-ink-text transition-all"><X className="w-4 h-4" strokeWidth={1.75}/></button>
        </div>
        <div className="overflow-y-auto scroll-thin flex-1 px-6 py-6 space-y-5">
          {/* Photo */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">Photo (optional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePhoto(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn("relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-6",
                dragging ? "border-brass/60 bg-brass-soft" : "border-line hover:border-line/60 hover:bg-white/[0.02]")}
            >
              {form.photo ? (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.photo} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                  <span className="text-xs text-muted">Click to change</span>
                </div>
              ) : (
                <><div className="w-12 h-12 rounded-2xl bg-panel-2 flex items-center justify-center"><Upload className="w-5 h-5 text-muted" strokeWidth={1.5}/></div>
                <div className="text-center"><div className="text-sm text-muted">Drop a photo or click to upload</div><div className="text-xs text-muted/60 mt-1">JPG, PNG, WEBP</div></div></>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
              {form.photo && <button onClick={(e) => { e.stopPropagation(); set("photo", null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-panel-2 flex items-center justify-center text-muted hover:text-ink-text transition-all"><X className="w-3 h-3" strokeWidth={2}/></button>}
            </div>
          </div>
          {/* Fields */}
          <div className="grid grid-cols-2 gap-4">
            {["name","role"].map((k) => (
              <div key={k}>
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">{k === "name" ? "Full Name" : "Job Title"}</label>
                <input value={(form as Record<string,string>)[k]} onChange={(e) => set(k, e.target.value)} placeholder={k === "name" ? "Jane Smith" : "Head of Product"}
                  className={cn("w-full bg-panel-2 border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass transition-all", errors[k] ? "border-red-500/50" : "border-line")} />
                {errors[k] && <p className="text-xs text-red-400 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">Department</label>
            <div className="relative">
              <select value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full appearance-none bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brass transition-all">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" strokeWidth={1.75}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["email","phone"].map((k) => (
              <div key={k}>
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">{k === "email" ? "Email *" : "Phone"}</label>
                <input type={k} value={(form as Record<string,string>)[k]} onChange={(e) => set(k, e.target.value)} placeholder={k === "email" ? "jane@company.com" : "+1 (555) 000-0000"}
                  className={cn("w-full bg-panel-2 border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass transition-all", errors[k] ? "border-red-500/50" : "border-line")} />
                {errors[k] && <p className="text-xs text-red-400 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["online","away","offline"] as const).map((s) => (
                <button key={s} onClick={() => set("status", s)}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all",
                    form.status === s ? "border-brass/50 bg-brass-soft text-brass" : "border-line text-muted hover:border-line/60")}>
                  <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[s])} />{s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-line shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-panel-2 hover:bg-white/[0.06] text-muted hover:text-ink-text transition-all">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl text-sm font-medium bg-brass text-[#1a140a] hover:bg-brass/90 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" strokeWidth={2}/>Add Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

function ContactsTab() {
  const { workspaceType } = useUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contacts")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setFetchError(d.message ?? "Could not load contacts."); return; }
        setContacts(d.contacts ?? []);
      })
      .catch(() => setFetchError("Could not reach server."))
      .finally(() => setLoading(false));
  }, []);

  const [mutateError, setMutateError] = useState<string | null>(null);

  async function createContact() {
    if (!form.name.trim()) return;
    setMutateError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shareWithTeam }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? `Server error ${res.status}`); }
      const c = await res.json();
      setContacts((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setShareWithTeam(false);
      setCreating(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save contact.";
      setMutateError(msg);
      console.error("createContact:", err);
    }
  }

  async function deleteContact(id: string) {
    const previous = contacts;
    setContacts((p) => p.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    } catch (err) {
      setContacts(previous);
      console.error("deleteContact:", err);
    }
  }

  const filtered = filterTag ? contacts.filter((c) => c.tag === filterTag) : contacts;
  const usedTags = Array.from(new Set(contacts.map((c) => c.tag).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterTag(null)} className={cn("text-xs px-3 py-1.5 rounded-full", !filterTag ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted")}>All</button>
          {usedTags.map((tag) => (
            <button key={tag} onClick={() => setFilterTag(tag)} className={cn("text-xs px-3 py-1.5 rounded-full", filterTag === tag ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted")}>{tag}</button>
          ))}
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a]">
            <Plus className="w-4 h-4" strokeWidth={2}/> New contact
          </button>
        )}
      </div>

      {creating && (
        <Panel className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">New contact</h3>
            <button onClick={() => setCreating(false)} className="text-muted hover:text-ink-text"><X className="w-4 h-4" strokeWidth={1.75}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input autoFocus value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Name *" className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"/>
            <input value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="Company" className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"/>
            <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"/>
            <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Phone" className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"/>
            <input value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} placeholder="Role / title" className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"/>
            <select value={form.tag} onChange={(e) => setForm({...form, tag: e.target.value})} className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm text-muted focus:outline-none focus:ring-1 focus:ring-brass">
              <option value="">No tag</option>
              {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Notes..." rows={2} className="w-full mt-3 bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass resize-none"/>
          <div className="flex items-center justify-between mt-3">
            {workspaceType === "TEAM" ? (
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input type="checkbox" checked={shareWithTeam} onChange={(e) => setShareWithTeam(e.target.checked)} className="accent-brass"/> Share with team
              </label>
            ) : <span/>}
            <button onClick={createContact} disabled={!form.name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] disabled:opacity-50">Save contact</button>
          </div>
        </Panel>
      )}

      {fetchError && <div className="text-sm text-signal/80 py-4">{fetchError}</div>}
      {mutateError && <div className="text-sm text-signal/80 py-2">{mutateError}</div>}
      {loading && <div className="text-sm text-muted py-8 text-center">Loading contacts...</div>}
      {!loading && filtered.length === 0 && !creating && (
        <Panel className="p-10 text-center">
          <div className="text-sm font-medium mb-1">No contacts yet</div>
          <div className="text-xs text-muted">Track investors, press, clients, and partners outside your team here.</div>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Panel key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                {(c.role || c.company) && <div className="text-xs text-muted mt-0.5">{[c.role, c.company].filter(Boolean).join(" · ")}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.tag && <span className={cn("text-[10px] px-2 py-0.5 rounded-full", tagTone[c.tag] ?? "bg-panel-2 text-muted")}>{c.tag}</span>}
                <button onClick={() => deleteContact(c.id)} className="text-muted hover:text-signal/80"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75}/></button>
              </div>
            </div>
            <div className="space-y-1 mt-3 text-xs text-muted">
              {c.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" strokeWidth={1.75}/>{c.email}</div>}
              {c.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" strokeWidth={1.75}/>{c.phone}</div>}
              {c.teamId && <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" strokeWidth={1.75}/>Shared with team</div>}
            </div>
            {c.notes && <p className="text-xs text-ink-text/70 mt-3 leading-relaxed">{c.notes}</p>}
          </Panel>
        ))}
      </div>
    </div>
  );
}

// ── Team Members tab ──────────────────────────────────────────────────────────

function TeamMembersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMembers(loadMembers()); setMounted(true); }, []);

  const save = useCallback((updated: Member[]) => {
    setMembers(updated);
    try { localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const addMember = (m: Member) => save([...members, m]);
  const delMember = (id: string) => save(members.filter((m) => m.id !== id));

  const depts = useMemo(() => {
    const s = new Set(members.map((m) => m.department));
    return ["All", ...Array.from(s).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const mQ = !q || [m.name, m.role, m.email, m.department].some((v) => v.toLowerCase().includes(q));
      const mD = deptFilter === "All" || m.department === deptFilter;
      return mQ && mD;
    });
  }, [members, search, deptFilter]);

  const online = members.filter((m) => m.status === "online").length;
  const away   = members.filter((m) => m.status === "away").length;

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={1.75}/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role, email…"
            className="w-full bg-panel border border-line rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass transition-all"/>
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-text"><X className="w-3.5 h-3.5" strokeWidth={2}/></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {depts.map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                deptFilter === d ? "bg-brass text-[#1a140a]" : "bg-panel border border-line text-muted hover:text-ink-text hover:border-line/60")}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex-1"/>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-brass text-[#1a140a] hover:bg-brass/90 transition-all shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2}/> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-5 text-xs text-muted">
        <span className="font-mono">{String(filtered.length).padStart(2,"0")} members</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{online} online</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>{away} away</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-panel-2 border border-line flex items-center justify-center mb-4"><User className="w-7 h-7 text-muted" strokeWidth={1.5}/></div>
          <div className="text-sm font-medium text-muted mb-1">{members.length === 0 ? "No team members yet" : "No members match your search"}</div>
          {members.length === 0 && <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-brass text-[#1a140a] mt-4"><Plus className="w-4 h-4" strokeWidth={2}/>Add First Member</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
          {filtered.map((m) => <MemberCard key={m.id} member={m} onDelete={() => delMember(m.id)}/>)}
          <button onClick={() => setShowModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line hover:border-brass/30 hover:bg-brass-soft transition-all py-12 group min-h-[280px]">
            <div className="w-12 h-12 rounded-2xl bg-panel-2 group-hover:bg-brass-soft border border-line flex items-center justify-center transition-all">
              <Plus className="w-5 h-5 text-muted group-hover:text-brass transition-colors" strokeWidth={1.75}/>
            </div>
            <span className="text-sm text-muted group-hover:text-brass transition-colors">Add member</span>
          </button>
        </div>
      )}

      {showModal && <AddMemberModal onClose={() => setShowModal(false)} onAdd={addMember}/>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "contacts" | "team";

export default function ContactsPage() {
  const [tab, setTab] = useState<Tab>("contacts");

  return (
    <>
      <Topbar eyebrow="Intelligence" title="Contacts" />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-panel-2 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("contacts")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "contacts" ? "bg-panel text-ink-text shadow-sm" : "text-muted hover:text-ink-text"
            )}
          >
            <Mail className="w-4 h-4" strokeWidth={1.75} />
            Contacts
          </button>
          <button
            onClick={() => setTab("team")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === "team" ? "bg-panel text-ink-text shadow-sm" : "text-muted hover:text-ink-text"
            )}
          >
            <Users className="w-4 h-4" strokeWidth={1.75} />
            Team Members
          </button>
        </div>

        {/* Tab content */}
        {tab === "contacts" ? <ContactsTab /> : <TeamMembersTab />}
      </main>
    </>
  );
}
