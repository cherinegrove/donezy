import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Call this in main.tsx before rendering the app
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Filter out certain errors if needed
      return event;
    },
  });
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error | string, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: "fatal" | "error" | "warning" | "info" | "debug" = "info") {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}
