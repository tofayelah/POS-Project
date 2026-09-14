import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Please enter your password.')
    .min(8, 'Password must be at least 8 characters.'),
  remember: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
    mode: 'onTouched',
  });

  const isLoading = authLoading || isSubmitting;

  // Redirect if already authenticated and session verification is settled
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Ensure we do not log passwords or auth payloads to console
    const result = await login({
      email: data.email.trim(),
      password: data.password,
      remember: Boolean(data.remember),
    });

    if (result.success) {
      setSuccessMessage('Authentication successful. Redirecting to dashboard...');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } else {
      // Clear password field on failed attempt for security, retaining email
      setValue('password', '');
      resetField('password');
      setErrorMessage(result.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleFillDemoCredentials = () => {
    setValue('email', 'admin@retailcore.test', { shouldValidate: true });
    setValue('password', 'password123', { shouldValidate: true });
    setErrorMessage(null);
  };

  return (
    <div 
      id="login-page-container" 
      className="min-h-screen w-full bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans"
    >
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div id="login-brand-header" className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-2xl shadow-md mb-3">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">RetailCore ERP</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise Point of Sale & Management Platform</p>
        </div>

        {/* Login Card */}
        <div 
          id="login-card" 
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 transition-all"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your authorized enterprise credentials to proceed.</p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div 
              id="login-error-alert" 
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm animate-in fade-in duration-200"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div 
              id="login-success-alert" 
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-3 text-sm animate-in fade-in duration-200"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email-input" 
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${errors.email ? 'text-rose-400' : 'text-slate-400'}`}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@retailcore.test"
                  disabled={isLoading}
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                    errors.email
                      ? 'bg-rose-50/40 border border-rose-300 text-rose-900 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
              </div>
              {errors.email && (
                <p id="email-error-message" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password-input" 
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <span className="text-xs text-slate-400 cursor-not-allowed">
                  Forgot password?
                </span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${errors.password ? 'text-rose-400' : 'text-slate-400'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                    errors.password
                      ? 'bg-rose-50/40 border border-rose-300 text-rose-900 focus:bg-white focus:border-rose-500 focus:ring-rose-500/20'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error-message" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            {/* Remember Me & Scope indicator */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  disabled={isLoading}
                  {...register('remember')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                />
                <span className="text-xs font-medium text-slate-600">Remember this device</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sanctum v1</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
            <button
              id="fill-demo-credentials-btn"
              type="button"
              onClick={handleFillDemoCredentials}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
            >
              Use demo credentials (admin@retailcore.test)
            </button>
          </div>
        </div>

        {/* System Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>RetailCore Enterprise ERP &copy; {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
