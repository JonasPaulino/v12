export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: 8 * 60 * 60 * 1000,
  path: "/",
});

export default getCookieOptions;
