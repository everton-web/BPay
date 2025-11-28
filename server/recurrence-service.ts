import { db } from "./db";
import { students, charges, chargeGenerationLogs, type InsertCharge, type InsertChargeGenerationLog } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface GenerationResult {
  chargesCreated: number;
  targetMonth: string;
  details: {
    studentIds: string[];
    errors: string[];
  };
}

function generatePixData(chargeId: string, studentName: string, amount: string) {
  const qrCode = `00020126580014br.gov.bcb.pix0136${chargeId}520400005303986540${amount}5802BR5925${studentName}6009SAO PAULO62070503***6304`;
  const copyPaste = qrCode;
  const paymentLink = `https://pix.example.com/pay/${chargeId}`;
  
  return { qrCode, copyPaste, paymentLink };
}

function calculateDueDate(dueDay: number, targetYear: number, targetMonth: number): Date {
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
  const actualDay = Math.min(dueDay, lastDayOfMonth);
  return new Date(targetYear, targetMonth - 1, actualDay);
}

export async function generateRecurringCharges(
  targetMonth?: string,
  triggerType: "manual" | "automatic" = "automatic",
  executedBy: string = "system"
): Promise<GenerationResult> {
  const now = new Date();
  const year = targetMonth ? parseInt(targetMonth.split("-")[0]) : now.getFullYear();
  const month = targetMonth ? parseInt(targetMonth.split("-")[1]) : now.getMonth() + 1;
  const targetMonthStr = `${year}-${month.toString().padStart(2, "0")}`;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const activeStudents = await db
    .select()
    .from(students)
    .where(eq(students.status, "active"));

  const existingCharges = await db
    .select({ studentId: charges.studentId })
    .from(charges)
    .where(and(
      gte(charges.dueDate, startDate),
      lte(charges.dueDate, endDate)
    ));

  const existingStudentIds = new Set(existingCharges.map(c => c.studentId));
  
  const studentsNeedingCharges = activeStudents.filter(
    student => !existingStudentIds.has(student.id)
  );

  const newCharges: (typeof charges.$inferInsert)[] = [];
  const createdStudentIds: string[] = [];
  const errors: string[] = [];

  for (const student of studentsNeedingCharges) {
    try {
      const dueDate = calculateDueDate(student.dueDay, year, month);
      const amount = parseFloat(student.monthlyFee);
      const pixData = generatePixData(
        `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        student.name,
        amount.toFixed(2)
      );

      newCharges.push({
        studentId: student.id,
        studentName: student.name,
        campusName: student.campusName,
        amount: student.monthlyFee,
        dueDate: dueDate,
        status: "pending",
        pixQrCode: pixData.qrCode,
        pixCopyPaste: pixData.copyPaste,
        pixPaymentLink: pixData.paymentLink,
      });

      createdStudentIds.push(student.id);
    } catch (error) {
      errors.push(`Error processing student ${student.name} (${student.id}): ${error}`);
    }
  }

  if (newCharges.length > 0) {
    await db.insert(charges).values(newCharges);
  }

  const logEntry: InsertChargeGenerationLog = {
    triggerType,
    chargesCreated: newCharges.length,
    targetMonth: targetMonthStr,
    executedBy,
    details: JSON.stringify({
      studentIds: createdStudentIds,
      errors,
      totalActiveStudents: activeStudents.length,
      alreadyHadCharges: existingStudentIds.size,
    }),
  };

  await db.insert(chargeGenerationLogs).values(logEntry);

  return {
    chargesCreated: newCharges.length,
    targetMonth: targetMonthStr,
    details: {
      studentIds: createdStudentIds,
      errors,
    },
  };
}

export async function getGenerationLogs(limit: number = 50): Promise<any[]> {
  return await db
    .select()
    .from(chargeGenerationLogs)
    .orderBy(sql`${chargeGenerationLogs.executedAt} DESC`)
    .limit(limit);
}

export async function checkAndGenerateTodayCharges(): Promise<GenerationResult | null> {
  const now = new Date();
  const currentDay = now.getDate();

  const activeStudents = await db
    .select()
    .from(students)
    .where(and(
      eq(students.status, "active"),
      eq(students.dueDay, currentDay)
    ));

  if (activeStudents.length === 0) {
    return null;
  }

  return await generateRecurringCharges(undefined, "automatic", "system");
}
