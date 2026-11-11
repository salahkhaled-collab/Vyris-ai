// src/lib/waitlist-agents.ts
//
// The agents shown on the waitlist page. Each one is a capability that exists
// in the product today; "needs" is what the user has to connect or provide.

export const AGENT_GROUPS = ["Inbox", "Meetings", "Projects", "Automation", "Strategy"] as const;
export type AgentGroup = (typeof AGENT_GROUPS)[number];

export interface Agent {
  name: string;
  group: AgentGroup;
  does: string;
  needs: string;
}

export const AGENTS: Agent[] = [
  { name: "Inbox Sorter", group: "Inbox", does: "Reads new email and labels each one urgent, needs reply, work or low, with a one-line reason.", needs: "Your Gmail connected." },
  { name: "Reply Drafter", group: "Inbox", does: "Writes a reply for every work email waiting on you. You edit and approve before anything is sent.", needs: "Gmail connected. Notes on how you write make it sound more like you." },
  { name: "Thread Summarizer", group: "Inbox", does: "Turns a long email thread into a short summary with the key asks and deadlines.", needs: "Gmail connected." },
  { name: "Email Filer", group: "Inbox", does: "Suggests which project an email belongs to and saves it there, so the thread stays with the work.", needs: "Gmail connected and at least one project." },
  { name: "Meeting Briefer", group: "Meetings", does: "Before a meeting, tells you who is coming, what is still open with them and what to raise.", needs: "Google Calendar connected. Contacts and Gmail make the brief richer." },
  { name: "Conflict Spotter", group: "Meetings", does: "Flags meetings that overlap, so you find a double-booking before the day starts.", needs: "Google Calendar connected." },
  { name: "Focus Guard", group: "Meetings", does: "Finds free blocks in your working hours and puts focus time on your calendar in one tap.", needs: "Google Calendar connected." },
  { name: "Notes-to-Actions", group: "Meetings", does: "Turns pasted meeting notes into action items with owners and due dates.", needs: "Your meeting notes, typed or pasted." },
  { name: "Project Planner", group: "Projects", does: "Breaks a goal into a project with ordered tasks you can accept or change.", needs: "A short description of what you want done." },
  { name: "Task Delegator", group: "Projects", does: "Assigns tasks to the right teammate and keeps track of who owns what.", needs: "A team with at least one other member." },
  { name: "Attention Radar", group: "Projects", does: "Shows what needs you today: blocked tasks, overdue tasks and work due soon.", needs: "Projects with tasks and due dates." },
  { name: "Risk Scout", group: "Projects", does: "Scans your projects and goals for early warning signs and lists them as risks to review.", needs: "Active projects, tasks or objectives." },
  { name: "Blocker Chaser", group: "Automation", does: "When a task gets stuck, creates the follow-up task for you with a due date.", needs: "One rule you set once." },
  { name: "Overdue Watch", group: "Automation", does: "Emails you when a task passes its due date, once per task, so nothing slips quietly.", needs: "One rule, and tasks with due dates." },
  { name: "Morning Digest", group: "Automation", does: "Sends a daily email of what is blocked, overdue and due in the next three days.", needs: "One rule. It is sent through your own Gmail." },
  { name: "Weekly Reporter", group: "Automation", does: "Sends a Monday summary of what got done last week and what is still open.", needs: "One rule and some project activity." },
  { name: "Options Analyst", group: "Strategy", does: "Lays out the real options for a decision so you can compare them side by side.", needs: "A decision you are weighing." },
  { name: "Decision Advisor", group: "Strategy", does: "Recommends an option with its reasoning, and records what you decided and why.", needs: "A decision with its options written down." },
  { name: "Goal Tracker", group: "Strategy", does: "Works out progress on your objectives from their key results and tells you if you are behind pace.", needs: "Objectives with measurable key results." },
  { name: "Memory Keeper", group: "Strategy", does: "Remembers your clients, priorities and preferences, and uses them every time Vyris helps you.", needs: "Whatever you choose to tell it. You can see and delete it all." },
];
