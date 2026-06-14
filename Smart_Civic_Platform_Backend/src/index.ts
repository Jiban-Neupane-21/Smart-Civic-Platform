import "./config/env";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { getSwaggerSpec } from "./config/swagger";
import { supabaseAdmin } from "./config/supabase";
import authRoutes from "./modules/auth/routes/auth.routes";
import { createSuperadminRouter } from "./modules/superadmin/routes/superadmin.routes";
import { SuperadminController } from "./modules/superadmin/controller/superadmin.controller";
import { SuperadminService } from "./modules/superadmin/services/superadmin.services";
import { SuperadminRepository } from "./modules/superadmin/middleware/superadmin.repository";
import { createMunicipalityRouter } from "./modules/municipality/routes/municipality.routes";
import { MunicipalityController } from "./modules/municipality/controller/municipality.controller";
import { MunicipalityService } from "./modules/municipality/services/municipality.service";
import { MunicipalityRepository } from "./modules/municipality/repository/municipality.repository";
import { createDepartmentRouter } from "./modules/department/routes/department.route";
import { DepartmentController } from "./modules/department/controller/department.controller";
import { DepartmentService } from "./modules/department/services/department.service";
import { DepartmentRepository } from "./modules/department/repository/department.repository";
import { createStaffRouter } from "./modules/staff/routes/staff.routes";
import { StaffController } from "./modules/staff/controller/staff.controller";
import { StaffService } from "./modules/staff/services/staff.service";
import { StaffRepository } from "./modules/staff/repository/staff.repository";
import { createComplaintsRouter } from "./modules/complaints/routes/complaints.routes";
import { ComplaintsController } from "./modules/complaints/controller/complaint.controller";
import { ComplaintsService } from "./modules/complaints/services/complaints.service";
import { ComplaintsRepository } from "./modules/complaints/repository/complaints.repository";
import { createNotificationsRouter } from "./modules/notification/routes/notification.routes";
import { NotificationsController } from "./modules/notification/controller/notification.controller";
import { NotificationsService } from "./modules/notification/service/notification.service";
import { NotificationsRepository } from "./modules/notification/repository/notification.repository";
import citizenRoutes from "./modules/citizen/routes/citizen.routes";
import healthRoutes from "./routes/health.routes";

const app = express();
const PORT = process.env.PORT || 3000;

const superadminRouter = createSuperadminRouter(
  supabaseAdmin,
  new SuperadminController(
    new SuperadminService(new SuperadminRepository(supabaseAdmin)),
  ),
);

const municipalityRouter = createMunicipalityRouter(
  supabaseAdmin,
  new MunicipalityController(
    new MunicipalityService(new MunicipalityRepository(supabaseAdmin)),
  ),
);

const departmentRouter = createDepartmentRouter(
  supabaseAdmin,
  new DepartmentController(
    new DepartmentService(new DepartmentRepository(supabaseAdmin)),
  ),
);

const staffRouter = createStaffRouter(
  supabaseAdmin,
  new StaffController(new StaffService(new StaffRepository(supabaseAdmin))),
);

const complaintsRouter = createComplaintsRouter(
  supabaseAdmin,
  new ComplaintsController(
    new ComplaintsService(new ComplaintsRepository(supabaseAdmin)),
  ),
);

const notificationsRouter = createNotificationsRouter(
  supabaseAdmin,
  new NotificationsController(
    new NotificationsService(new NotificationsRepository(supabaseAdmin)),
  ),
);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
    ],
    credentials: true,
  }),
);
app.use(express.json());

const swaggerUiOptions: any = {
  customSiteTitle: "Smart Civic Platform API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    url: "/api/docs/swagger.json",
  },
};

app.get("/api/docs/swagger.json", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(getSwaggerSpec());
  console.log(getSwaggerSpec());
});

/**
 * Mount Swagger UI. Using the consolidated approach ensures relative paths
 * for CSS/JS assets and the OpenAPI JSON are resolved correctly.
 */
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, swaggerUiOptions),
);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get("/", (_req, res) => {
  res.json({
    message: "Smart Civic Platform API",
    docs: "/api/docs",
    health: "/health",
  });
});

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRouter);
app.use("/api/municipality", municipalityRouter);
app.use("/api/department", departmentRouter);
app.use("/api/staff", staffRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/citizen", citizenRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(status).json({ success: false, message });
});

app.listen(PORT, () => {
  const spec = getSwaggerSpec();
  const pathCount = Object.keys(spec.paths ?? {}).length;
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api/docs`);
  console.log(`Swagger paths loaded: ${pathCount}`);
});

export default app;
