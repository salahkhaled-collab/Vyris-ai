"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  Search,
  X,
  Plus,
  Upload,
  User,
  Building2,
  Trash2,
  ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  photo: string | null; // base64 or null
  status: "online" | "away" | "offline";
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED: Member[] = [
  { id: "m1", name: "Maya Chen",       role: "Head of Product",    department: "Product",     email: "maya@vyris.app",   phone: "+1 (415) 555-0182", photo: null, status: "online"  },
  { id: "m2", name: "David Okafor",    role: "VP Engineering",     department: "Engineering", email: "david@vyris.app",  phone: "+1 (212) 555-0347", photo: null, status: "online"  },
  { id: "m3", name: "Priya Nair",      role: "Head of Marketing",  department: "Marketing",   email: "priya@vyris.app",  phone: "+44 20 7946 0821",  photo: null, status: "away"    },
  { id: "m4", name: "Tom Reyes",       role: "Finance Lead",       department: "Finance",     email: "tom@vyris.app",    phone: "+1 (312) 555-0593", photo: null, status: "offline" },
  { id: "m5", name: "Sarah Klein",     role: "Operations Manager", department: "Operations",  email: "sarah@vyris.app",  phone: "+1 (650) 555-0274", photo: null, status: "online"  },
  { id: "m6", name: "James Whitfield", role: "General Counsel",    department: "Legal",       email: "james@vyris.app",  phone: "+1 (202) 555-0461", photo: null, status: "online"  },
  { id: "m7", name: "Aisha Oduya",     role: "Chief of Staff",     department: "Executive",   email: "aisha@vyris.app",  phone: "+1 (415) 555-0739", photo: null, status: "away"    },
  { id: "m8", name: "Leo Martínez",    role: "Head of Design",     department: "Design",      email: "leo@vyris.app",    phone: "+34 91 555 0126",   photo: null, status: "online"  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

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
  Executive:   "bg-[#C9A66B]/10 text-[#C9A66B]",
  Design:      "bg-teal-500/10 text-teal-400",
};

const STATUS_DOT: Record<string, string> = {
  online:  "bg-emerald-400",
  away:    "bg-amber-400",
  offline: "bg-white/20",
};

const DEPARTMENTS = [
  "Product", "Engineering", "Marketing", "Finance",
  "Operations", "Legal", "Executive", "Design", "Sales", "HR", "Other",
];

function avatarGrad(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return AVATAR_BG[n % AVATAR_BG.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = { sm: "w-10 h-10 text-base", md: "w-14 h-14 text-xl", lg: "w-20 h-20 text-3xl", xl: "w-28 h-28 text-4xl" };
  const cls = sizeMap[size];

  if (member.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.photo}
        alt={member.name}
        className={cn(cls, "rounded-full object-cover shrink-0")}
      />
    );
  }
  return (
    <div
      className={cn(
        cls,
        "rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center font-display font-semibold",
        avatarGrad(member.id)
      )}
    >
      {initials(member.name)}
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────

function MemberCard({ member, onDelete }: { member: Member; onDelete: () => void }) {
  const deptColor = DEPT_COLOR[member.department] ?? "bg-white/5 text-white/50";

  return (
    <div className="group relative flex flex-col bg-[#161A22] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all"
        title="Remove member"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>

      {/* Card body */}
      <div className="flex flex-col items-center text-center px-6 pt-8 pb-6 gap-4">

        {/* Photo / Avatar */}
        <div className="relative">
          <Avatar member={member} size="lg" />
          {/* Status dot */}
          <span
            className={cn(
              "absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#161A22]",
              STATUS_DOT[member.status]
            )}
          />
        </div>

        {/* Name + role */}
        <div>
          <div className="font-display text-lg leading-tight">{member.name}</div>
          <div className="text-sm text-white/50 mt-0.5">{member.role}</div>
        </div>

        {/* Department chip */}
        <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium", deptColor)}>
          {member.department}
        </span>

        {/* Divider */}
        <div className="w-full border-t border-white/[0.06]" />

        {/* Contact info */}
        <div className="w-full space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>{member.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 border-t border-white/[0.06]">
        <a
          href={`mailto:${member.email}`}
          className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-white/50 hover:text-[#C9A66B] hover:bg-[#C9A66B]/[0.06] transition-all border-r border-white/[0.06]"
        >
          <Mail className="w-4 h-4" strokeWidth={1.75} />
          Email
        </a>
        <a
          href={member.phone ? `tel:${member.phone.replace(/\s/g, "")}` : "#"}
          className={cn(
            "flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all",
            member.phone
              ? "text-white/50 hover:text-emerald-400 hover:bg-emerald-400/[0.06]"
              : "text-white/20 cursor-not-allowed"
          )}
        >
          <Phone className="w-4 h-4" strokeWidth={1.75} />
          Call
        </a>
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────

const BLANK: Omit<Member, "id"> = {
  name: "", role: "", department: "Product", email: "", phone: "", photo: null, status: "online",
};

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (m: Member) => void }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Partial<Record<keyof Member, string>>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof BLANK, v: string | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  function handlePhoto(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => set("photo", e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function validate() {
    const e: Partial<Record<keyof Member, string>> = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.role.trim())  e.role  = "Role is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!validate()) return;
    onAdd({ ...form, id: `m-${Date.now()}` });
    onClose();
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const field = (label: string, key: keyof typeof BLANK, placeholder: string, type = "text") => (
    <div>
      <label className="text-[11px] uppercase tracking-[0.14em] text-white/40 block mb-1.5">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-[#1D222C] border rounded-xl px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#C9A66B] transition-all",
          errors[key] ? "border-red-500/50" : "border-white/[0.07]"
        )}
      />
      {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-[#161A22] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Operations</div>
            <h2 className="font-display text-xl mt-0.5">Add Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto scroll-thin flex-1 px-6 py-6 space-y-5">

          {/* Photo upload */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-white/40 block mb-1.5">Photo (optional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePhoto(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-6",
                dragging ? "border-[#C9A66B]/60 bg-[#C9A66B]/[0.06]" : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
              )}
            >
              {form.photo ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.photo} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                  <span className="text-xs text-white/40">Click to change</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white/30" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-white/60">Drop a photo or click to upload</div>
                    <div className="text-xs text-white/30 mt-1">JPG, PNG, WEBP — max 5 MB</div>
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }}
              />
              {form.photo && (
                <button
                  onClick={(e) => { e.stopPropagation(); set("photo", null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-red-500/50 text-white/60 hover:text-white transition-all"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-4">
            {field("Full Name", "name", "Jane Smith")}
            {field("Job Title / Role", "role", "Head of Product")}
          </div>

          {/* Department */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-white/40 block mb-1.5">Department</label>
            <div className="relative">
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="w-full appearance-none bg-[#1D222C] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A66B] transition-all"
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" strokeWidth={1.75} />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            {field("Email", "email", "jane@company.com", "email")}
            {field("Phone", "phone", "+1 (555) 000-0000", "tel")}
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-white/40 block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["online", "away", "offline"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => set("status", s)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all",
                    form.status === s
                      ? "border-[#C9A66B]/50 bg-[#C9A66B]/[0.08] text-[#C9A66B]"
                      : "border-white/[0.07] text-white/40 hover:border-white/20"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[s])} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-white/[0.07] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#C9A66B] text-[#1a140a] hover:bg-[#d4b47a] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "vyris-team-members";

function loadMembers(): Member[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED;
  } catch {
    return SEED;
  }
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMembers(loadMembers());
    setMounted(true);
  }, []);

  const save = useCallback((updated: Member[]) => {
    setMembers(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const addMember  = (m: Member)  => save([...members, m]);
  const delMember  = (id: string) => save(members.filter((m) => m.id !== id));

  const depts = useMemo(() => {
    const set = new Set(members.map((m) => m.department));
    return ["All", ...Array.from(set).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const matchQ = !q || [m.name, m.role, m.email, m.department].some((v) => v.toLowerCase().includes(q));
      const matchD = deptFilter === "All" || m.department === deptFilter;
      return matchQ && matchD;
    });
  }, [members, search, deptFilter]);

  const online  = members.filter((m) => m.status === "online").length;
  const away    = members.filter((m) => m.status === "away").length;

  if (!mounted) return null;

  return (
    <>
      <Topbar
        eyebrow="Operations"
        title="Team Members"
        statusText={`${online} online · ${away} away`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={1.75} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role, email…"
              className="w-full bg-[#161A22] border border-white/[0.07] rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#C9A66B] transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Dept pills */}
          <div className="flex gap-1.5 flex-wrap">
            {depts.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                  deptFilter === d
                    ? "bg-[#C9A66B] text-[#1a140a]"
                    : "bg-[#161A22] border border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/20"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add button */}
          <button
            onClick={() => setShowModal(true)}
            id="add-member-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#C9A66B] text-[#1a140a] hover:bg-[#d4b47a] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Member
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-5 text-xs text-white/35">
          <span className="font-mono">{String(filtered.length).padStart(2, "0")} members</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {online} online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {away} away
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4">
              <User className="w-7 h-7 text-white/20" strokeWidth={1.5} />
            </div>
            <div className="text-sm font-medium text-white/60 mb-1">
              {members.length === 0 ? "No team members yet" : "No members match your search"}
            </div>
            <div className="text-xs text-white/30 mb-6">
              {members.length === 0
                ? "Add your first team member to get started"
                : "Try adjusting your search or filter"}
            </div>
            {members.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-[#C9A66B] text-[#1a140a] hover:bg-[#d4b47a] transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Add First Member
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} onDelete={() => delMember(m.id)} />
            ))}

            {/* Ghost add card */}
            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-[#C9A66B]/30 hover:bg-[#C9A66B]/[0.03] transition-all py-12 group min-h-[280px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] group-hover:bg-[#C9A66B]/[0.08] border border-white/[0.07] group-hover:border-[#C9A66B]/30 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-white/25 group-hover:text-[#C9A66B] transition-colors" strokeWidth={1.75} />
              </div>
              <span className="text-sm text-white/25 group-hover:text-[#C9A66B]/70 transition-colors">Add member</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onAdd={addMember}
        />
      )}

      {/* Dept legend bottom */}
      <div className="hidden" aria-hidden>
        <Building2 />
      </div>
    </>
  );
}
