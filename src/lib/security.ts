// Security settings from CLAUDE.md. Change them here only.
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_IDLE_SECONDS = 30 * 60;
export const BCRYPT_ROUNDS = 10;
// Failed logins allowed from one internet connection (all accounts together).
export const MAX_FAILED_PER_IP = 30;
export const IP_WINDOW_MINUTES = 15;
// Accounts staff "remove" are locked until this date (no schema change needed).
export const DISABLED_UNTIL = new Date("9999-01-01T00:00:00Z");
