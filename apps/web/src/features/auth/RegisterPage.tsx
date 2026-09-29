import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Loader2,
  User,
  Mail,
  Lock,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';

const NAME_MIN = 2;
const NAME_MAX = 60;
const PASSWORD_MIN = 8;

// Mirrors the server-side rules in register.dto.ts so the client never
// submits something the API will reject.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

type Touched = Record<keyof FieldErrors, boolean>;

function validateName(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Name is required';
  if (v.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters`;
  if (v.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`;
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Email is required';
  if (v.length > 254) return 'Email is too long';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required';
  if (value.length < PASSWORD_MIN)
    return `Password must be at least ${PASSWORD_MIN} characters`;
  if (value.length > 72) return 'Password must be at most 72 characters';
  if (!/[a-z]/.test(value)) return 'Include at least one lowercase letter';
  if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter';
  if (!/[0-9]/.test(value)) return 'Include at least one number';
  return undefined;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Touched>({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const errors: FieldErrors = useMemo(
    () => ({
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: confirm === password ? undefined : 'Passwords do not match',
    }),
    [name, email, password, confirm],
  );

  const showError = (field: keyof FieldErrors) =>
    touched[field] && errors[field] ? errors[field] : undefined;

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= PASSWORD_MIN) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = [
    '',
    'bg-rose-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-emerald-500',
  ][strength];

  const isValid =
    !errors.name && !errors.email && !errors.password && !errors.confirm;

  const handleBlur = (field: keyof FieldErrors) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setTouched({ name: true, email: true, password: true, confirm: true });

    if (!isValid) {
      setFormError('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please check your details.');
      setIsSubmitting(false);
    }
  };

  const rules = [
    { label: `At least ${PASSWORD_MIN} characters`, ok: password.length >= PASSWORD_MIN },
    { label: 'A lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'A number', ok: /[0-9]/.test(password) },
  ];

  return (
    <div className="min-h-screen bg-surface text-content-primary flex items-center justify-center p-6 relative overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(99,102,241,0.16),transparent)]"
      />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md bg-panel border border-line p-7 sm:p-8 rounded-2xl shadow-panel my-auto">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
            SB
          </div>
          <h1 className="text-2xl font-black tracking-tight">Create your account</h1>
          <p className="text-sm text-content-muted">
            Get started with real-time Kanban and docs
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full name */}
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
            >
              Full name
            </label>
            <div className="relative">
              <User
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={nameRef}
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={NAME_MIN}
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlur('name')}
                aria-invalid={!!showError('name')}
                aria-describedby={showError('name') ? 'reg-name-error' : undefined}
                placeholder="Alex Smith"
                className={`w-full pl-10 pr-10 py-2.5 bg-surface-sunken border rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm ${
                  showError('name') ? 'border-rose-500/60' : 'border-line'
                }`}
              />
              {touched.name && !errors.name && name && (
                <Check
                  className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500"
                  aria-hidden="true"
                />
              )}
            </div>
            {showError('name') && (
              <p id="reg-name-error" className="mt-1.5 text-xs text-rose-500">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleBlur('email')}
                aria-invalid={!!showError('email')}
                aria-describedby={showError('email') ? 'reg-email-error' : undefined}
                placeholder="you@company.com"
                className={`w-full pl-10 pr-10 py-2.5 bg-surface-sunken border rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm ${
                  showError('email') ? 'border-rose-500/60' : 'border-line'
                }`}
              />
              {touched.email && !errors.email && email && (
                <Check
                  className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500"
                  aria-hidden="true"
                />
              )}
            </div>
            {showError('email') && (
              <p id="reg-email-error" className="mt-1.5 text-xs text-rose-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handleBlur('password')}
                aria-invalid={!!showError('password')}
                aria-describedby="reg-password-rules"
                placeholder="Create a strong password"
                className={`w-full pl-10 pr-11 py-2.5 bg-surface-sunken border rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm ${
                  showError('password') ? 'border-rose-500/60' : 'border-line'
                }`}
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

            {/* Strength meter */}
            {password && (
              <div className="mt-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 flex gap-1" role="presentation">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength ? strengthColor : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-content-faint">
                    {strengthLabel}
                  </span>
                </div>

                <ul id="reg-password-rules" className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {rules.map((rule) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        rule.ok ? 'text-emerald-500' : 'text-content-faint'
                      }`}
                    >
                      {rule.ok ? (
                        <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                      )}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="reg-confirm"
                name="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={handleBlur('confirm')}
                aria-invalid={!!showError('confirm')}
                aria-describedby={showError('confirm') ? 'reg-confirm-error' : undefined}
                placeholder="Re-enter your password"
                className={`w-full pl-10 pr-10 py-2.5 bg-surface-sunken border rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm ${
                  showError('confirm') ? 'border-rose-500/60' : 'border-line'
                }`}
              />
              {touched.confirm && !errors.confirm && confirm && (
                <Check
                  className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500"
                  aria-hidden="true"
                />
              )}
            </div>
            {showError('confirm') && (
              <p id="reg-confirm-error" className="mt-1.5 text-xs text-rose-500">
                {errors.confirm}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-content-muted mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-indigo-500 hover:text-indigo-400 font-semibold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
