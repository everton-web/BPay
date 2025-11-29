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
import { eq, and, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Campuses
  getCampuses(): Promise<Campus[]>;
  createCampus(campus: InsertCampus): Promise<Campus>;

  // Students
  getStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: UpdateStudent): Promise<Student | undefined>;

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
      ...pixData,
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
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // If status is paid, set payment data
    if (status === "paid") {
      if (paidAmount) {
        updateData.paidAmount = paidAmount;
      }
      if (paidAt) {
        updateData.paidAt = paidAt;
      }
    } else {
      // If status is not paid, clear payment data to prevent stale data
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

  // Dashboard Metrics
  async getDashboardMetrics(campusName?: string): Promise<DashboardMetrics> {
    // Use SQL aggregations for performance instead of loading all charges
    // Optional campus filter
    const campusFilter = campusName ? eq(charges.campusName, campusName) : undefined;

    // Execute all independent queries in parallel
    const [
      billedResult,
      receivedResult,
      pendingResult,
      overdueResult,
      todayResult,
      dailyReceiptsRaw,
      statusCounts
    ] = await Promise.all([
      // Total billed (sum of all charges)
      db
        .select({ total: sql<number>`COALESCE(SUM(CAST(${charges.amount} AS NUMERIC)), 0)` })
        .from(charges)
        .where(campusFilter),

      // Total received (sum of paid charges)
      db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(COALESCE(${charges.paidAmount}, ${charges.amount}) AS NUMERIC)), 0)`
        })
        .from(charges)
        .where(campusFilter ? and(eq(charges.status, "paid"), campusFilter) : eq(charges.status, "paid")),

      // Total pending
      db
        .select({ total: sql<number>`COALESCE(SUM(CAST(${charges.amount} AS NUMERIC)), 0)` })
        .from(charges)
        .where(campusFilter ? and(eq(charges.status, "pending"), campusFilter) : eq(charges.status, "pending")),

      // Total overdue
      db
        .select({ total: sql<number>`COALESCE(SUM(CAST(${charges.amount} AS NUMERIC)), 0)` })
        .from(charges)
        .where(campusFilter ? and(eq(charges.status, "overdue"), campusFilter) : eq(charges.status, "overdue")),

      // Payments today count
      (async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayConditions = campusFilter
          ? and(gte(charges.paidAt, today), sql`${charges.paidAt} < ${tomorrow}`, campusFilter)
          : and(gte(charges.paidAt, today), sql`${charges.paidAt} < ${tomorrow}`);

        return db
          .select({ count: sql<number>`COUNT(*)` })
          .from(charges)
          .where(todayConditions);
      })(),

      // Daily receipts for last 30 days (grouped by date)
      (async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyConditions = campusFilter
          ? and(eq(charges.status, "paid"), gte(charges.paidAt, thirtyDaysAgo), campusFilter)
          : and(eq(charges.status, "paid"), gte(charges.paidAt, thirtyDaysAgo));

        return db
          .select({
            date: sql<string>`DATE(${charges.paidAt})`,
            amount: sql<number>`COALESCE(SUM(CAST(COALESCE(${charges.paidAmount}, ${charges.amount}) AS NUMERIC)), 0)`,
          })
          .from(charges)
          .where(dailyConditions)
          .groupBy(sql`DATE(${charges.paidAt})`);
      })(),

      // Status counts for default rate
      (async () => {
        const statusQuery = db
          .select({
            status: charges.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(charges);
        return campusFilter
          ? statusQuery.where(campusFilter).groupBy(charges.status)
          : statusQuery.groupBy(charges.status);
      })()
    ]);

    const totalBilled = billedResult[0]?.total || 0;
    const totalReceived = receivedResult[0]?.total || 0;
    const totalPending = pendingResult[0]?.total || 0;
    const totalOverdue = overdueResult[0]?.total || 0;
    const paymentsToday = todayResult[0]?.count || 0;

    // Create a map of date -> amount
    const receiptsMap = new Map<string, number>();
    dailyReceiptsRaw.forEach((row) => {
      if (row.date) {
        receiptsMap.set(row.date, row.amount);
      }
    });

    // Fill in missing days with 0
    const dailyReceipts: Array<{ date: string; amount: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      dailyReceipts.push({
        date: dateStr,
        amount: receiptsMap.get(dateStr) || 0,
      });
    }

    let paidCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;

    statusCounts.forEach((row) => {
      if (row.status === "paid") paidCount = row.count;
      else if (row.status === "overdue") overdueCount = row.count;
      else if (row.status === "pending") pendingCount = row.count;
    });

    return {
      totalBilled,
      totalReceived,
      totalPending,
      totalOverdue,
      paymentsToday,
      dailyReceipts,
      defaultRate: {
        paid: paidCount,
        overdue: overdueCount,
        pending: pendingCount,
      },
    };
  }

  async getMonthlyReceipts(campusName?: string): Promise<Array<{ month: string; total: number; count: number }>> {
    // Get paid charges from last 12 months grouped by month
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const campusFilter = campusName ? eq(charges.campusName, campusName) : undefined;
    const monthlyConditions = campusFilter
      ? and(eq(charges.status, "paid"), gte(charges.paidAt, twelveMonthsAgo), campusFilter)
      : and(eq(charges.status, "paid"), gte(charges.paidAt, twelveMonthsAgo));

    const monthlyReceiptsRaw = await db
      .select({
        month: sql<string>`TO_CHAR(${charges.paidAt}, 'YYYY-MM')`,
        total: sql<number>`COALESCE(SUM(CAST(COALESCE(${charges.paidAmount}, ${charges.amount}) AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(charges)
      .where(monthlyConditions)
      .groupBy(sql`TO_CHAR(${charges.paidAt}, 'YYYY-MM')`);

    // Create a map of month -> data (convert strings to numbers)
    const receiptsMap = new Map<string, { total: number; count: number }>();
    monthlyReceiptsRaw.forEach((row) => {
      if (row.month) {
        receiptsMap.set(row.month, {
          total: Number(row.total || 0),
          count: Number(row.count || 0)
        });
      }
    });

    // Fill in missing months with 0
    const monthlyReceipts: Array<{ month: string; total: number; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const data = receiptsMap.get(monthStr) || { total: 0, count: 0 };
      monthlyReceipts.push({
        month: monthStr,
        total: data.total,
        count: data.count,
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
    // First delete all student-guardian relationships
    await db.delete(studentGuardians).where(eq(studentGuardians.guardianId, id));

    // Then delete the guardian
    const result = await db.delete(guardians).where(eq(guardians.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Student-Guardian Relationships
  async getGuardiansByStudentId(studentId: string): Promise<Array<Guardian & { relationship: string; relationshipId: string }>> {
    const results = await db
      .select({
        guardian: guardians,
        relationship: studentGuardians.relationship,
        relationshipId: studentGuardians.id,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
      .where(eq(studentGuardians.studentId, studentId));

    return results.map((r) => ({
      ...r.guardian,
      relationship: r.relationship,
      relationshipId: r.relationshipId,
    }));
  }

  async getStudentsByGuardianId(guardianId: string): Promise<Array<Student & { relationship: string; relationshipId: string }>> {
    const results = await db
      .select({
        student: students,
        relationship: studentGuardians.relationship,
        relationshipId: studentGuardians.id,
      })
      .from(studentGuardians)
      .innerJoin(students, eq(studentGuardians.studentId, students.id))
      .where(eq(studentGuardians.guardianId, guardianId));

    return results.map((r) => ({
      ...r.student,
      relationship: r.relationship,
      relationshipId: r.relationshipId,
    }));
  }

  async associateStudentGuardian(data: InsertStudentGuardian): Promise<StudentGuardian> {
    const [newRelationship] = await db
      .insert(studentGuardians)
      .values(data)
      .returning();
    return newRelationship;
  }

  async dissociateStudentGuardian(id: string): Promise<boolean> {
    const result = await db.delete(studentGuardians).where(eq(studentGuardians.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getStudentGuardianRelationship(
    studentId: string,
    guardianId: string
  ): Promise<StudentGuardian | undefined> {
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
    return settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }
}

// Export singleton instance
export const storage = new DbStorage();
