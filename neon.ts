import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Login is handled by Auth.js in the app, not Neon Auth.
  auth: false,
  buckets: {
    // Mail scans. Private: files load only through short-lived signed URLs.
    mail: { access: "private" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (branch.name === "dev") {
      // Long-lived test branch for local development: never expires.
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
