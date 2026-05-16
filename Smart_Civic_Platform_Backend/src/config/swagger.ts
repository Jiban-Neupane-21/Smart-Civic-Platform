import fs from "fs";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

/** Collect route files — merges cwd-based and package-relative dirs so Swagger works regardless of process.cwd(). */
function getRouteApiFiles(): string[] {
  const dirs = [
    path.resolve(process.cwd(), "src", "routes"),
    path.resolve(process.cwd(), "dist", "routes"),
    path.resolve(__dirname, "..", "routes"),
  ].filter((dir, i, all) => fs.existsSync(dir) && all.indexOf(dir) === i);

  const byBase = new Map<string, string>();

  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir)) {
      if (!/\.(ts|js)$/.test(file) || file.endsWith(".d.ts")) continue;
      const fullPath = path.join(dir, file);
      const base = file.replace(/\.(ts|js)$/, "");
      const existing = byBase.get(base);
      if (!existing || (file.endsWith(".ts") && !existing.endsWith(".ts"))) {
        byBase.set(base, fullPath);
      }
    }
  }

  return [...byBase.values()].sort();
}

const routeFiles = getRouteApiFiles();

if (routeFiles.length === 0) {
  console.warn(
    "[swagger] WARNING: No route files found. API docs will be empty.",
  );
} else {
  console.log(
    `[swagger] Scanning ${routeFiles.length} route file(s):`,
    routeFiles.map((f) => path.basename(f)).join(", "),
  );
}

const swaggerDefinition: swaggerJsdoc.Options["definition"] = {
  openapi: "3.0.0",
  info: {
    title: "Smart Civic Platform API",
    version: "1.0.0",
    description:
      "Citizen complaint portal — superadmin → municipality → department → staff → citizen",
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}`,
      description: "Development",
    },
    ...(process.env.API_URL
      ? [{ url: process.env.API_URL, description: "Production" }]
      : []),
  ],
  tags: [
    { name: "Health", description: "Server health" },
    { name: "Auth", description: "Registration, login, tokens, invites" },
    { name: "Superadmin", description: "Platform-wide administration" },
    { name: "Municipality", description: "Municipality head operations" },
    { name: "Department", description: "Department head operations" },
    { name: "Staff", description: "Staff complaint handling" },
    { name: "Citizen", description: "Citizen complaints and feedback" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Success" },
          data: { type: "object", nullable: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Something went wrong" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["first_name", "last_name", "email", "password"],
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          phone: { type: "string" },
          ward_number: { type: "string" },
        },
      },
      RefreshRequest: {
        type: "object",
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string" },
        },
      },
      InviteRequest: {
        type: "object",
        required: ["target_email", "target_role"],
        properties: {
          target_email: { type: "string", format: "email" },
          target_role: {
            type: "string",
            enum: ["municipality_head", "department_head", "staff"],
          },
          department_id: { type: "string", format: "uuid" },
        },
      },
      AcceptInviteRequest: {
        type: "object",
        required: ["token", "full_name", "password"],
        properties: {
          token: { type: "string" },
          full_name: { type: "string" },
          password: { type: "string", minLength: 8 },
          phone: { type: "string" },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      SubmitComplaintRequest: {
        type: "object",
        required: ["municipality_id", "title", "description"],
        properties: {
          municipality_id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          category_id: { type: "string", format: "uuid" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          address_hint: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          is_anonymous: { type: "boolean" },
        },
      },
      SubmitFeedbackRequest: {
        type: "object",
        required: ["rating"],
        properties: {
          rating: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string" },
          is_anonymous: { type: "boolean" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};

type OpenApiSpec = {
  paths?: Record<string, unknown>;
  [key: string]: unknown;
};

let cachedSpec: OpenApiSpec | null = null;

export function getSwaggerSpec() {
  if (cachedSpec) return cachedSpec;

  const files = getRouteApiFiles();
  cachedSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis:
      files.length > 0
        ? files
        : [path.resolve(__dirname, "..", "routes", "auth.routes.ts")],
  }) as OpenApiSpec;

  const pathCount = Object.keys(cachedSpec.paths ?? {}).length;
  if (pathCount === 0) {
    console.error(
      "[swagger] ERROR: OpenAPI spec has 0 paths. Check @swagger comments in src/routes/*.ts",
    );
  }

  return cachedSpec;
}

/** @deprecated Use getSwaggerSpec() — kept for backward compatibility */
export const swaggerSpec = getSwaggerSpec();
