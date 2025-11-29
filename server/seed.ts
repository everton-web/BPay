import "dotenv/config";
import { db } from "./db";
import { campuses, students, charges } from "@shared/schema";

// Generate mock PIX data
function generatePixData(chargeId: string, amount: string) {
  const pixQrCode = `00020126580014br.gov.bcb.pix0136${chargeId.replace(/-/g, "").substring(0, 32)}520400005303986540${amount}5802BR5913BPay Pagamentos6009SAO PAULO62070503***6304${Math.random().toString(36).substring(7).toUpperCase()}`;

  return {
    pixQrCode,
    pixCopyPaste: pixQrCode,
    pixPaymentLink: `https://bpay.example.com/pix/${chargeId}`,
  };
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(charges);
  await db.delete(students);
  await db.delete(campuses);

  // Create campuses
  const campusesData = [
    { name: "Bonfim", city: "Salvador", neighborhood: "Bonfim" },
    { name: "Villas do Atlântico", city: "Lauro de Freitas", neighborhood: "Vilas do Atlântico" },
  ];

  const createdCampuses = await db.insert(campuses).values(campusesData).returning();
  console.log(`✅ Created ${createdCampuses.length} campuses`);

  // Create students
  const studentsData = [
    {
      name: "Ana Paula Silva",
      email: "ana.silva@email.com",
      phone: "(11) 98765-4321",
      campusId: createdCampuses[0].id,
      campusName: createdCampuses[0].name,
      monthlyFee: "899.00",
      dueDay: 10,
      status: "active",
    },
    {
      name: "Carlos Eduardo Santos",
      email: "carlos.santos@email.com",
      phone: "(21) 97654-3210",
      campusId: createdCampuses[1].id,
      campusName: createdCampuses[1].name,
      monthlyFee: "1099.00",
      dueDay: 15,
      status: "active",
    },
    {
      name: "Mariana Costa",
      email: "mariana.costa@email.com",
      phone: "(31) 96543-2109",
      campusId: createdCampuses[0].id,
      campusName: createdCampuses[0].name,
      monthlyFee: "749.00",
      dueDay: 5,
      status: "active",
    },
    {
      name: "João Pedro Oliveira",
      email: "joao.oliveira@email.com",
      phone: "(41) 95432-1098",
      campusId: createdCampuses[1].id,
      campusName: createdCampuses[1].name,
      monthlyFee: "649.00",
      dueDay: 20,
      status: "active",
    },
    {
      name: "Beatriz Almeida",
      email: "beatriz.almeida@email.com",
      phone: "(51) 94321-0987",
      campusId: createdCampuses[0].id,
      campusName: createdCampuses[0].name,
      monthlyFee: "899.00",
      dueDay: 25,
      status: "active",
    },
  ];

  const createdStudents = await db.insert(students).values(studentsData).returning();
  console.log(`✅ Created ${createdStudents.length} students`);

  // Create charges with mixed statuses
  const now = new Date();
  const chargesData = [];

  // For each student, create charges
  for (const student of createdStudents) {
    // Paid charge (last month)
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(student.dueDay);

    const paidDate = new Date(lastMonth);
    paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 3)); // Paid within 3 days

    const paidPixData = generatePixData(`paid-${student.id}`, student.monthlyFee);

    chargesData.push({
      studentId: student.id,
      studentName: student.name,
      campusName: student.campusName,
      amount: student.monthlyFee,
      dueDate: lastMonth,
      status: "paid",
      paidAt: paidDate,
      paidAmount: student.monthlyFee,
      ...paidPixData,
    });

    // Current month charge
    const currentCharge = new Date(now);
    currentCharge.setDate(student.dueDay);

    const isPast = currentCharge < now;
    const isOverdue = isPast && Math.random() > 0.5; // 50% chance of being overdue if past due

    const currentPixData = generatePixData(`current-${student.id}`, student.monthlyFee);

    chargesData.push({
      studentId: student.id,
      studentName: student.name,
      campusName: student.campusName,
      amount: student.monthlyFee,
      dueDate: currentCharge,
      status: isOverdue ? "overdue" : "pending",
      ...currentPixData,
    });
  }

  const createdCharges = await db.insert(charges).values(chargesData).returning();
  console.log(`✅ Created ${createdCharges.length} charges`);

  const paidCount = createdCharges.filter(c => c.status === "paid").length;
  const pendingCount = createdCharges.filter(c => c.status === "pending").length;
  const overdueCount = createdCharges.filter(c => c.status === "overdue").length;

  console.log(`   - ${paidCount} paid`);
  console.log(`   - ${pendingCount} pending`);
  console.log(`   - ${overdueCount} overdue`);

  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
