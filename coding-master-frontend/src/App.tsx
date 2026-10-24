import React, { useState, useEffect } from "react";
import {
  Flame,
  Terminal,
  Lock,
  Shield,
  Network,
  Cpu,
  Globe,
  RefreshCw,
  Star,
  Activity,
  CheckCircle,
  User,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  UserProfile,
  LeaderboardUser,
  ChampionRow,
  SandboxInitResponse,
  UserTier,
  AdvancedPresets,
  StreakData,
} from "./types";
import { apiService } from "./api";
import FloatingGlass from "./components/FloatingGlass";

export default function App() {
  // ── Auth & session ──────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("cm_access_token")
  );
  const [user, setUser] = useState<UserProfile | null>(null);

  // ── Auth form fields ────────────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // ── Gamification ────────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [champion, setChampion] = useState<ChampionRow | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [myStreak, setMyStreak] = useState<StreakData | null>(null);
  const [completedToday, setCompletedToday] = useState(false);

  // ── Sandbox panel ───────────────────────────────────────────────────────
  const [sandboxPath, setSandboxPath] = useState(
    "/home/local/coding-master-sandbox"
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<string[]>([]);
  const [sandboxProfile, setSandboxProfile] =
    useState<SandboxInitResponse | null>(null);

  // ── Calibration panel ───────────────────────────────────────────────────
  const [calibrationVector, setCalibrationVector] = useState<string>("speed");
  const [customPresets, setCustomPresets] = useState<AdvancedPresets | null>(
    null
  );

  // ── Fetch leaderboard ───────────────────────────────────────────────────
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    const { data } = await apiService<{ leaderboard: LeaderboardUser[]; champion_row: ChampionRow | null }>(
      "/api/leaderboard"
    );
    if (data?.leaderboard) {
      setLeaderboard(data.leaderboard);
      setChampion(data.champion_row ?? null);
    }
    setLoadingLeaderboard(false);
  };

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    if (token) {
      const saved = localStorage.getItem("cm_user_data");
      if (saved) {
        try {
          setUser(JSON.parse(saved) as UserProfile);
        } catch {
          // corrupted storage — ignore
        }
      } else {
        // Fallback: derive username from token format "cm_username_..."
        const usernameFromToken = token.split("_")[1] ?? "Anonymous";
        setUser({
          id: 99,
          signup_number: 99,
          username: usernameFromToken,
          tier_status: "PREMIUM_PLUS" as UserTier,
          is_premium: true,
          custom_theme_config: { leak: "VIOLET_CYAN_LEAK", atmosphere: "HIGH_FI" },
        });
      }
    }
    fetchLeaderboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Register ────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    const { data, error } = await apiService<{ token: string; user: UserProfile }>(
      "/api/register",
      { method: "POST", body: { username, email, password } }
    );
    if (error || !data) {
      setAuthError(error ?? "Failed registration verification");
      return;
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("cm_access_token", data.token);
    localStorage.setItem("cm_user_data", JSON.stringify(data.user));
    setAuthSuccess("Enterprise Account Registered! Platinum sequence initialized.");
    fetchLeaderboard();
  };

  // ── Login ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    const { data, error } = await apiService<{ token: string; user: UserProfile }>(
      "/api/auth/login",
      { method: "POST", body: { username, password } }
    );
    if (error || !data) {
      setAuthError(error ?? "Invalid credentials combination");
      return;
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("cm_access_token", data.token);
    localStorage.setItem("cm_user_data", JSON.stringify(data.user));
    setAuthSuccess("Authentication authenticated. Matrix active.");
    fetchLeaderboard();
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("cm_access_token");
    localStorage.removeItem("cm_user_data");
    setSyncHistory([]);
    setSandboxProfile(null);
    setCustomPresets(null);
    setMyStreak(null);
    setCompletedToday(false);
  };

  // ── Complete daily objective ─────────────────────────────────────────────
  const submitDailyObjective = async () => {
    if (!token) {
      setAuthError("Session token missing. Please login below.");
      return;
    }
    const { data, error } = await apiService<{ streak: StreakData }>(
      "/api/streaks/complete-objective",
      { method: "POST", token }
    );
    if (error) {
      alert(error);
      return;
    }
    setCompletedToday(true);
    fetchLeaderboard();
    if (data?.streak) {
      setMyStreak(data.streak);
    }
  };

  // ── Sandbox sync ─────────────────────────────────────────────────────────
  const triggerSandboxSync = async () => {
    if (!token) {
      alert("Authenticate first using the login form below!");
      return;
    }
    setIsSyncing(true);
    setSyncHistory((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Querying portal licensing authorization...`,
    ]);

    const { data, error } = await apiService<SandboxInitResponse>(
      "/api/verify-license",
      { method: "POST", body: { virtual_mount_path: sandboxPath, token } }
    );

    setTimeout(() => {
      setIsSyncing(false);
      if (error || !data) {
        setSyncHistory((prev) => [
          ...prev,
          `[ERROR] Sync failed: ${error ?? "Requires premium active state"}`,
        ]);
        return;
      }
      setSandboxProfile(data);
      setSyncHistory((prev) => [
        ...prev,
        `[SUCCESS] Connection secured to ${data.sandbox_runtime.mount_node}`,
        `[OK] Measured Latency: ${data.latency_profile.actual_measured_latency} (Target: ${data.latency_profile.latency_target})`,
        `[OK] Active Sandbox: ${data.sandbox_runtime.sandbox_id} with Status: ${data.sandbox_runtime.kernel_status}`,
      ]);
    }, 600);
  };

  // ── Advanced presets ─────────────────────────────────────────────────────
  const fetchAdvancedPresets = async () => {
    if (!token) return;
    const { data, error } = await apiService<{ presets: AdvancedPresets }>(
      "/api/dashboard/advanced-presets",
      { token }
    );
    if (error) {
      alert(`Access Denied: ${error}`);
      return;
    }
    if (data?.presets) {
      setCustomPresets(data.presets);
    }
  };

  // ── Calendar helper ──────────────────────────────────────────────────────
  const generateCalendarDays = () => {
    const days = [];
    const base = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const isCompleted = d.getDate() % 2 === 0 || (i === 0 && completedToday);
      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
        num: d.getDate(),
        completed: isCompleted,
        formatted: d.toISOString().split("T")[0],
      });
    }
    return days;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-[#00e290] selection:text-black">

      {/* Floating glass 3D hook — fixed full-bleed background, sits behind all
          content (z-10/z-50) and the ambient leaks below. pointer-events-none. */}
      <FloatingGlass />

      {/* Ambient background leaks based on tier */}
      {user?.tier_status === "PLATINUM_GLOW" ? (
        <>
          <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-amber-500/10 via-yellow-950/5 to-transparent pointer-events-none z-0 transition-all duration-1000" />
          <div className="absolute top-24 left-10 w-[400px] h-[400px] bg-yellow-500/10 rounded-full filter blur-[100px] pointer-events-none z-0 animate-pulse" />
          <div className="absolute top-48 right-10 w-[500px] h-[500px] bg-amber-600/10 rounded-full filter blur-[120px] pointer-events-none z-0" />
        </>
      ) : user?.tier_status === "PREMIUM_PLUS" ? (
        <>
          <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-purple-900/15 via-cyan-950/10 to-transparent pointer-events-none z-0 transition-all duration-1000" />
          <div className="absolute top-24 left-10 w-[400px] h-[400px] bg-[#7000ff]/5 rounded-full filter blur-[100px] pointer-events-none z-0" />
          <div className="absolute top-48 right-10 w-[500px] h-[500px] bg-[#00e290]/5 rounded-full filter blur-[120px] pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-slate-900/20 via-slate-950/5 to-transparent pointer-events-none z-0 transition-all duration-1000" />
          <div className="absolute top-24 left-10 w-[400px] h-[400px] bg-slate-800/5 rounded-full filter blur-[100px] pointer-events-none z-0" />
        </>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="relative z-50 border-b border-white/10 bg-[#0d0e12]/80 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="text-[#00e290] w-8 h-8 animate-pulse" />
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-300 to-slate-500">
            Coding Master
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-[#00e290]">
                  @{user.username}
                </span>
                <span className="text-xs text-slate-400 font-mono tracking-wider">
                  User #{user.signup_number}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 border border-red-500/30 text-red-400 text-xs rounded hover:bg-red-500/10 transition font-mono uppercase"
              >
                Log Out
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              Obsidian Protocol Active
            </span>
          )}
        </div>
      </header>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full relative z-10">

        {/* LEFT COLUMN */}
        <section className="lg:col-span-4 flex flex-col gap-6">

          {/* Identity card */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00e290]" />
              Enterprise Ident-Check Record
            </h2>

            {user ? (
              <div className="flex flex-col items-center py-4 relative z-10">
                <div
                  className={`relative px-4 py-4 rounded-full bg-slate-800/50 border-2 flex items-center justify-center transition-all duration-500 ${
                    user.tier_status === "PLATINUM_GLOW"
                      ? "border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.35)]"
                      : "border-purple-500 shadow-[0_0_30px_rgba(112,0,255,0.3)]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-full animate-spin pointer-events-none" />
                  <User className="w-16 h-16 text-slate-200 relative z-10" />
                </div>

                <h3 className="text-xl font-bold mt-4 tracking-tight">
                  {user.username}
                </h3>

                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded bg-black/40 border border-white/10">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      user.tier_status === "PLATINUM_GLOW"
                        ? "bg-yellow-400 animate-ping"
                        : "bg-purple-400 animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-xs font-mono font-bold uppercase ${
                      user.tier_status === "PLATINUM_GLOW"
                        ? "text-yellow-400"
                        : "text-purple-300"
                    }`}
                  >
                    {user.tier_status}
                  </span>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-400 font-mono">
                    Dynamic Signup Sequence Position:
                    <span className="text-[#00e290] font-bold block text-lg">
                      User #{user.signup_number}
                    </span>
                  </p>
                </div>

                {/* Streak badge */}
                {myStreak && (
                  <div className="mt-3 px-4 py-2 bg-black/30 border border-white/10 rounded text-center">
                    <p className="text-[10px] text-slate-400 font-mono">
                      Current Streak
                      <span className="text-[#00e290] font-black text-xl block">
                        {myStreak.current_streak} 🔥
                      </span>
                    </p>
                  </div>
                )}

                {user.tier_status === "PLATINUM_GLOW" && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-center">
                    <p className="text-xs text-yellow-300 font-mono">
                      ★ LEGENDARY TIER ACTIVE: Special Golden liquid gradients triggered globally.
                    </p>
                  </div>
                )}
                {user.tier_status === "PREMIUM_PLUS" && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded text-center">
                    <p className="text-xs text-purple-300 font-mono">
                      ✦ PREMIUM PLUS STATUS: VIOLET_CYAN_LEAK ambient controls enabled.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center bg-black/20 rounded border border-dashed border-white/10">
                <Lock className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-xs text-slate-400 font-mono">
                  No active terminal token decrypted.
                </p>
                <p className="text-xs text-[#00e290] mt-1">
                  Authenticate below to view identity parameters
                </p>
              </div>
            )}
          </div>

          {/* Calendar + daily objective */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-2xl">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4 flex items-center justify-between">
              <span>Goal Achievement Grid</span>
              <span className="text-xs text-[#00e290] font-mono lowercase">
                verified live
              </span>
            </h2>

            <div className="bg-black/40 rounded-lg p-4 border border-white/5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-mono">
                  Completeness Level
                </span>
                <span className="text-xs text-[#00e290] font-mono font-semibold">
                  14-Day Monitor
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day, ix) => (
                  <div
                    key={ix}
                    title={`Day ${day.num}: ${day.completed ? "Completed" : "Pending"}`}
                    className={`aspect-square rounded flex flex-col items-center justify-center text-[10px] font-mono transition-all duration-300 ${
                      day.completed
                        ? "bg-purple-900/40 border border-purple-400/50 text-[#00e290] shadow-[0_0_8px_rgba(0,226,144,0.15)]"
                        : "bg-[#252528] text-slate-500 border border-transparent"
                    }`}
                  >
                    <span>{day.label}</span>
                    <span className="font-bold text-[9px] mt-0.5">{day.num}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={submitDailyObjective}
              disabled={completedToday}
              className={`w-full py-3 rounded-lg font-mono text-xs uppercase font-extrabold tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                completedToday
                  ? "bg-purple-900/50 text-purple-300 border border-purple-500/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#00e290] to-teal-500 text-black hover:shadow-[0_0_15px_rgba(0,226,144,0.4)]"
              }`}
            >
              {completedToday ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Objective Complete for Today
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 animate-bounce" />
                  Complete Daily Coding Objective
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">
              ★ Tracks unbroken coding streaks. Submit daily execution nodes.
            </p>
          </div>
        </section>

        {/* MIDDLE COLUMN */}
        <section className="lg:col-span-5 flex flex-col gap-6">

          {/* Leaderboard */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-2xl flex-grow flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                Global Streak Leaderboard Matrix
              </h2>
              <button
                onClick={fetchLeaderboard}
                className="p-1 hover:bg-white/5 rounded transition text-slate-400 hover:text-white"
                title="Refresh Leaderboard"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingLeaderboard ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Champion card */}
            {champion && (
              <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-amber-500/15 via-yellow-600/10 to-[#1c1b1c] border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)] relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Star className="w-24 h-24 text-yellow-300" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-400 flex flex-col items-center justify-center">
                      <span className="text-xs font-mono text-yellow-400">RANK</span>
                      <span className="text-lg font-bold font-mono text-yellow-400">#1</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-200 tracking-tight flex items-center gap-1.5 font-mono">
                        {champion.username}
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </h3>
                      <p className="text-[10px] text-yellow-500 tracking-widest uppercase font-mono">
                        {champion.special_aura}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 block font-mono">
                      {champion.streak_count}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
                      days streak
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {leaderboard.map((usr, idx) => (
                <div
                  key={usr.user_id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                    idx === 0
                      ? "bg-yellow-500/5 border-yellow-500/30"
                      : usr.username === user?.username
                      ? "bg-purple-900/20 border-purple-500/40"
                      : "bg-black/35 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 text-center font-mono text-xs font-bold ${
                        idx === 0
                          ? "text-yellow-400"
                          : idx === 1
                          ? "text-slate-300"
                          : idx === 2
                          ? "text-amber-600"
                          : "text-slate-500"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold hover:text-[#00e290] cursor-pointer font-mono">
                        {usr.username}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                        {usr.tier_status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-sm font-bold">{usr.current_streak}</span>
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        idx === 0 ? "text-yellow-400 animate-pulse" : "text-orange-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calibration panel */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-6 border border-white/5 shadow-2xl">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              Runtime System Calibration
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(
                [
                  { id: "speed", label: "45ms Target", sub: "Speed" },
                  { id: "fidelity", label: "Flawless UI", sub: "Rendering" },
                  { id: "unthrottled", label: "Raw Compute", sub: "Unlimited" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCalibrationVector(opt.id)}
                  className={`p-2.5 rounded border text-center transition-all ${
                    calibrationVector === opt.id
                      ? opt.id === "speed"
                        ? "bg-[#00e290]/10 border-[#00e290] text-[#00e290]"
                        : opt.id === "fidelity"
                        ? "bg-purple-900/20 border-purple-500 text-purple-300"
                        : "bg-yellow-500/10 border-yellow-500 text-yellow-300"
                      : "bg-black/30 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold font-mono">{opt.label}</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 mt-1">
                    {opt.sub}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-black/40 border border-white/5 rounded-lg mb-4 text-xs font-mono">
              {calibrationVector === "speed" && (
                <p className="text-slate-400">
                  ⚡ Allocates dedicated thread pools forcing rendering engine
                  execution speeds under{" "}
                  <b className="text-white">45ms</b> sandbox targets.
                </p>
              )}
              {calibrationVector === "fidelity" && (
                <p className="text-slate-400">
                  ⚛ Enforces cinematic glassmorphism overlays &amp;
                  hardware-accelerated vector rendering setups.
                </p>
              )}
              {calibrationVector === "unthrottled" && (
                <p className="text-slate-400">
                  ☢ Bypasses cloud rate-guards. Unlocks priority queues for
                  neural network computation layers.
                </p>
              )}
            </div>

            <button
              onClick={fetchAdvancedPresets}
              className="w-full py-2 border border-[#00e290]/30 hover:border-[#00e290] text-[#00e290] hover:bg-[#00e290]/5 transition font-mono text-xs uppercase font-extrabold rounded-lg"
            >
              Test License Check
            </button>

            {customPresets && (
              <div className="mt-3 p-3 bg-[#0d0e12] border border-green-500/20 rounded font-mono text-[11px] text-[#00e290] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  PREMIUM GATEWAY DECRYPTED:
                </div>
                <div>Custom Ambient leak: {customPresets.custom_background_ambient}</div>
                <div>Server Heat Level: {customPresets.laser_level}</div>
                <div>Active Limits: {customPresets.performance_co2_threadpool_limit}</div>
                <div>Neural Accelerators: {customPresets.neural_net_boost}</div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="lg:col-span-3 flex flex-col gap-6">

          {/* Sandbox sync panel */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-5 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="absolute top-2 right-2 flex items-center justify-center bg-purple-500/20 px-2 py-0.5 rounded text-[9px] font-mono text-purple-400 border border-purple-500/30">
                PRO LAYER
              </div>
              <h2 className="text-xs font-extrabold tracking-widest uppercase text-slate-300 flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-teal-400" />
                Launch App Layer
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Verify premium developer tokens and virtual-mount unlaunched
                workspace directory nodes directly on host.
              </p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-mono mb-1">
                    Local Directory Node
                  </label>
                  <input
                    type="text"
                    value={sandboxPath}
                    onChange={(e) => setSandboxPath(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs text-white font-mono focus:border-[#00e290] focus:outline-none"
                    placeholder="/home/dev/coding_master"
                  />
                </div>
                <button
                  onClick={triggerSandboxSync}
                  disabled={isSyncing}
                  className="w-full bg-[#00e290] text-black hover:bg-[#52ffac] font-mono font-black text-[11px] uppercase tracking-wider py-2 rounded transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isSyncing
                    ? "Initializing Sandbox Runtime..."
                    : "Initialize Virtual Link"}
                </button>
              </div>
            </div>

            <div className="bg-black/70 rounded p-3 border border-white/5 font-mono text-[10px] space-y-1.5 min-h-[140px] max-h-[180px] overflow-y-auto">
              <span className="text-[#00e290] block border-b border-white/5 pb-1">
                CONSOLE LOGS:
              </span>
              {syncHistory.length === 0 ? (
                <span className="text-slate-600 italic">
                  No connections triggered. Click 'Initialize Virtual Link' above...
                </span>
              ) : (
                syncHistory.map((item, id) => (
                  <div
                    key={id}
                    className={
                      item.includes("ERROR") || item.includes("FATAL")
                        ? "text-red-400"
                        : item.includes("SUCCESS")
                        ? "text-purple-300"
                        : "text-slate-300"
                    }
                  >
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Auth form */}
          <div className="bg-[#1c1b1c]/80 backdrop-blur-md rounded-xl p-5 border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <button
                onClick={() => {
                  setIsRegisterMode(false);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className={`text-xs font-mono font-bold uppercase transition ${
                  !isRegisterMode
                    ? "text-[#00e290]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsRegisterMode(true);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className={`text-xs font-mono font-bold uppercase transition ${
                  isRegisterMode
                    ? "text-[#00e290]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={isRegisterMode ? handleRegister : handleLogin}
              className="space-y-3"
            >
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">
                  Handle / Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                  placeholder="e.g. dev_neo"
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">
                    Email Node Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                    placeholder="name@domain.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">
                  Access Cipher Key
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <p className="text-[10px] font-mono text-red-400 bg-red-950/20 p-2 border border-red-900/30 rounded">
                  {authError}
                </p>
              )}
              {authSuccess && (
                <p className="text-[10px] font-mono text-[#00e290] bg-green-950/20 p-2 border border-green-900/30 rounded">
                  {authSuccess}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider py-2 rounded shadow-lg transition"
              >
                {isRegisterMode ? "Provision Account" : "Open Security Channel"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
