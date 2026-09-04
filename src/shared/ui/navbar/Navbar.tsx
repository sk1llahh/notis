import React from "react";
import { getAuthSession, type AuthSession } from "@/server/auth";
import { getUserStreak, type StreakStatus } from "@/modules/gamification";
import { NavbarClient } from "./NavbarClient";

export interface NavbarProps {
  session?: AuthSession | null;
  streak?: StreakStatus | null;
}

/**
 * Universal Server Component Navbar wrapper.
 * Resolves current user session and streak data on the server,
 * then passes them to the interactive NavbarClient component.
 */
export async function Navbar(props: NavbarProps = {}) {
  const session =
    props.session !== undefined ? props.session : await getAuthSession();

  let streak: StreakStatus | null = props.streak ?? null;

  if (props.streak === undefined && session?.user?.id) {
    try {
      streak = await getUserStreak(session.user.id);
    } catch {
      // Fallback gracefully in case of isolated environments
      streak = null;
    }
  }

  return <NavbarClient session={session} streak={streak} />;
}
