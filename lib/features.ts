/**
 * Turn on once custom SMTP is set up in Supabase (Authentication → Emails →
 * SMTP Settings). Without it, Supabase only emails members of the Supabase
 * organization, so staff would never receive the reset link.
 */
export const PASSWORD_RESET_EMAIL_ENABLED = false;
