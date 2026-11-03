'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export interface EmailValidationState {
  hasAt: boolean;
  isValidFormat: boolean;
  isValid: boolean;
}

export function validateEmail(email: string): EmailValidationState {
  const trimmed = email.trim();
  const hasAt = trimmed.includes('@');
  // Standard RFC-compliant practical email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidFormat = emailRegex.test(trimmed);
  return {
    hasAt,
    isValidFormat,
    isValid: hasAt && isValidFormat,
  };
}

export interface PasswordStrengthState {
  score: number; // 0 (empty), 1 (weak), 2 (fair), 3 (good), 4 (strong)
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumberOrSymbol: boolean;
}

export function getPasswordStrength(password: string): PasswordStrengthState {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasNumberOrSymbol = hasNumber || hasSymbol;

  if (!password) {
    return {
      score: 0,
      hasMinLength: false,
      hasUppercase: false,
      hasNumberOrSymbol: false,
    };
  }

  let score = 0;

  // Initial base score for starting
  if (password.length >= 6) {
    score = 1;
  }

  // Meets length and at least one requirement
  if (hasMinLength && (hasUppercase || hasNumberOrSymbol)) {
    score = 2;
  }

  // Meets length, uppercase, number/symbol, plus lowercase
  if (hasMinLength && hasUppercase && hasNumberOrSymbol && hasLowercase) {
    score = 3;
  }

  // Score 4: strong password meeting length >= 8 with uppercase, lowercase, numbers AND symbols,
  // or length >= 10 with uppercase, lowercase, and numbers/symbols
  if (
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSymbol
  ) {
    score = 4;
  } else if (
    password.length >= 10 &&
    hasUppercase &&
    hasLowercase &&
    hasNumberOrSymbol
  ) {
    score = 4;
  }

  return {
    score,
    hasMinLength,
    hasUppercase,
    hasNumberOrSymbol,
  };
}

interface EmailFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  showRequirements?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export function EmailField({
  id,
  value,
  onChange,
  required = true,
  label = 'EMAIL ADDRESS',
  placeholder = 'name@domain.com',
  showRequirements = false,
  disabled = false,
  autoComplete = 'email',
}: EmailFieldProps) {
  const { hasAt, isValidFormat } = validateEmail(value);

  return (
    <div className="space-y-1.5 w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
      >
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div className="relative group w-full">
        <Mail
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#E61E73] transition-colors pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type="email"
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[50px] sm:h-[52px] rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] pl-12 pr-4 text-xs sm:text-sm text-slate-900 placeholder-[#94A3B8] outline-none transition-all duration-150 focus:border-[#E2A0B8] focus:bg-white focus:ring-2 focus:ring-[#E2A0B8]/25 disabled:opacity-60"
        />
      </div>

      {showRequirements && (
        <div className="space-y-1.5 pt-1 text-[11.5px] sm:text-xs">
          <div
            className={`flex items-center gap-2 transition-colors duration-150 ${
              hasAt ? 'text-emerald-700 font-medium' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150 ${
                hasAt ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-300'
              }`}
              aria-hidden="true"
            />
            <span>Must contain &apos;@&apos; symbol</span>
          </div>

          <div
            className={`flex items-center gap-2 transition-colors duration-150 ${
              isValidFormat ? 'text-emerald-700 font-medium' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150 ${
                isValidFormat ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-300'
              }`}
              aria-hidden="true"
            />
            <span>Valid email format (e.g. name@domain.com)</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  showStrengthAndRequirements?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inlineFeedback?: React.ReactNode;
}

export function PasswordField({
  id,
  value,
  onChange,
  required = true,
  label = 'PASSWORD',
  placeholder = 'Enter your password',
  showStrengthAndRequirements = false,
  disabled = false,
  autoComplete = 'current-password',
  inlineFeedback,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { score, hasMinLength, hasUppercase, hasNumberOrSymbol } =
    getPasswordStrength(value);

  // Determine segment colors based on active score
  const getSegmentColor = (segIndex: number) => {
    if (segIndex > score) {
      return 'bg-slate-200'; // inactive neutral blue-gray
    }
    switch (score) {
      case 1:
        return 'bg-rose-500';
      case 2:
        return 'bg-amber-400';
      case 3:
        return 'bg-emerald-500';
      case 4:
        return 'bg-emerald-600';
      default:
        return 'bg-slate-200';
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
      >
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div className="relative group w-full">
        <Lock
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#E61E73] transition-colors pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[50px] sm:h-[52px] rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] pl-12 pr-12 text-xs sm:text-sm text-slate-900 placeholder-[#94A3B8] outline-none transition-all duration-150 focus:border-[#E2A0B8] focus:bg-white focus:ring-2 focus:ring-[#E2A0B8]/25 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1 cursor-pointer"
        >
          {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>

      {showStrengthAndRequirements && (
        <div className="pt-1.5 space-y-2.5">
          {/* 4-segment horizontal password strength indicator */}
          <div
            className="grid grid-cols-4 gap-2 w-full"
            aria-label={`Password strength: ${score} of 4`}
          >
            {[1, 2, 3, 4].map((segIndex) => (
              <div
                key={segIndex}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${getSegmentColor(
                  segIndex
                )}`}
              />
            ))}
          </div>

          {/* Dynamic password requirements list */}
          <div className="space-y-1.5 text-[11.5px] sm:text-xs">
            <div
              className={`flex items-center gap-2 transition-colors duration-150 ${
                hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150 ${
                  hasMinLength
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-300'
                }`}
                aria-hidden="true"
              />
              <span>At least 8 characters</span>
            </div>

            <div
              className={`flex items-center gap-2 transition-colors duration-150 ${
                hasUppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150 ${
                  hasUppercase
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-300'
                }`}
                aria-hidden="true"
              />
              <span>Contains uppercase letter</span>
            </div>

            <div
              className={`flex items-center gap-2 transition-colors duration-150 ${
                hasNumberOrSymbol ? 'text-emerald-700 font-medium' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150 ${
                  hasNumberOrSymbol
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-300'
                }`}
                aria-hidden="true"
              />
              <span>Contains number or symbol</span>
            </div>
          </div>
        </div>
      )}

      {inlineFeedback && <div className="pt-1">{inlineFeedback}</div>}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label: string;
  placeholder?: string;
  type?: string;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  disabled?: boolean;
  autoComplete?: string;
}

export function TextField({
  id,
  value,
  onChange,
  required = true,
  label,
  placeholder,
  type = 'text',
  icon: Icon,
  disabled = false,
  autoComplete,
}: TextFieldProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
      >
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div className="relative group w-full">
        {Icon && (
          <Icon
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#E61E73] transition-colors pointer-events-none"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-[50px] sm:h-[52px] rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] ${
            Icon ? 'pl-12' : 'pl-4'
          } pr-4 text-xs sm:text-sm text-slate-900 placeholder-[#94A3B8] outline-none transition-all duration-150 focus:border-[#E2A0B8] focus:bg-white focus:ring-2 focus:ring-[#E2A0B8]/25 disabled:opacity-60`}
        />
      </div>
    </div>
  );
}

