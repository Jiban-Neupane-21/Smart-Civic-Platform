import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Civic Platform API',
      version: process.env.APP_VERSION || '1.0.0',
      description: `
## Smart Civic Platform — Registration API

Handles the complete user registration hierarchy:

| Actor | Registered by | Endpoint |
|-------|--------------|---------|
| Municipality | Superadmin | \`POST /api/auth/register/municipality\` |
| Department | Municipality head | \`POST /api/auth/register/department\` |
| Staff | Department head or Municipality head | \`POST /api/auth/register/staff\` |
| Citizen | Self | \`POST /api/auth/register/citizen\` |

### Authentication
All protected routes require a **Bearer token** in the \`Authorization\` header.
Obtain a token via \`POST /api/auth/login\`.
      `,
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your token from the login response here',
        },
      },
      schemas: {

        // ── Generic responses ─────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data:    { type: 'object' },
          },
        },

        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Must be a valid email' },
                },
              },
            },
          },
        },

        // ── Login ─────────────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'superadmin@civic.gov',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'Admin@1234',
            },
          },
        },

        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                access_token:  { type: 'string', description: 'JWT — use this as Bearer token' },
                refresh_token: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id:              { type: 'string', format: 'uuid' },
                    full_name:       { type: 'string', example: 'Ram Bahadur' },
                    email:           { type: 'string', format: 'email' },
                    role:            {
                      type: 'string',
                      enum: ['superadmin', 'municipality_head', 'department_head', 'staff', 'citizen'],
                    },
                    municipality_id: { type: 'string', format: 'uuid', nullable: true },
                    department_id:   { type: 'string', format: 'uuid', nullable: true },
                  },
                },
              },
            },
          },
        },

        // ── Municipality registration ─────────────────────────────
        RegisterMunicipalityRequest: {
          type: 'object',
          required: ['official_name', 'login_email', 'password', 'head_full_name', 'time_zone'],
          properties: {
            official_name: {
              type: 'string',
              example: 'Kathmandu Metropolitan City',
            },
            slug: {
              type: 'string',
              example: 'kathmandu-metro',
              description: 'URL-friendly identifier (optional)',
            },
            region_state: {
              type: 'string',
              example: 'Bagmati Province',
            },
            country_code: {
              type: 'string',
              example: 'NP',
              default: 'NP',
              minLength: 2,
              maxLength: 2,
            },
            time_zone: {
              type: 'string',
              example: 'Asia/Kathmandu',
            },
            office_address: {
              type: 'string',
              example: 'Bagmati Marg, Kathmandu',
            },
            login_email: {
              type: 'string',
              format: 'email',
              example: 'head@kathmandu.gov.np',
              description: 'This becomes the municipality head login email',
            },
            support_email: {
              type: 'string',
              format: 'email',
              example: 'support@kathmandu.gov.np',
            },
            emergency_contact: {
              type: 'string',
              example: '+977-1-4211000',
            },
            website_url: {
              type: 'string',
              example: 'https://kathmandu.gov.np',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'Secure@1234',
              description: 'Min 8 chars, must include uppercase, number, and special character',
            },
            head_full_name: {
              type: 'string',
              example: 'Ram Bahadur Thapa',
            },
            head_phone: {
              type: 'string',
              example: '+977-9841000001',
            },
          },
        },

        // ── Department registration ───────────────────────────────
        RegisterDepartmentRequest: {
          type: 'object',
          required: ['dept_name', 'service_type', 'head_full_name', 'head_email', 'head_password'],
          properties: {
            dept_name: {
              type: 'string',
              example: 'Sanitation Department',
            },
            dept_code: {
              type: 'string',
              example: 'SAN',
              description: 'Short identifier code (optional)',
            },
            service_type: {
              type: 'string',
              example: 'sanitation',
              description: 'e.g. sanitation, health, roads, water',
            },
            dept_contact: {
              type: 'string',
              example: '+977-1-4200001',
            },
            dept_email: {
              type: 'string',
              format: 'email',
              example: 'sanitation@kathmandu.gov.np',
            },
            operating_budget: {
              type: 'number',
              example: 5000000,
            },
            head_full_name: {
              type: 'string',
              example: 'Sita Sharma',
            },
            head_email: {
              type: 'string',
              format: 'email',
              example: 'sita.sharma@kathmandu.gov.np',
            },
            head_password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'Dept@1234',
            },
            head_phone: {
              type: 'string',
              example: '+977-9841000002',
            },
            head_designation: {
              type: 'string',
              example: 'Head of Sanitation',
            },
          },
        },

        // ── Staff registration ────────────────────────────────────
        RegisterStaffRequest: {
          type: 'object',
          required: ['full_name', 'email', 'password', 'staff_role', 'designation'],
          properties: {
            full_name: {
              type: 'string',
              example: 'Hari Prasad Adhikari',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'hari.prasad@kathmandu.gov.np',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'Staff@1234',
            },
            phone: {
              type: 'string',
              example: '+977-9841000003',
            },
            staff_role: {
              type: 'string',
              enum: ['department_head', 'staff'],
              example: 'staff',
              description: 'department_head promotes to head; staff is a regular field worker',
            },
            designation: {
              type: 'string',
              example: 'Field Officer',
            },
            employee_id: {
              type: 'string',
              example: 'EMP-2024-001',
              description: 'HR / payroll code (optional)',
            },
            department_id: {
              type: 'string',
              format: 'uuid',
              description: 'Target department UUID. Municipality head can specify any dept in their muni; department head can only use their own dept.',
            },
            shift_start: {
              type: 'string',
              example: '09:00:00',
            },
            shift_end: {
              type: 'string',
              example: '17:00:00',
            },
            joined_date: {
              type: 'string',
              format: 'date',
              example: '2024-01-15',
            },
          },
        },

        // ── Citizen registration ──────────────────────────────────
        RegisterCitizenRequest: {
          type: 'object',
          required: ['first_name', 'last_name', 'email', 'password'],
          properties: {
            first_name: {
              type: 'string',
              example: 'Binod',
            },
            middle_name: {
              type: 'string',
              example: 'Kumar',
            },
            last_name: {
              type: 'string',
              example: 'Pokhrel',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'binod.pokhrel@gmail.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'Citizen@123',
            },
            phone: {
              type: 'string',
              example: '+977-9841000004',
            },
            municipality_id: {
              type: 'string',
              format: 'uuid',
              description: 'Which municipality this citizen belongs to (optional)',
            },
            ward_number: {
              type: 'string',
              example: '14',
            },
            home_address: {
              type: 'string',
              example: 'Thamel, Kathmandu',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              example: '1995-06-15',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other', 'prefer_not_to_say'],
              example: 'male',
            },
            notification_pref: {
              type: 'string',
              enum: ['email', 'sms', 'both', 'none'],
              default: 'email',
            },
          },
        },

      },
    },
  },

  // Where swagger-jsdoc should scan for @swagger comments
  apis: [path.join(__dirname, './routes/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);