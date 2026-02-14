/**
 * Centralized logging utility
 * Uses LOG_LEVEL env var to control verbosity
 * Disables logs in production unless explicitly enabled
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

type LogLevel = keyof typeof LOG_LEVELS

function getCurrentLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
  return LOG_LEVELS[level] !== undefined ? level : "info"
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel()
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog("debug")) {
      console.log(`[DEBUG] ${message}`, data)
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog("info")) {
      console.log(`[INFO] ${message}`, data)
    }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, data)
    }
  },

  error: (message: string, error?: unknown) => {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, error instanceof Error ? error.message : error)
    }
  },
}
