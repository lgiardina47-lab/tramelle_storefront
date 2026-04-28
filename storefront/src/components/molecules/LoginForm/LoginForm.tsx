'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FieldError, FieldValues, FormProvider, useForm, useFormContext } from 'react-hook-form';

import { Button } from '@/components/atoms';
import { Alert } from '@/components/atoms/Alert/Alert';
import { LabeledInput } from '@/components/cells';
import { login } from '@/lib/data/customer';
import { toast } from '@/lib/helpers/toast';

import { LoginFormData, loginFormSchema } from './schema';
import {
  GoogleContinueButton,
  GoogleOAuthDivider,
} from '@/components/molecules/GoogleContinueButton/GoogleContinueButton';
import { messageForGoogleOAuthErrorCode } from '@/lib/auth/google-oauth-messages';

function safeInternalReturnPath(raw: string | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const LoginForm = () => {
  const methods = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  return (
    <FormProvider {...methods}>
      <Form />
    </FormProvider>
  );
};

const Form = () => {
  const [isAuthError, setIsAuthError] = useState(false);
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useFormContext();
  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'it';
  const searchParams = useSearchParams();
  const isSessionExpired = searchParams.get('sessionExpired') === 'true';
  const isSessionRequired = searchParams.get('sessionRequired') === 'true';
  const returnAfterLogin =
    safeInternalReturnPath(searchParams.get('returnUrl')) ?? '/user';
  const oauthReturnPath = returnAfterLogin.startsWith(`/${locale}/`)
    ? returnAfterLogin
    : `/${locale}${returnAfterLogin.startsWith('/') ? returnAfterLogin : `/${returnAfterLogin}`}`;
  const googleErrCode = searchParams.get('google_error');
  const googleErrMessage = messageForGoogleOAuthErrorCode(googleErrCode);

  const submit = async (data: FieldValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const res = await login(formData);

    if (res.success) {
      router.refresh();
      router.push(oauthReturnPath);
    } else {
      setIsAuthError(true);
      toast.error({ title: res.message || 'An error occurred. Please try again.' });
    }
  };

  const clearApiError = () => {
    isAuthError && setIsAuthError(false);
  };

  const getAuthMessage = () => {
    if (isSessionExpired) {
      return 'Your session has expired. Please log in to continue.';
    }
    if (isSessionRequired) {
      return 'Please log in to continue.';
    }
    return null;
  };

  const authMessage = getAuthMessage();

  return (
    <main
      className="container"
      data-testid="login-page"
    >
      <div className="mx-auto mt-6 w-full max-w-xl space-y-4">
        {authMessage && (
          <Alert
            title={authMessage}
            className="w-full"
            icon
            data-testid="login-auth-alert"
          />
        )}
        <div
          className="rounded-sm border p-4"
          data-testid="login-form-container"
        >
          <h1 className="heading-md mb-8 uppercase text-primary">Log in</h1>
          {googleErrMessage && (
            <Alert
              title={googleErrMessage}
              className="mb-6 w-full"
              icon
              data-testid="login-google-error-alert"
            />
          )}
          <GoogleContinueButton returnPath={oauthReturnPath} />
          <GoogleOAuthDivider />
          <form
            onSubmit={handleSubmit(submit)}
            data-testid="login-form"
          >
            <div className="space-y-4">
              <LabeledInput
                label="E-mail"
                placeholder="Your e-mail address"
                error={
                  (errors.email as FieldError) ||
                  (isAuthError ? ({ message: '' } as FieldError) : undefined)
                }
                data-testid="login-email-input"
                {...register('email', {
                  onChange: clearApiError
                })}
              />
              <LabeledInput
                label="Password"
                placeholder="Your password"
                type="password"
                error={
                  (errors.password as FieldError) ||
                  (isAuthError ? ({ message: '' } as FieldError) : undefined)
                }
                data-testid="login-password-input"
                {...register('password', {
                  onChange: clearApiError
                })}
              />
            </div>

            <Link
              href="/forgot-password"
              prefetch={true}
              className="label-md mt-4 block text-right uppercase text-action-on-secondary"
              data-testid="login-forgot-password-link"
            >
              Forgot your password?
            </Link>

            <Button
              className="mt-8 w-full uppercase"
              disabled={isSubmitting}
              data-testid="login-submit-button"
            >
              Log in
            </Button>
          </form>
        </div>

        <div className="rounded-sm border p-4">
          <h2 className="heading-md mb-4 uppercase text-primary">
            Don&apos;t have an account yet?
          </h2>
          <Link
            href="/register"
            prefetch={true}
            data-testid="login-register-link"
          >
            <Button
              variant="tonal"
              className="mt-8 flex w-full justify-center uppercase"
            >
              Create account
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
};
