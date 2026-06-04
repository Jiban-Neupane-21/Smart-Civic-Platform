// ===============================
// 🔐 AUTH & TOKEN CONFIG
// ===============================

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',            // JWT access token
  REFRESH_TOKEN_EXPIRY_DAYS: 7,          // refresh token validity
  INVITE_TOKEN_EXPIRY_HOURS: 72,         // staff invite expiry
  PASSWORD_RESET_EXPIRY_MINUTES: 60,     // reset link expiry
};

// ===============================
//  ROLE SYSTEM
// ===============================

export const ROLES = {
  CITIZEN: 'citizen',
  STAFF: 'staff',
  DEPARTMENT_HEAD: 'department_head',
  MUNICIPALITY_HEAD: 'municipality_head',
  SUPERADMIN: 'superadmin',
} as const;

// Role hierarchy (low → high privilege)
export const ROLE_HIERARCHY = [
  ROLES.CITIZEN,
  ROLES.STAFF,
  ROLES.DEPARTMENT_HEAD,
  ROLES.MUNICIPALITY_HEAD,
  ROLES.SUPERADMIN,
] as const;

// ===============================
//  INVITATION SYSTEM
// ===============================

export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

// ===============================
// 👤 ACCOUNT STATUS
// ===============================

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE:  'inactive',   // matches DB enum: account_status('active','inactive','suspended')
} as const;

// ===============================
//  SECURITY LIMITS
// ===============================

export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME_MINUTES: 15,
  PASSWORD_MIN_LENGTH: 6,
};

// ===============================
//  RATE LIMITING
// ===============================

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,         // per IP
  AUTH_MAX_REQUESTS: 10,     // stricter for auth routes
};

// ===============================
//  SYSTEM DEFAULTS
// ===============================

export const DEFAULTS = {
  PAGINATION_LIMIT: 10,
  MAX_PAGINATION_LIMIT: 100,
};

// ===============================
//  AUDIT LOG ACTIONS
// ===============================

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  INVITE: 'invite',
  PASSWORD_RESET: 'password_reset',
  LOGIN: 'login',
  LOGOUT: 'logout',
} as const;

// ===============================
//  TYPE EXPORTS (VERY IMPORTANT)
// ===============================

export type Role = typeof ROLE_HIERARCHY[number];
export type InviteStatus = typeof INVITE_STATUS[keyof typeof INVITE_STATUS];
export type AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];
export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];