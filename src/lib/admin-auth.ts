// Password check for the leads dashboard. The browser shows its own sign-in
// prompt (HTTP Basic auth); any username works, the password must match
// ADMIN_PASSWORD.
export function isAuthorized(authHeader: string | null | undefined) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !authHeader?.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return false;
  }
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (password.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
