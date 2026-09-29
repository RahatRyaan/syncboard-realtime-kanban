import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  LogIn,
  ShieldCheck,
  Kanban,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { getDemoAccountApi, DemoAccountInfo } from './api';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';

const HIGHLIGHTS = [
  { icon: Kanban, label: 'Real-time Kanban boards' },
  { icon: Users, label: 'Live presence and cursors' },
  { icon: Zap, label: 'Optimistic conflict handling' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const { data: demo } = useQuery<DemoAccountInfo>({
    queryKey: ['demo-account'],
    queryFn: getDemoAccountApi,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    if (!demo?.enabled || !demo.email || !demo.password || isSubmitting) return;

    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
    setNotice('Signed in with the demo account.');
    setIsSubmitting(true);

    try {
      await login({ email: demo.email, password: demo.password });
      navigate('/');
    } catch (err: any) {
      setError(
        err.message ||
          'The demo account is not available right now. Try running the API with SEED_DEMO_DATA=true.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-content-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.16),transparent)]"
      />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Marketing / value panel */}
        <section className="hidden lg:flex flex-col space-y-7">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
              SB
            </span>
            <span className="text-2xl font-black tracking-tight">SyncBoard</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight leading-[1.1]">
            Collaborative boards and docs,
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              {' '}built for real-time teams.
            </span>
          </h1>

          <p className="text-content-muted text-sm leading-relaxed max-w-md">
            Multi-user Kanban with live presence, versioned document editing, and
            conflict-safe writes. Try it instantly with the demo account — no
            signup required.
          </p>

          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-content-secondary">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-indigo-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-xs text-content-faint pt-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Argon2 password hashing · rotating refresh tokens
          </div>
        </section>

        {/* Login form */}
        <section className="w-full bg-panel border border-line rounded-2xl p-7 sm:p-8 shadow-panel">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm">
              SB
            </span>
            <span className="text-lg font-black tracking-tight">SyncBoard</span>
          </div>

          <div className="space-y-1.5 mb-6">
            <h2 className="text-xl font-black tracking-tight">Welcome back</h2>
            <p className="text-sm text-content-muted">
              Sign in to access your collaborative workspaces
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm rounded-xl flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-sm rounded-xl"
            >
              {notice}
            </div>
          )}

          {demo?.enabled && demo.email && (
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full mb-5 group flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-left transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/20"
            >
              <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold">Explore as demo owner</span>
                <span className="block text-xs opacity-80 truncate">
                  {demo.email} · seeded with sample boards
                </span>
              </span>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight
                  className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              )}
            </button>
          )}

          {demo?.enabled && (
            <div className="flex items-center gap-3 mb-5" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                or sign in
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
              >
                Email address
              </label>
              <input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 bg-surface-sunken border border-line rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-2.5 pr-11 bg-surface-sunken border border-line rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-content-faint hover:text-content-primary hover:bg-panel-hover transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-content-muted mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-indigo-500 hover:text-indigo-400 font-semibold"
            >
              Create account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
