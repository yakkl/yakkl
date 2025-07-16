// Build constants for the application
export const BUILD_CONFIG = {
  version: process.env.VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  buildTime: new Date().toISOString()
};

export const INITIAL_ROUTE = '/';