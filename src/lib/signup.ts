/** Pure signup input checks, shared by the API route and tests. */

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
const EMAIL_RE = /^[^\s@<>()"]+@[^\s@<>()"]+\.[^\s@<>()"]+$/;

export type SignupInput = { name: string | null; email: string; password: string };

export function parseSignupInput(body: unknown): SignupInput | { error: string; message: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const nameRaw = typeof b.name === "string" ? b.name.trim() : "";

  if (!email || !password) {
    return { error: "missing_fields", message: "Email and password are required." };
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { error: "invalid_email", message: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD) {
    return { error: "weak_password", message: `Use at least ${MIN_PASSWORD} characters for your password.` };
  }
  if (password.length > MAX_PASSWORD) {
    return { error: "invalid_password", message: "That password is too long." };
  }
  return { name: nameRaw ? nameRaw.slice(0, 100) : null, email, password };
}
