export function validateConfig(config: Record<string, unknown>) {
  const requiredEnvVars = ['MONGO_URI'];
  if (process.env.NODE_ENV === 'production') {
    for (const key of requiredEnvVars) {
      if (!process.env[key]) {
        throw new Error(`Missing mandatory environment variable: ${key}`);
      }
    }
  }
  return config;
}
