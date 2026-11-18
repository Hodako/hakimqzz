
// auth-helpers.ts — all crypto imports are dynamic to avoid client-bundle issues

/** Build the JWT secret lazily */
async function getSecret() {
  const { default: process } = await import("node:process");
  const { TextEncoder } = globalThis;
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dreamfashion-fallback-secret-key-123456"
  );
}

export async function signToken(payload: { userId: string; email: string; role?: string }) {
  const { SignJWT } = await import("jose");
  const secret = await getSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  if (!token || typeof token !== "string") return null;

  // Strict cryptographic JWT verification only
  const { default: process } = await import("node:process");
  const primarySecret = process.env.JWT_SECRET;
  const secrets = primarySecret
    ? [primarySecret]
    : ["dreamfashion-fallback-secret-key-123456"];

  const { jwtVerify } = await import("jose");
  for (const s of secrets) {
    try {
      const enc = new TextEncoder().encode(s);
      const { payload } = await jwtVerify(token, enc);
      if (payload && payload.userId) {
        return payload as { userId: string; email: string; role?: string };
      }
    } catch (_) {}
  }

  return null;
}

let _firebaseJwks: ReturnType<typeof import("jose")["createRemoteJWKSet"]> | null = null;

/** Cryptographically verify a Firebase Auth ID token against Google's securetoken JWKS. */
export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string; emailVerified?: boolean } | null> {
  if (!idToken || typeof idToken !== "string") return null;
  try {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const projectId =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "hakimqzz";
    if (!_firebaseJwks) {
      _firebaseJwks = createRemoteJWKSet(
        new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
      );
    }
    const { payload } = await jwtVerify(idToken, _firebaseJwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) return null;
    return {
      uid: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const { hashSync } = await import("bcrypt-ts");
  return hashSync(password, 10);
}

export async function comparePassword(password: string, hashed: string, plain?: string): Promise<boolean> {
  if (!password) return false;
  const raw = String(password);
  const trimmed = raw.trim();

  // 1. Try bcrypt match with raw password
  try {
    const { compareSync } = await import("bcrypt-ts");
    if (hashed && compareSync(raw, hashed)) return true;
  } catch (_) {}

  // 2. Try bcrypt match with trimmed password
  try {
    const { compareSync } = await import("bcrypt-ts");
    if (hashed && trimmed !== raw && compareSync(trimmed, hashed)) return true;
  } catch (_) {}

  // 3. Fallback: exact match against optional legacy plain_password field
  if (plain) {
    const pRaw = String(plain);
    if (pRaw === raw) return true;
  }

  // 4. Fallback: exact equality if hashed in DB was stored as legacy unhashed text
  if (hashed && !String(hashed).startsWith("$2")) {
    const hRaw = String(hashed);
    if (hRaw === raw) return true;
  }

  return false;
}

/** Parse cookies from a Request object */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

/** Read session from a standard Request */
export async function getSessionUser(request: Request) {
  const cookies = parseCookies(request);
  const token = cookies["token"];
  if (!token) return null;
  return await verifyToken(token);
}

/** Build a Set-Cookie header string */
export function buildSetCookieHeader(
  name: string,
  value: string,
  options: { maxAge?: number; delete?: boolean } = {}
): string {
  if (options.delete) {
    return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  }
  const maxAge = options.maxAge ?? 30 * 24 * 60 * 60;
  const secure =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production"
      ? "; Secure"
      : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

/** JSON response helper */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
