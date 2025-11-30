import {
  type Student,
  type InsertStudent,
  type UpdateStudent,
  type Charge,
  type InsertCharge,
  type Campus,
  type InsertCampus,
  type Guardian,
  type InsertGuardian,
  type UpdateGuardian,
  type StudentGuardian,
  type InsertStudentGuardian,
  type DashboardMetrics,
  type ChargeStatus,
  students,
  campuses,
  charges,
  guardians,
  studentGuardians,
  systemSettings,
  type SystemSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // Campuses
  getCampuses(): Promise<Campus[]>;
  createCampus(campus: InsertCampus): Promise<Campus>;

  // Students
  getStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: UpdateStudent): Promise<Student | undefined>;
  deleteStudents(ids: string[]): Promise<void>;

  // Charges
  getCharges(filters?: {
    status?: ChargeStatus | "all";
    studentName?: string;
    campusName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Charge[]>;
  getCharge(id: string): Promise<Charge | undefined>;
  createCharge(charge: InsertCharge): Promise<Charge>;
  updateChargeStatus(
    id: string,
    status: ChargeStatus,
    paidAmount?: string,
    paidAt?: Date
  ): Promise<Charge | undefined>;

  // Dashboard
  getDashboardMetrics(campusName?: string): Promise<DashboardMetrics>;
  getMonthlyReceipts(campusName?: string): Promise<Array<{ month: string; total: number; count: number }>>;

  // Guardians
  getGuardians(): Promise<Guardian[]>;
  getGuardian(id: string): Promise<Guardian | undefined>;
  getGuardianByCpf(cpf: string): Promise<Guardian | undefined>;
  createGuardian(guardian: InsertGuardian): Promise<Guardian>;
  updateGuardian(id: string, guardian: UpdateGuardian): Promise<Guardian | undefined>;
  deleteGuardian(id: string): Promise<boolean>;

  // Student-Guardian Relationships
  getGuardiansByStudentId(studentId: string): Promise<Array<Guardian & { relationship: string; relationshipId: string }>>;
  getStudentsByGuardianId(guardianId: string): Promise<Array<Student & { relationship: string; relationshipId: string }>>;
  associateStudentGuardian(data: InsertStudentGuardian): Promise<StudentGuardian>;
  dissociateStudentGuardian(id: string): Promise<boolean>;
  getStudentGuardianRelationship(studentId: string, guardianId: string): Promise<StudentGuardian | undefined>;

  // System Settings
  getSystemSettings(): Promise<Record<string, string>>;
  updateSystemSetting(key: string, value: string): Promise<SystemSetting>;
}

// Generate mock PIX data
function generatePixData(chargeId: string, amount: string) {
  const pixQrCode = `00020126580014br.gov.bcb.pix0136${chargeId.replace(/-/g, "")}520400005303986540${amount}5802BR5913BPay Pagamentos6009SAO PAULO62070503***6304${Math.random().toString(36).substring(7).toUpperCase()}`;

  const pixCopyPaste = pixQrCode;

  const pixPaymentLink = `https://bpay.example.com/pix/${chargeId}`;

  return { pixQrCode, pixCopyPaste, pixPaymentLink };
}

export class DbStorage implements IStorage {
  // Campuses
  async getCampuses(): Promise<Campus[]> {
    return await db.select().from(campuses);
  }

  async createCampus(campus: InsertCampus): Promise<Campus> {
    const [newCampus] = await db.insert(campuses).values(campus).returning();
    return newCampus;
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(students.name);
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudent(id: string, student: UpdateStudent): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    // First delete related charges
    await db.delete(charges).where(inArray(charges.studentId, ids));

    // Delete related student-guardian relationships
    await db.delete(studentGuardians).where(inArray(studentGuardians.studentId, ids));

    // Finally delete students
    await db.delete(students).where(inArray(students.id, ids));
  }

  // Charges
  async getCharges(filters?: {
    status?: ChargeStatus | "all";
    studentName?: string;
    campusName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Charge[]> {
    let query = db.select().from(charges);

    const conditions = [];

    // Filter by status
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(charges.status, filters.status));
    }

    // Filter by student name (case-insensitive partial match)
    if (filters?.studentName && filters.studentName.trim() !== "") {
      conditions.push(
        sql`LOWER(${charges.studentName}) LIKE LOWER(${"%" + filters.studentName + "%"})`
      );
    }

    // Filter by campus name (case-insensitive partial match)
    if (filters?.campusName && filters.campusName.trim() !== "") {
      conditions.push(
        sql`LOWER(${charges.campusName}) LIKE LOWER(${"%" + filters.campusName + "%"})`
      );
    }

    // Filter by date range
    if (filters?.startDate) {
      conditions.push(gte(charges.dueDate, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      conditions.push(lte(charges.dueDate, new Date(filters.endDate)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query.orderBy(charges.dueDate);
    return result;
  }

  async getCharge(id: string): Promise<Charge | undefined> {
    const [charge] = await db.select().from(charges).where(eq(charges.id, id));
    return charge;
  }

  async createCharge(charge: InsertCharge): Promise<Charge> {
    // Generate PIX data
    const pixData = generatePixData(
      Math.random().toString(36).substring(7),
      charge.amount
    );

    const chargeWithPix = {
      ...charge,
      pixQrCode: pixData.pixQrCode,
      pixCopyPaste: pixData.pixCopyPaste,
      pixPaymentLink: pixData.pixPaymentLink,
    };

    const [newCharge] = await db.insert(charges).values(chargeWithPix).returning();
    return newCharge;
  }

  async updateChargeStatus(
    id: string,
    status: ChargeStatus,
    paidAmount?: string,
    paidAt?: Date
  ): Promise<Charge | undefined> {
    const updateData: any = { status, updatedAt: new Date() };

    if (status === "paid") {
      if (paidAmount) updateData.paidAmount = paidAmount;
      if (paidAt) updateData.paidAt = paidAt;
      else updateData.paidAt = new Date();
    } else {
      // If status changed from paid to something else, clear payment info
      updateData.paidAmount = null;
      updateData.paidAt = null;
    }

    const [updatedCharge] = await db
      .update(charges)
      .set(updateData)
      .where(eq(charges.id, id))
      .returning();
    return updatedCharge;
  }

  // Dashboard
  async getDashboardMetrics(campusName?: string): Promise<DashboardMetrics> {
    const campusFilter = campusName ? eq(charges.campusName, campusName) : undefined;

    // Calculate total billed (all charges)
    const billedResult = await db
      .select({ total: sql<string>`sum(${charges.amount})` })
      .from(charges)
      .where(campusFilter);

    // Calculate total received (paid charges)
    const receivedResult = await db
      .select({ total: sql<string>`sum(${charges.paidAmount})` })
      .from(charges)
      .where(and(eq(charges.status, "paid"), campusFilter));

    // Calculate total pending
    const pendingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(charges)
      .where(and(eq(charges.status, "pending"), campusFilter));

    // Calculate total overdue
    const overdueResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(charges)
      .where(and(eq(charges.status, "overdue"), campusFilter));

    // Calculate payments today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(charges)
      .where(
        and(
          eq(charges.status, "paid"),
          gte(charges.paidAt, todayStart),
          lte(charges.paidAt, todayEnd),
          campusFilter
        )
      );

    // Get daily receipts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyReceiptsRaw = await db
      .select({
        date: sql<string>`to_char(${charges.paidAt}, 'YYYY-MM-DD')`,
        amount: sql<string>`sum(${charges.paidAmount})`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.status, "paid"),
          gte(charges.paidAt, thirtyDaysAgo),
          campusFilter
        )
      )
      .groupBy(sql`to_char(${charges.paidAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${charges.paidAt}, 'YYYY-MM-DD')`);

    const dailyReceipts = dailyReceiptsRaw.map((row) => ({
      date: row.date,
      amount: parseFloat(row.amount || "0"),
    }));

    // Get default rate stats
    const statusCounts = await db
      .select({
        status: charges.status,
        count: sql<number>`count(*)`,
      })
      .from(charges)
      .where(campusFilter)
      .groupBy(charges.status);

    const defaultRate = {
      paid: 0,
      overdue: 0,
      pending: 0,
    };

    statusCounts.forEach((row) => {
      if (row.status === "paid") defaultRate.paid = Number(row.count);
      else if (row.status === "overdue") defaultRate.overdue = Number(row.count);
      else if (row.status === "pending") defaultRate.pending = Number(row.count);
    });

    return {
      totalBilled: parseFloat(billedResult[0]?.total || "0"),
      totalReceived: parseFloat(receivedResult[0]?.total || "0"),
      totalPending: Number(pendingResult[0]?.count || 0),
      totalOverdue: Number(overdueResult[0]?.count || 0),
      paymentsToday: Number(todayResult[0]?.count || 0),
      dailyReceipts,
      defaultRate,
    };
  }

  async getMonthlyReceipts(campusName?: string): Promise<Array<{ month: string; total: number; count: number }>> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1); // Start of month

    const campusFilter = campusName ? eq(charges.campusName, campusName) : undefined;

    const monthlyConditions = [
      eq(charges.status, "paid"),
      gte(charges.paidAt, twelveMonthsAgo),
    ];

    if (campusFilter) {
      monthlyConditions.push(campusFilter);
    }

    const monthlyReceiptsRaw = await db
      .select({
        month: sql<string>`to_char(${charges.paidAt}, 'YYYY-MM')`,
        total: sql<string>`sum(${charges.paidAmount})`,
        count: sql<number>`count(*)`,
      })
      .from(charges)
      .where(and(...monthlyConditions))
      .groupBy(sql`to_char(${charges.paidAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${charges.paidAt}, 'YYYY-MM')`);

    // Fill in missing months
    const receiptsMap = new Map(monthlyReceiptsRaw.map(r => [r.month, r]));
    const monthlyReceipts = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      const data = receiptsMap.get(monthKey);
      monthlyReceipts.unshift({
        month: monthKey,
        total: parseFloat(data?.total || "0"),
        count: Number(data?.count || 0)
      });
    }

    return monthlyReceipts;
  }

  // Guardians
  async getGuardians(): Promise<Guardian[]> {
    return await db.select().from(guardians).orderBy(guardians.name);
  }

  async getGuardian(id: string): Promise<Guardian | undefined> {
    const [guardian] = await db.select().from(guardians).where(eq(guardians.id, id));
    return guardian;
  }

  async getGuardianByCpf(cpf: string): Promise<Guardian | undefined> {
    const [guardian] = await db.select().from(guardians).where(eq(guardians.cpf, cpf));
    return guardian;
  }

  async createGuardian(guardian: InsertGuardian): Promise<Guardian> {
    const [newGuardian] = await db.insert(guardians).values(guardian).returning();
    return newGuardian;
  }

  async updateGuardian(id: string, guardian: UpdateGuardian): Promise<Guardian | undefined> {
    const [updatedGuardian] = await db
      .update(guardians)
      .set(guardian)
      .where(eq(guardians.id, id))
      .returning();
    return updatedGuardian;
  }

  async deleteGuardian(id: string): Promise<boolean> {
    const result = await db.delete(guardians).where(eq(guardians.id, id)).returning();
    return result.length > 0;
  }

  // Student-Guardian Relationships
  async getGuardiansByStudentId(studentId: string): Promise<Array<Guardian & { relationship: string; relationshipId: string }>> {
    const results = await db
      .select({
        id: guardians.id,
        name: guardians.name,
        cpf: guardians.cpf,
        email: guardians.email,
        phone: guardians.phone,
        createdAt: guardians.createdAt,
        relationship: studentGuardians.relationship,
        relationshipId: studentGuardians.id,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
      .where(eq(studentGuardians.studentId, studentId));

    return results;
  }

  async getStudentsByGuardianId(guardianId: string): Promise<Array<Student & { relationship: string; relationshipId: string }>> {
    const results = await db
      .select({
        id: students.id,
        name: students.name,
        email: students.email,
        phone: students.phone,
        campusId: students.campusId,
        campusName: students.campusName,
        monthlyFee: students.monthlyFee,
        dueDay: students.dueDay,
        status: students.status,
        createdAt: students.createdAt,
        relationship: studentGuardians.relationship,
        relationshipId: studentGuardians.id,
      })
      .from(studentGuardians)
      .innerJoin(students, eq(studentGuardians.studentId, students.id))
      .where(eq(studentGuardians.guardianId, guardianId));

    return results;
  }

  async associateStudentGuardian(data: InsertStudentGuardian): Promise<StudentGuardian> {
    const [newRelationship] = await db.insert(studentGuardians).values(data).returning();
    return newRelationship;
  }

  async dissociateStudentGuardian(id: string): Promise<boolean> {
    const result = await db.delete(studentGuardians).where(eq(studentGuardians.id, id)).returning();
    return result.length > 0;
  }

  async getStudentGuardianRelationship(studentId: string, guardianId: string): Promise<StudentGuardian | undefined> {
    const [relationship] = await db
      .select()
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.studentId, studentId),
          eq(studentGuardians.guardianId, guardianId)
        )
      );
    return relationship;
  }

  // System Settings
  async getSystemSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(systemSettings);
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    // Try to update first
    const [setting] = await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.key, key))
      .returning();

    if (setting) return setting;

    // If not found, insert
    const [newSetting] = await db
      .insert(systemSettings)
      .values({ key, value })
      .returning();

    return newSetting;
  }
}

export const storage = new DbStorage();
