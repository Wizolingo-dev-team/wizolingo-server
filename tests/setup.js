// tests/setup.js
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_for_wizolingo_ci_pipeline";
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";
process.env.ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";
process.env.RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@send.wizofuasia.com";
process.env.RESEND_FROM_NAME =
  process.env.RESEND_FROM_NAME || "Wiz Ofuasia (Wiz Boyy)";
process.env.RESEND_TO_EMAIL =
  process.env.RESEND_TO_EMAIL || "admin@wizofuasia.com";

