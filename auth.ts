import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Variáveis necessárias: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  session: { strategy: "jwt" },
});

export const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
