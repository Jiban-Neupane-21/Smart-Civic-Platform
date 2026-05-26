import "./config/env";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { getSwaggerSpec } from "./config/swagger";
import authRoutes from "./modules/auth/routes/auth.routes";
import superadminRoutes from "./modules/superadmin/routes/superadmin.routes";
import municipalityRoutes from "./modules/municipality/routes/municipality.routes";
import departmentRoutes from "./modules/department/routes/department.route";
import staffRoutes from "./modules/staff/routes/staff.routes";
import citizenRoutes from "./modules/citizen/routes/citizen.routes";
import healthRoutes from "./routes/health.routes";

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use("/api/superadmin", superadminRoutes);
app.use("/api/municipality", municipalityRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/staff", staffRoutes);
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
