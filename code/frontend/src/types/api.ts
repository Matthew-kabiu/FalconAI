// Backend response envelope — Rust-Backend-Build-Template §5.4.

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  meta?: unknown;
}

export interface ApiFailure {
  success: false;
  /** Machine-readable code, e.g. VALIDATION_ERROR. Never shown to users. */
  error: string;
  /** Backend message. Never shown to users (template rule 8). */
  message?: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
  requestId?: string;
  /** On 422 only: one entry per failing field (api/openapi.yaml → FieldIssue). */
  errors?: FieldIssue[];
}

export type IssueCode = 'required' | 'too_long' | 'out_of_range' | 'invalid_choice' | 'not_allowed';

export interface FieldIssue {
  field: string;
  code: IssueCode;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** GET /api/health → data */
export interface HealthStatus {
  status: string;
  database: string;
}

/** Roles falcon-api reads from the Clerk token's `metadata.role` claim (DESIGN.md → Authentication). */
export type UserRole = 'admin' | 'member';

/** GET /api/v1/me → data */
export interface Me {
  /** Clerk user id. */
  userId: string;
  role: UserRole;
}
