import { z } from "zod";

export const actions = {
  create_project: {
    description: "Create a new project. args: { name: string }",
    schema: z.object({ name: z.string().min(1) }),
    run: async (userId: string, args: { name: string }) => {
      // use your existing DB code here (Neon)
      const project = await db.project.create({ data: { name: args.name, userId } });
      return `Project "${project.name}" created.`;
    },
  },
  // add_task, add_event, navigate... same shape
} as const;