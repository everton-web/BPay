import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertStudentSchema,
  updateStudentSchema,
  insertStudentWithGuardianSchema,
  bulkDeleteStudentsSchema,
  insertChargeSchema,
  insertGuardianSchema,
  updateGuardianSchema,
  insertStudentGuardianSchema,
} from "@shared/schema";
import { z } from "zod";
import { generateRecurringCharges, getGenerationLogs } from "./recurrence-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Campuses
  app.get("/api/campuses", async (_req, res) => {
    try {
      const campuses = await storage.getCampuses();
      res.json(campuses);
    } catch (error) {
      console.error("Error fetching campuses:", error);
      res.status(500).json({ error: "Falha ao buscar sedes" });
    }
  });

  // Students
  app.get("/api/students", async (_req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Falha ao buscar estudantes" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const validatedData = insertStudentWithGuardianSchema.parse(req.body);
      const { guardian, ...studentData } = validatedData;

      const student = await storage.createStudent(studentData);

      if (guardian) {
        // Check if guardian exists by CPF
        let guardianId: string;
        const existingGuardian = await storage.getGuardianByCpf(guardian.cpf);

        if (existingGuardian) {
          guardianId = existingGuardian.id;
        } else {
          // Create new guardian
          const { relationship, ...guardianFields } = guardian;
          const newGuardian = await storage.createGuardian(guardianFields);
          guardianId = newGuardian.id;
        }

        // Create relationship
        await storage.associateStudentGuardian({
          studentId: student.id,
          guardianId: guardianId,
          relationship: guardian.relationship,
        });
      }

      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error creating student:", error);
        res.status(500).json({ error: "Falha ao criar estudante" });
      }
    }
  });

  app.post("/api/students/bulk-delete", async (req, res) => {
    try {
      const { ids } = bulkDeleteStudentsSchema.parse(req.body);
      await storage.deleteStudents(ids);
      res.status(200).json({ success: true, message: "Estudantes excluídos com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error deleting students:", error);
        res.status(500).json({ error: "Falha ao excluir estudantes" });
      }
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStudentSchema.parse(req.body);
      const updatedStudent = await storage.updateStudent(id, validatedData);

      if (!updatedStudent) {
        res.status(404).json({ error: "Estudante não encontrado" });
        return;
      }

      res.json(updatedStudent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error updating student:", error);
        res.status(500).json({ error: "Falha ao atualizar estudante" });
      }
    }
  });

  // Charges
  app.get("/api/charges", async (req, res) => {
    try {
      const { status, studentName, campusName, startDate, endDate } = req.query;

      // Build filters object, only including defined values
      const filters: any = {};
      if (status && status !== "all") {
        filters.status = status;
      }
      if (studentName && typeof studentName === "string") {
        filters.studentName = studentName;
      }
      if (campusName && typeof campusName === "string") {
        filters.campusName = campusName;
      }
      if (startDate && typeof startDate === "string") {
        filters.startDate = startDate;
      }
      if (endDate && typeof endDate === "string") {
        filters.endDate = endDate;
      }

      const charges = await storage.getCharges(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.json(charges);
    } catch (error) {
      console.error("Error fetching charges:", error);
      res.status(500).json({ error: "Falha ao buscar cobranças" });
    }
  });

  app.post("/api/charges", async (req, res) => {
    try {
      const validatedData = insertChargeSchema.parse(req.body);
      const charge = await storage.createCharge(validatedData);
      res.status(201).json(charge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error creating charge:", error);
        res.status(500).json({ error: "Falha ao criar cobrança" });
      }
    }
  });

  // Webhook - Simulate PIX payment confirmation
  app.post("/api/webhook/payment", async (req, res) => {
    try {
      const { chargeId } = req.body;

      if (!chargeId) {
        return res.status(400).json({ error: "chargeId é obrigatório" });
      }

      const charge = await storage.getCharge(chargeId);
      if (!charge) {
        return res.status(404).json({ error: "Cobrança não encontrada" });
      }

      if (charge.status === "paid") {
        return res.status(400).json({ error: "Cobrança já paga" });
      }

      // Update charge status to paid
      const updatedCharge = await storage.updateChargeStatus(
        chargeId,
        "paid",
        charge.amount,
        new Date()
      );

      res.json({
        success: true,
        message: "Pagamento confirmado",
        charge: updatedCharge,
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Falha ao processar pagamento" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const { campusName } = req.query;
      const metrics = await storage.getDashboardMetrics(
        campusName && typeof campusName === "string" ? campusName : undefined
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Falha ao buscar métricas" });
    }
  });

  app.get("/api/dashboard/monthly-receipts", async (req, res) => {
    try {
      const { campusName } = req.query;
      const monthlyReceipts = await storage.getMonthlyReceipts(
        campusName && typeof campusName === "string" ? campusName : undefined
      );
      res.json(monthlyReceipts);
    } catch (error) {
      console.error("Error fetching monthly receipts:", error);
      res.status(500).json({ error: "Falha ao buscar recebimentos mensais" });
    }
  });

  // Export charges to CSV
  app.get("/api/charges/export", async (req, res) => {
    try {
      const { status, studentName, campusName, startDate, endDate } = req.query;

      // Build filters object to honor same filters as main charges endpoint
      const filters: any = {};
      if (status && status !== "all") {
        filters.status = status;
      }
      if (studentName && typeof studentName === "string") {
        filters.studentName = studentName;
      }
      if (campusName && typeof campusName === "string") {
        filters.campusName = campusName;
      }
      if (startDate && typeof startDate === "string") {
        filters.startDate = startDate;
      }
      if (endDate && typeof endDate === "string") {
        filters.endDate = endDate;
      }

      const charges = await storage.getCharges(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Generate CSV
      const headers = [
        "ID",
        "Estudante",
        "Sede",
        "Valor",
        "Vencimento",
        "Status",
        "Pago em",
        "Valor Pago",
      ];

      const rows = charges.map((charge) => [
        charge.id,
        charge.studentName,
        charge.campusName,
        charge.amount,
        new Date(charge.dueDate).toLocaleDateString("pt-BR"),
        charge.status === "paid"
          ? "Pago"
          : charge.status === "pending"
            ? "Em Aberto"
            : charge.status === "overdue"
              ? "Atrasado"
              : "Cancelado",
        charge.paidAt ? new Date(charge.paidAt).toLocaleDateString("pt-BR") : "-",
        charge.paidAmount || "-",
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      res.json({ csv });
    } catch (error) {
      console.error("Error exporting charges:", error);
      res.status(500).json({ error: "Falha ao exportar cobranças" });
    }
  });

  // Recurring Charges Generation
  app.post("/api/charges/generate-recurring", async (req, res) => {
    try {
      const bodySchema = z.object({
        targetMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
      });

      const { targetMonth } = bodySchema.parse(req.body);
      const result = await generateRecurringCharges(
        targetMonth,
        "manual",
        "admin"
      );

      res.json({
        success: true,
        message: `${result.chargesCreated} cobranças geradas para ${result.targetMonth}`,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error generating recurring charges:", error);
        res.status(500).json({ error: "Falha ao gerar cobranças recorrentes" });
      }
    }
  });

  // Get generation logs
  app.get("/api/generation-logs", async (_req, res) => {
    try {
      const logs = await getGenerationLogs(50);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching generation logs:", error);
      res.status(500).json({ error: "Falha ao buscar logs de geração" });
    }
  });

  // Guardians (Responsáveis)
  app.get("/api/guardians", async (_req, res) => {
    try {
      const guardians = await storage.getGuardians();
      res.json(guardians);
    } catch (error) {
      console.error("Error fetching guardians:", error);
      res.status(500).json({ error: "Falha ao buscar responsáveis" });
    }
  });

  app.get("/api/guardians/:id", async (req, res) => {
    try {
      const guardian = await storage.getGuardian(req.params.id);
      if (!guardian) {
        res.status(404).json({ error: "Responsável não encontrado" });
        return;
      }
      res.json(guardian);
    } catch (error) {
      console.error("Error fetching guardian:", error);
      res.status(500).json({ error: "Falha ao buscar responsável" });
    }
  });

  app.post("/api/guardians", async (req, res) => {
    try {
      const validatedData = insertGuardianSchema.parse(req.body);
      const guardian = await storage.createGuardian(validatedData);
      res.status(201).json(guardian);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error creating guardian:", error);
        res.status(500).json({ error: "Falha ao criar responsável" });
      }
    }
  });

  app.patch("/api/guardians/:id", async (req, res) => {
    try {
      // Validate empty payload
      if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({ error: "Pelo menos um campo deve ser fornecido para atualização" });
        return;
      }

      const validatedData = updateGuardianSchema.parse(req.body);

      // Double check that at least one field was actually provided after validation
      if (Object.keys(validatedData).length === 0) {
        res.status(400).json({ error: "Pelo menos um campo válido deve ser fornecido para atualização" });
        return;
      }

      const guardian = await storage.updateGuardian(req.params.id, validatedData);
      if (!guardian) {
        res.status(404).json({ error: "Responsável não encontrado" });
        return;
      }
      res.json(guardian);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error updating guardian:", error);
        res.status(500).json({ error: "Falha ao atualizar responsável" });
      }
    }
  });

  app.delete("/api/guardians/:id", async (req, res) => {
    try {
      const success = await storage.deleteGuardian(req.params.id);
      if (!success) {
        res.status(404).json({ error: "Responsável não encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting guardian:", error);
      res.status(500).json({ error: "Falha ao excluir responsável" });
    }
  });

  // Student-Guardian Relationships
  app.get("/api/students/:id/guardians", async (req, res) => {
    try {
      const guardians = await storage.getGuardiansByStudentId(req.params.id);
      res.json(guardians);
    } catch (error) {
      console.error("Error fetching student guardians:", error);
      res.status(500).json({ error: "Falha ao buscar responsáveis do estudante" });
    }
  });

  app.get("/api/guardians/:id/students", async (req, res) => {
    try {
      const students = await storage.getStudentsByGuardianId(req.params.id);
      res.json(students);
    } catch (error) {
      console.error("Error fetching guardian students:", error);
      res.status(500).json({ error: "Falha ao buscar estudantes do responsável" });
    }
  });

  app.post("/api/student-guardians", async (req, res) => {
    try {
      const validatedData = insertStudentGuardianSchema.parse(req.body);

      // Check if relationship already exists
      const existing = await storage.getStudentGuardianRelationship(
        validatedData.studentId,
        validatedData.guardianId
      );

      if (existing) {
        res.status(400).json({ error: "Relacionamento já existe" });
        return;
      }

      const relationship = await storage.associateStudentGuardian(validatedData);
      res.status(201).json(relationship);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error creating student-guardian relationship:", error);
        res.status(500).json({ error: "Falha ao criar relacionamento" });
      }
    }
  });

  app.delete("/api/student-guardians/:id", async (req, res) => {
    try {
      const success = await storage.dissociateStudentGuardian(req.params.id);
      if (!success) {
        res.status(404).json({ error: "Relacionamento não encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Falha ao excluir relacionamento" });
    }
  });

  // System Settings
  // System Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSystemSettings();

      // Check environment variables for Mercado Pago
      if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        settings['mercado_pago_status'] = 'active';
      } else {
        settings['mercado_pago_status'] = 'inactive';
      }

      // Check environment variables for Resend
      if (process.env.RESEND_API_KEY) {
        settings['resend_status'] = 'active';
      } else {
        settings['resend_status'] = 'inactive';
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Falha ao buscar configurações" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const schema = z.object({
        settings: z.array(z.object({
          key: z.string(),
          value: z.string()
        }))
      });

      const { settings } = schema.parse(req.body);

      const updatedSettings = [];
      for (const setting of settings) {
        const updated = await storage.updateSystemSetting(setting.key, setting.value);
        updatedSettings.push(updated);
      }

      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Erro de validação", details: error.errors });
      } else {
        console.error("Error updating settings:", error);
        res.status(500).json({ error: "Falha ao atualizar configurações" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
