import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getValidAccessToken(): Promise<string> {
  const token = await prisma.googleToken.findFirst({ orderBy: { createdAt: "desc" } });
  if (!token) throw new Error("No Google token stored. Visit /api/auth/google to authorize.");

  if (token.expiresAt > new Date()) return token.accessToken;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Google token: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.googleToken.update({
    where: { id: token.id },
    data: { accessToken: data.access_token, expiresAt },
  });

  return data.access_token;
}
