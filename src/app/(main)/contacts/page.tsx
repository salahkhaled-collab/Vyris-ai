"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";
import { Plus, Trash2, Mail, Phone, Building2, X, Users, Send, Clock } from "lucide-react";

// ── Personal contact types ──────────────────────────────────────────────────

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

// ── Team types ────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface PendingInvite {
  id: string;
  email: string | null;
  createdAt: string;
  expiresAt: string;
}

type Tab = "team" | "personal";

// ── Page ──────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [tab, setTab] = useState<Tab>("team");

  return (
    <>
      <Topbar eyebrow="Intelligence" title="Contacts" />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        <div className="flex items-center gap-2 bg-panel-2 rounded-full p-1 w-fit">
          <button
            onClick={() => setTab("team")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm transition-colors",
              tab === "team" ? "bg-panel shadow-sm text-ink-text" : "text-muted hover:text-ink-text"
            )}
          >
            Team
          </button>
          <button
            onClick={() => setTab("personal")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm transition-colors",
              tab === "personal" ? "bg-panel shadow-sm text-ink-text" : "text-muted hover:text-ink-text"
            )}
          >
            Personal
          </button>
        </div>

        {tab === "team" ? <TeamTab /> : <PersonalTab />}
      </main>
    </>
  );
}

// ── Team tab: real accepted members + real pending invites ────────────────

function TeamTab() {
  const { workspaceType, setWorkspaceType } = useUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  async function loadTeamData() {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/invites"),
      ]);
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      if (!membersRes.ok) throw new Error(membersData.message ?? "Could not load team members.");
      setMembers(membersData.members ?? []);
      setHasTeam(membersData.hasTeam ?? false);
      if (invitesRes.ok) setInvites(invitesData.invites ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enableTeamWorkspace() {
    setSwitching(true);
    try {
      await setWorkspaceType("TEAM");
      await loadTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable Team workspace.");
    } finally {
      setSwitching(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not send invite.");
      setInvites((prev) => [
        { id: data.id, email: data.email, createdAt: new Date().toISOString(), expiresAt: data.expiresAt },
        ...prev,
      ]);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted py-8 text-center">Loading team...</div>;
  }

  if (workspaceType !== "TEAM" || !hasTeam) {
    return (
      <Panel className="p-10 text-center max-w-md mx-auto">
        <Users className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
        <div className="text-sm font-medium mb-1">No team workspace yet</div>
        <div className="text-xs text-muted mb-5">
          Switch to a Team workspace to invite people who work with you.
        </div>
        <button
          onClick={enableTeamWorkspace}
          disabled={switching}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-60"
        >
          {switching ? "Setting up..." : "Enable Team workspace"}
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-signal/80">{error}</div>}

      <Panel className="p-5">
        <h3 className="font-display text-lg mb-3">Invite someone</h3>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <button
            onClick={sendInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
            {inviting ? "Sending..." : "Invite"}
          </button>
        </div>
        {inviteError && <div className="text-xs text-signal/80 mt-2">{inviteError}</div>}
      </Panel>

      <div>
        <h3 className="text-xs uppercase tracking-[0.14em] text-muted mb-3">
          Members ({members.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <Panel key={m.id} className="p-5 flex items-center gap-3">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="w-10 h-10 rounded-full shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brass-soft shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{m.name ?? "Unnamed"}</div>
                <div className="text-xs text-muted truncate">{m.email}</div>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {invites.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-[0.14em] text-muted mb-3">
            Pending invites ({invites.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map((inv) => (
              <Panel key={inv.id} className="p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-panel-2 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-muted" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{inv.email ?? "Link invite"}</div>
                  <div className="text-xs text-muted">Pending</div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Personal tab: existing real Contacts feature, unchanged logic ─────────

function PersonalTab() {
  const { workspaceType } = useUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);

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
          <button onClick={() => setFilterTag(null)} className={cn("text-xs px-3 py-1.5 rounded-full", !filterTag ? "bg-brass text-white" : "bg-panel-2 text-muted")}>All</button>
          {usedTags.map((tag) => (
            <button key={tag} onClick={() => setFilterTag(tag)} className={cn("text-xs px-3 py-1.5 rounded-full", filterTag === tag ? "bg-brass text-white" : "bg-panel-2 text-muted")}>{tag}</button>
          ))}
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white">
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
            <button onClick={createContact} disabled={!form.name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50">Save contact</button>
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
