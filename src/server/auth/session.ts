export type UserRole = "STUDENT" | "AUTHOR" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: SessionUser | null;
}

/**
 * Retrieves the current authentication session.
 *
 * TODO: Integrate with real auth provider (e.g. NextAuth.js / Supabase Auth / Clerk).
 * Currently returns a default mock session matching the seeded admin user for development.
 */
export async function getAuthSession(): Promise<AuthSession> {
  return {
    user: {
      id: "seed_admin_1",
      email: "admin@notis.local",
      role: "ADMIN",
    },
  };
}
