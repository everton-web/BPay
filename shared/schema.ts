import { pgTable, text, varchar, integer, timestamp, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Tabela de Sedes
export const campuses = pgTable("campuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
});

export const insertCampusSchema = createInsertSchema(campuses).omit({ id: true });
export type InsertCampus = z.infer<typeof insertCampusSchema>;
export type Campus = typeof campuses.$inferSelect;

// Tabela de Estudantes
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  campusId: varchar("campus_id").notNull(),
  campusName: text("campus_name").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  dueDay: integer("due_day").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true
}).extend({
  dueDay: z.number().min(1).max(31),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
  campusId: z.string().uuid("ID da sede inválido").optional(),
  campusName: z.string().min(1, "Nome da sede é obrigatório").optional(),
  monthlyFee: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Mensalidade deve ser um valor decimal válido (ex: 450.00)")
    .optional(),
  dueDay: z.number().min(1, "Dia de vencimento deve ser entre 1 e 31").max(31, "Dia de vencimento deve ser entre 1 e 31").optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine(
  (data) => {
    if (data.campusId && !data.campusName) return false;
    if (data.campusName && !data.campusId) return false;
    return true;
  },
  {
    message: "campusId e campusName devem ser atualizados juntos",
  }
);

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type Student = typeof students.$inferSelect;

// Status de cobrança
export type ChargeStatus = "pending" | "paid" | "overdue" | "cancelled";

// Tabela de Cobranças
export const charges = pgTable("charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  studentName: text("student_name").notNull(),
  campusName: text("campus_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  pixQrCode: text("pix_qr_code").notNull(),
  pixCopyPaste: text("pix_copy_paste").notNull(),
  pixPaymentLink: text("pix_payment_link").notNull(),
  paidAt: timestamp("paid_at"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    statusIdx: index("status_idx").on(table.status),
    campusNameIdx: index("campus_name_idx").on(table.campusName),
    studentNameIdx: index("student_name_idx").on(table.studentName),
    dueDateIdx: index("due_date_idx").on(table.dueDate),
  };
});

export const insertChargeSchema = createInsertSchema(charges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  pixQrCode: true,
  pixCopyPaste: true,
  pixPaymentLink: true,
});

export type InsertCharge = z.infer<typeof insertChargeSchema>;
export type Charge = typeof charges.$inferSelect;

// Tabela de Logs de Geração de Cobranças
export const chargeGenerationLogs = pgTable("charge_generation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executedAt: timestamp("executed_at").notNull().default(sql`now()`),
  triggerType: text("trigger_type").notNull(),
  chargesCreated: integer("charges_created").notNull(),
  targetMonth: text("target_month").notNull(),
  executedBy: text("executed_by"),
  details: text("details"),
});

export const insertChargeGenerationLogSchema = createInsertSchema(chargeGenerationLogs).omit({
  id: true,
  executedAt: true,
});

export type InsertChargeGenerationLog = z.infer<typeof insertChargeGenerationLogSchema>;
export type ChargeGenerationLog = typeof chargeGenerationLogs.$inferSelect;

// Dados do Dashboard
export interface DashboardMetrics {
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  paymentsToday: number;
  dailyReceipts: Array<{ date: string; amount: number }>;
  defaultRate: {
    paid: number;
    overdue: number;
    pending: number;
  };
}

// Filtros para cobranças
export interface ChargeFilters {
  status?: ChargeStatus | "all";
  campusName?: string;
  studentName?: string;
  startDate?: string;
  endDate?: string;
}

// Tabela de Responsáveis (Pais/Guardiões)
export const guardians = pgTable("guardians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]/g, "");
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCPF.charAt(10))) return false;
  return true;
}

export const insertGuardianSchema = createInsertSchema(guardians).omit({
  id: true,
  createdAt: true
}).extend({
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
});

export const updateGuardianSchema = z.object({
  name: z.string().optional(),
  cpf: z.string().refine(validateCPF, "CPF inválido").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
});

export type InsertGuardian = z.infer<typeof insertGuardianSchema>;
export type UpdateGuardian = z.infer<typeof updateGuardianSchema>;
export type Guardian = typeof guardians.$inferSelect;

// Tabela de Relacionamento Aluno-Responsável (N:N)
export const studentGuardians = pgTable("student_guardians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  guardianId: varchar("guardian_id").notNull(),
  relationship: text("relationship").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertStudentGuardianSchema = createInsertSchema(studentGuardians).omit({
  id: true,
  createdAt: true
});

export type InsertStudentGuardian = z.infer<typeof insertStudentGuardianSchema>;
export type StudentGuardian = typeof studentGuardians.$inferSelect;

export const insertStudentWithGuardianSchema = insertStudentSchema.extend({
  guardian: z.object({
    name: z.string().min(1, "Nome do responsável é obrigatório"),
    relationship: z.string().min(1, "Relacionamento é obrigatório"),
    cpf: z.string()
      .regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter 11 dígitos")
      .transform(cpf => cpf.replace(/\D/g, '')),
    phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
    email: z.string().email("Email inválido"),
  }).optional(),
});

export const bulkDeleteStudentsSchema = z.object({
  ids: z.array(z.string()),
});

export const strictCpfSchema = z.string().refine(validateCPF, "CPF inválido");

// Configurações do Sistema
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  updatedAt: true
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
