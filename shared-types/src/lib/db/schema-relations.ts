import { relations } from 'drizzle-orm';
import { projects, interaction_logs } from './schema';

// Drizzle relational-query metadata for the Postgres schema. Kept separate from
// the table definitions so the table layer stays a pure structural source of
// truth. Import these where `db.query.<table>.findMany({ with: ... })` style
// relational loads are needed.

export const projectsRelations = relations(projects, ({ many }) => ({
  orders: many(interaction_logs),
}));

export const interactionLogsRelations = relations(
  interaction_logs,
  ({ one }) => ({
    project: one(projects, {
      fields: [interaction_logs.project_id],
      references: [projects.id],
    }),
  }),
);
