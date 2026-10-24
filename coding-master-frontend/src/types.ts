// ─── Tier system ─────────────────────────────────────────────────────────────

export type UserTier = "STANDARD" | "PREMIUM_PLUS" | "PLATINUM_GLOW";

// ─── Theme config embedded in UserProfile ────────────────────────────────────

export interface ThemeConfig {
  leak: string;       // e.g. "VIOLET_CYAN_LEAK" | "GOLDEN_AMBER_LEAK"
  atmosphere: string; // e.g. "HIGH_FI" | "LEGENDARY" | "STANDARD"
}

// ─── Authenticated user returned by /api/register and /api/auth/login ────────

export interface UserProfile {
  id: number;
  signup_number: number;
  username: string;
  tier_status: UserTier;
  is_premium: boolean;
  custom_theme_config: ThemeConfig;
}

// ─── Single row in the leaderboard array ─────────────────────────────────────

export interface LeaderboardUser {
  user_id: number;
  username: string;
  tier_status: UserTier;
  current_streak: number;
}

// ─── #1 ranked user with extra aura metadata ─────────────────────────────────

export interface ChampionRow extends LeaderboardUser {
  streak_count: number;   // same as current_streak, aliased for the champion card
  special_aura: string;   // e.g. "LEGENDARY GLOW" | "CHAMPS OVERLORD"
}

// ─── Sandbox / virtual workspace from POST /api/verify-license ───────────────

export interface SandboxRuntime {
  sandbox_id: string;                          // e.g. "cm-sbx-A1B2C3D4"
  kernel_status: "ACTIVE" | "IDLE" | "BOOTING";
  mount_node: string;                          // e.g. "node-username-root"
}

export interface LatencyProfile {
  actual_measured_latency: string; // e.g. "38ms"
  latency_target: string;          // "45ms"
  jitter: string;                  // e.g. "2ms"
  packet_loss: string;             // "0.00%"
}

export interface SandboxInitResponse {
  authorized: boolean;
  sandbox_runtime: SandboxRuntime;
  latency_profile: LatencyProfile;
}

// ─── Advanced presets from GET /api/dashboard/advanced-presets ───────────────

export interface AdvancedPresets {
  custom_background_ambient: string;       // e.g. "VIOLET_CYAN_LEAK"
  laser_level: string;                     // e.g. "TIER_7_ULTRAVIOLET"
  performance_co2_threadpool_limit: string; // e.g. "256_THREADS_UNLOCKED"
  neural_net_boost: string;               // e.g. "ENABLED_x4_ACCELERATOR"
}

// ─── Streak data returned by POST /api/streaks/complete-objective ────────────

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_completed: string | null; // ISO 8601 datetime string
  completed_today: boolean;
}
