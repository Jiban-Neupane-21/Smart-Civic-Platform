import fs from "fs";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

/** Collect route files — merges cwd-based and package-relative dirs so Swagger works regardless of process.cwd(). */
function getRouteApiFiles(): string[] {
  const searchDirs = [
    path.resolve(process.cwd(), "src", "routes"),
    path.resolve(process.cwd(), "src", "modules"),
    path.resolve(process.cwd(), "dist", "routes"),
    path.resolve(process.cwd(), "dist", "modules"),
    path.resolve(__dirname, "..", "routes"),
    path.resolve(__dirname, "..", "modules"),
  ].filter((dir, i, all) => fs.existsSync(dir) && all.indexOf(dir) === i);

  const byPath = new Map<string, string>();

  function collectFiles(dir: string, rootDir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath, rootDir);
        continue;
      }
      if (!/\.(ts|js)$/.test(entry.name) || entry.name.endsWith(".d.ts"))
        continue;

      const relativeToRoot = path.relative(rootDir, fullPath);
      const base = relativeToRoot.replace(/\.(ts|js)$/, "");
      const existing = byPath.get(base);
      if (
        !existing ||
        (entry.name.endsWith(".ts") && !existing.endsWith(".ts"))
      ) {
        byPath.set(base, fullPath);
      }
    }
  }

  for (const dir of searchDirs) {
    collectFiles(dir, dir);
  }

  return [...byPath.values()].sort();
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
      "Citizen complaint portal By Jiban Neupane — superadmin → municipality → department → staff → citizen",
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
    { name: "Public API", description: "Public location cascade, grievance tracking & role invite acceptance" },
    { name: "Auth", description: "Registration, login, OTP, mobile auth, tokens, profiles" },
    { name: "Onboarding API", description: "First-login activation wizard" },
    { name: "Superadmin API", description: "Platform-wide administration" },
    { name: "Municipality API", description: "Municipality head operations & cross-department teams" },
    { name: "Department API", description: "Department head operations, queue & sign-offs" },
    { name: "Staff API", description: "Staff complaint handling, schedule & handoffs" },
    { name: "Citizen API", description: "Citizen complaints, structured address & feedback" },
    { name: "Notifications API", description: "Inbound notification feed & targeted broadcasts" },
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
      SendOtpRequest: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "+9779800000000" },
          purpose: { type: "string", enum: ["login", "register", "password_reset"], default: "login" },
        },
      },
      VerifyOtpRequest: {
        type: "object",
        required: ["phone", "otp"],
        properties: {
          phone: { type: "string", example: "+9779800000000" },
          otp: { type: "string", example: "123456" },
        },
      },
      MobileLoginRequest: {
        type: "object",
        required: ["phone", "otp"],
        properties: {
          phone: { type: "string", example: "+9779800000000" },
          otp: { type: "string", example: "123456" },
        },
      },
      RoleInviteAcceptanceRequest: {
        type: "object",
        required: ["token", "password", "full_name"],
        properties: {
          token: { type: "string" },
          password: { type: "string", minLength: 8 },
          full_name: { type: "string" },
          phone: { type: "string" },
        },
      },
      OnboardingStep1Request: {
        type: "object",
        properties: {
          password: { type: "string" },
          mfa_enabled: { type: "boolean" },
        },
      },
      OnboardingStep2Request: {
        type: "object",
        properties: {
          alternate_phone: { type: "string" },
          designation: { type: "string" },
          employee_id: { type: "string" },
        },
      },
      OnboardingStep3Request: {
        type: "object",
        required: ["identity_type", "identity_number"],
        properties: {
          identity_type: { type: "string", enum: ["citizenship", "national_id", "official_id", "staff_badge"] },
          identity_number: { type: "string" },
          identity_document_url: { type: "string" },
        },
      },
      CreateCrossDeptTeamRequest: {
        type: "object",
        required: ["team_name", "start_date", "end_date"],
        properties: {
          team_name: { type: "string" },
          description: { type: "string" },
          start_date: { type: "string", format: "date-time" },
          end_date: { type: "string", format: "date-time" },
          member_staff_ids: { type: "array", items: { type: "string", format: "uuid" } },
          leader_staff_id: { type: "string", format: "uuid" },
          is_emergency_override: { type: "boolean", default: false },
          override_reason: { type: "string" },
        },
      },
      InterveneComplaintRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["reassign", "resolve", "reject"] },
          note: { type: "string" },
        },
      },
      KycReviewRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["verified", "rejected"] },
          rejection_reason: { type: "string" },
        },
      },
      AssignComplaintToTeamRequest: {
        type: "object",
        required: ["complaint_id"],
        properties: {
          complaint_id: { type: "string", format: "uuid" },
          notes: { type: "string" },
        },
      },
      DepartmentCollaborationRequest: {
        type: "object",
        required: ["supporting_dept_id", "inspection_note"],
        properties: {
          supporting_dept_id: { type: "string", format: "uuid" },
          inspection_note: { type: "string" },
        },
      },
      DepartmentSignOffRequest: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["approved", "rejected"] },
          note: { type: "string" },
        },
      },
      TransferAssignmentRequest: {
        type: "object",
        required: ["to_staff_id", "reason"],
        properties: {
          to_staff_id: { type: "string", format: "uuid" },
          reason: { type: "string" },
          note: { type: "string" },
        },
      },
      ReturnAssignmentRequest: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string" },
          note: { type: "string" },
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
          full_address: { type: "string" },
        },
      },
      RefreshRequest: {
        type: "object",
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string" },
        },
      },
      ProvisionMunicipalityRequest: {
        type: "object",
        required: [
          "official_name",
          "official_email",
          "head_name",
          "head_email",
          "municipality_type"
        ],
        properties: {
          official_name: { type: "string" },
          official_email: { type: "string", format: "email" },
          head_name: { type: "string" },
          head_email: { type: "string", format: "email" },
          municipality_type: { type: "string", enum: ["metropolitan", "sub_metropolitan", "urban_municipality", "rural_municipality"] },
          total_wards: { type: "integer" },
          province: { type: "string" },
          district: { type: "string" }
        }
      },
      AssignRoleRequest: {
        type: "object",
        required: ["targetUserId", "newRole"],
        properties: {
          targetUserId: { type: "string", format: "uuid" },
          newRole: { type: "string", enum: ["superadmin", "municipality_head", "department_head", "staff", "citizen"] }
        }
      },
      ManageStatusRequest: {
        type: "object",
        required: ["targetUserId", "status"],
        properties: {
          targetUserId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["active", "inactive", "suspended"] }
        }
      },
      CreateUserRequest: {
        type: "object",
        required: ["email", "password", "full_name", "role"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          full_name: { type: "string" },
          role: { type: "string", enum: ["municipality_head", "department_head", "staff"] },
          municipality_id: { type: "string", format: "uuid" },
          department_id: { type: "string", format: "uuid" },
          phone: { type: "string" }
        }
      },
      ProvisionDepartmentRequest: {
        type: "object",
        required: ["department_name", "official_email", "head_name", "head_email"],
        properties: {
          department_name: { type: "string" },
          official_email: { type: "string", format: "email" },
          head_name: { type: "string" },
          head_email: { type: "string", format: "email" },
          head_profile_id: { type: "string", format: "uuid" }
        }
      },
      OnboardStaffRequest: {
        type: "object",
        required: ["profile_id", "primary_department_id", "employee_id", "expertise"],
        properties: {
          profile_id: { type: "string", format: "uuid" },
          primary_department_id: { type: "string", format: "uuid" },
          employee_id: { type: "string" },
          expertise: { type: "string" },
          contact_number: { type: "string" },
          gender: { type: "string", enum: ["male", "female", "other", "prefer_not_to_say"] }
        }
      },
      CreateTeamRequest: {
        type: "object",
        required: ["team_name", "complaint_id"],
        properties: {
          team_name: { type: "string" },
          complaint_id: { type: "string", format: "uuid" }
        }
      },
      AssignTeamMemberRequest: {
        type: "object",
        required: ["team_id", "staff_id"],
        properties: {
          team_id: { type: "string", format: "uuid" },
          staff_id: { type: "string", format: "uuid" },
          is_leader: { type: "boolean", default: false }
        }
      },
      UpdateComplaintStateRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["ongoing", "resolved", "rejected"] },
          resolution_note: { type: "string" },
          rejection_reason: { type: "string" }
        }
      },
      BroadcastNotificationRequest: {
        type: "object",
        required: ["audience_type", "title", "body"],
        properties: {
          audience_type: { type: "string", enum: ["all_departments", "all_staff", "particular_department", "particular_staff", "department_internal_staff"] },
          target_municipality_id: { type: "string", format: "uuid" },
          target_department_id: { type: "string", format: "uuid" },
          target_staff_profile_id: { type: "string", format: "uuid" },
          title: { type: "string" },
          body: { type: "string" }
        }
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
      CitizenDetails: {
        type: "object",
        description:
          "Extra citizen-specific data (only present when role = citizen)",
        properties: {
          first_name: { type: "string" },
          middle_name: { type: "string", nullable: true },
          last_name: { type: "string" },
          date_of_birth: { type: "string", format: "date", nullable: true },
          gender: {
            type: "string",
            enum: ["male", "female", "other", "prefer_not_to_say"],
            nullable: true,
          },
          home_address: {
            type: "string",
            nullable: true,
            example: "Kathmandu, Ward 5",
          },
          permanent_address: {
            type: "string",
            nullable: true,
            example: "Pokhara, Ward 3",
          },
          ward_number: { type: "string", nullable: true },
          notification_pref: {
            type: "string",
            enum: ["email", "sms", "both", "none"],
          },
        },
      },
      MeResponse: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          full_name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email" },
          phone: { type: "string", nullable: true },
          role: {
            type: "string",
            enum: [
              "superadmin",
              "municipality_head",
              "department_head",
              "staff",
              "citizen",
            ],
          },
          account_status: {
            type: "string",
            enum: ["active", "inactive", "suspended"],
          },
          municipality_id: { type: "string", format: "uuid", nullable: true },
          department_id: { type: "string", format: "uuid", nullable: true },
          citizen_details: {
            nullable: true,
            description: "Only present when role = citizen",
            allOf: [{ $ref: "#/components/schemas/CitizenDetails" }],
          },
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
