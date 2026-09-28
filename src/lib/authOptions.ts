import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adminSupabase } from "@/lib/supabase";

// ─── Safe Supabase wrappers ───────────────────────────────────────────────────
// These never throw — they return null on any error so auth never breaks.

async function findUserInSupabase(email: string) {
  try {
    const { data } = await adminSupabase
      .from("system_users")
      .select("role")
      .eq("email", email)
      .single();
    return data as { role: string } | null;
  } catch (err) {
    console.error("findUserInSupabase exception:", err);
    return null;
  }
}

async function countUsersInSupabase(): Promise<number | null> {
  try {
    const { count, error } = await adminSupabase
      .from("system_users")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error("countUsersInSupabase error:", error);
      return null;
    }
    return count;
  } catch (err) {
    console.error("countUsersInSupabase exception:", err);
    return null;
  }
}

async function insertUserInSupabase(user: {
  id: string;
  email: string;
  name: string;
  image: string;
  role: string;
}) {
  try {
    const { error } = await adminSupabase.from("system_users").insert(user);
    if (error) console.error("insertUserInSupabase error:", error);
  } catch (err) {
    console.error("insertUserInSupabase exception:", err);
  }
}

// ─── Local store fallback ─────────────────────────────────────────────────────
// Used when Supabase is unavailable.

async function findUserInLocalStore(email: string): Promise<{ role: string } | null> {
  try {
    // Dynamic import to keep this server-only
    const { readStore } = await import("@/lib/store");
    const store = readStore();
    const user = store.users.find((u) => u.email === email);
    return user ? { role: user.role } : null;
  } catch {
    return null;
  }
}

async function saveUserToLocalStore(user: {
  id: string;
  email: string;
  name: string;
  image: string;
  role: string;
}) {
  try {
    const { readStore, writeStore } = await import("@/lib/store");
    const store = readStore();
    const existing = store.users.find((u) => u.email === user.email);
    if (!existing) {
      store.users.push({
        ...user,
        role: user.role as "ADMIN" | "USER" | "PENDING" | "REJECTED",
        createdAt: new Date().toISOString(),
      });
      writeStore(store);
    }
  } catch {
    // ignore — read-only environments (e.g. Vercel) can't write store.json
  }
}

// ─── Auth Options ─────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dummy-secret-for-demo-purposes-only",
  providers: [
    CredentialsProvider({
      name: 'Guest',
      credentials: {},
      async authorize() {
        return {
          id: 'guest@nexusportal.demo',
          email: 'guest@nexusportal.demo',
          name: 'Guest User',
          role: 'ADMIN'
        };
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
    signOut: "/",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // ── Hard-coded admin override ─────────────────────────
      // If ADMIN_EMAIL is set and matches, always ensure they are ADMIN.
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      const isDesignatedAdmin = adminEmail && user.email.toLowerCase() === adminEmail;

      try {
        const existingInDB = await findUserInSupabase(user.email);
        const existingLocal = await findUserInLocalStore(user.email);

        if (!existingInDB && !existingLocal) {
          // Brand-new user — determine their role
          const supabaseCount = await countUsersInSupabase();
          let localCount: number | null = null;

          try {
            const { readStore } = await import("@/lib/store");
            localCount = readStore().users.length;
          } catch { /* ignore */ }

          const totalKnownUsers =
            supabaseCount !== null ? supabaseCount :
            localCount !== null ? localCount :
            1;

          const isFirstUser = totalKnownUsers === 0;
          // Designated admin email always gets ADMIN; otherwise first user wins.
          const role = (isDesignatedAdmin || isFirstUser) ? "ADMIN" : "PENDING";

          await insertUserInSupabase({
            id: user.email,
            email: user.email,
            name: user.name || "Unknown",
            image: user.image || "",
            role,
          });
          await saveUserToLocalStore({
            id: user.email,
            email: user.email,
            name: user.name || "Unknown",
            image: user.image || "",
            role,
          });
        } else if (isDesignatedAdmin && existingInDB?.role !== "ADMIN") {
          // Designated admin exists but was somehow downgraded — restore ADMIN.
          try {
            const { supabase: sb } = await import("@/lib/supabase");
            await sb.from("system_users").update({ role: "ADMIN" }).eq("email", user.email);
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error("[auth] signIn callback error:", err);
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      // ── Hard-coded admin override ─────────────────────────
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      if (adminEmail && session.user.email.toLowerCase() === adminEmail) {
        (session as unknown as Record<string, Record<string, unknown>>).user.role = "ADMIN";
        return session;
      }

      if (session.user.email.toLowerCase() === "guest@nexusportal.demo") {
        (session as unknown as Record<string, Record<string, unknown>>).user.role = "ADMIN";
        return session;
      }

      try {
        // 1. Try Supabase for role
        let dbUser = await findUserInSupabase(session.user.email);

        // 2. Fallback to local store
        if (!dbUser) {
          dbUser = await findUserInLocalStore(session.user.email);
        }

        if (dbUser) {
          (session as unknown as Record<string, Record<string, unknown>>).user.role =
            dbUser.role;
        } else {
          // Unknown user — treat as PENDING rather than giving full access
          (session as unknown as Record<string, Record<string, unknown>>).user.role =
            "PENDING";
        }
      } catch (err) {
        console.error("[auth] session callback error:", err);
        // Default to PENDING on any error to prevent unauthorized access
        (session as unknown as Record<string, Record<string, unknown>>).user.role =
          "PENDING";
      }

      return session;
    },
  },
};
