"use client";

import { signIn, signOut } from "next-auth/react";
import { ShieldAlert, Ban, Zap, ArrowRight, Package, FolderKanban, Users, BarChart3, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Branding {
  companyName: string;
  companyLogo: string;
}

function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>({ companyName: "CMM Grid", companyLogo: "" });
  useEffect(() => {
    fetch("/api/branding", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBranding({ companyName: data.companyName || "CMM Grid", companyLogo: data.companyLogo || "" });
      })
      .catch(() => {});
  }, []);
  return branding;
}

async function doSignOut() {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
  }
  await signOut({ redirect: false });
  window.location.href = "/?t=" + Date.now();
}

const FEATURES = [
  { icon: Package,       color: "#06b6d4", label: "Smart Inventory",     desc: "Real-time stock tracking & allocation" },
  { icon: FolderKanban,  color: "#a78bfa", label: "Project Management",  desc: "Multi-site coordination & expenses" },
  { icon: Users,         color: "#34d399", label: "Labour Management",   desc: "Attendance, wages & payments" },
  { icon: BarChart3,     color: "#f59e0b", label: "Reports & Exports",   desc: "One-click Excel report generation" },
];

export function LoginScreen() {
  const { companyName, companyLogo } = useBranding();

  return (
    <div className="flex min-h-[100dvh] bg-[#030712] font-sans text-white selection:bg-cyan-500/30">

      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] p-14 relative overflow-hidden">

        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-[#030712] to-violet-950/30 z-0" />
        <div className="absolute inset-0 z-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_70%_at_40%_40%,#000_20%,transparent_100%)]" />
        <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none z-0" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.3)] overflow-hidden flex-shrink-0 ${companyLogo ? "bg-transparent" : "bg-gradient-to-tr from-cyan-500 to-blue-600"}`}>
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Zap size={20} className="text-white" strokeWidth={2.5} />
            )}
          </div>
          <span className="text-lg font-bold tracking-tight text-white/90">{companyName}</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6 bg-gradient-to-br from-white via-white/90 to-white/35 bg-clip-text text-transparent">
            Your complete<br />site operations<br />hub.
          </h1>
          <p className="text-slate-400 text-lg font-light leading-relaxed mb-10">
            A unified platform for {companyName} to manage inventory, coordinate projects, and track field labour — all in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div
                  style={{ background: `${color}12`, border: `1px solid ${color}20` }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-700">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>

      {/* ── Right Panel — Sign In ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020] to-[#030712] lg:bg-none z-0" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-cyan-500/8 blur-[100px] rounded-full pointer-events-none lg:hidden z-0" />

        <div className="relative z-10 w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_28px_rgba(6,182,212,0.3)] overflow-hidden ${companyLogo ? "bg-transparent" : "bg-gradient-to-tr from-cyan-500 to-blue-600"}`}>
              {companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Zap size={24} className="text-white" strokeWidth={2.5} />
              )}
            </div>
            <span className="text-xl font-bold text-white/90">{companyName}</span>
          </div>

          {/* Sign-in card */}
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-3xl p-8 sm:p-10 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)]">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sign in with your authorized Google account to access {companyName}.
              </p>
            </div>

            {/* Google sign-in button */}
            <button
              onClick={() => signIn("google")}
              className="group w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 shadow-[0_2px_12px_rgba(255,255,255,0.08)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.14)]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left">Continue with Google</span>
              <ArrowRight size={16} className="text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </button>

            {/* Security note */}
            <div className="mt-6 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <CheckCircle2 size={14} className="text-cyan-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Access is restricted to authorized personnel only. All sign-in attempts are logged.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable elegant background for Pending & Blocked screens
const ElegantBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-[#030712] relative overflow-hidden font-sans">
    <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
    <div className="relative z-10 w-full max-w-[440px]">
      {children}
    </div>
  </div>
);

export function PendingScreen() {
  const { companyName } = useBranding();

  return (
    <ElegantBackground>
      <div className="bg-[#0B1120]/90 backdrop-blur-2xl rounded-[32px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="w-20 h-20 mx-auto bg-amber-500/[0.05] rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner mb-8">
          <ShieldAlert size={36} className="text-amber-400" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400 mb-3 tracking-tight">Access Pending</h1>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed">
          Your account has been verified by Google, but requires administrator approval before accessing {companyName}.
        </p>

        <button
          onClick={doSignOut}
          className="w-full group px-6 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] text-sm font-semibold text-slate-300 transition-all flex items-center justify-center gap-2"
        >
          Return to Sign In <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>
      </div>
    </ElegantBackground>
  );
}

export function BlockedScreen() {
  const { companyName } = useBranding();

  return (
    <ElegantBackground>
      <div className="bg-[#0B1120]/90 backdrop-blur-2xl rounded-[32px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.2)] border border-red-500/20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-red-500/10 blur-3xl pointer-events-none" />

        <div className="w-20 h-20 mx-auto bg-red-500/[0.05] rounded-2xl flex items-center justify-center border border-red-500/20 shadow-inner mb-8">
          <Ban size={36} className="text-red-400" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-red-100 to-red-400 mb-3 tracking-tight">Access Denied</h1>
        <p className="text-red-200/60 mb-10 text-sm leading-relaxed">
          Your access to {companyName} has been revoked by Administration. Contact your administrator to dispute this.
        </p>

        <button
          onClick={doSignOut}
          className="w-full group px-6 py-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          Sign Out Securely
        </button>
      </div>
    </ElegantBackground>
  );
}
