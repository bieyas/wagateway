export default () => ({
  app: {
    port: parseInt(process.env.APP_PORT ?? '3000', 10) || 3000,
    env: process.env.APP_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'whatsapp_gateway',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  whatsapp: {
    sessionPath: process.env.WA_SESSION_PATH || './sessions',
  },
  security: {
    masterToken: process.env.MASTER_TOKEN || 'change-me-in-production',
  },
  webhook: {
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS ?? '3', 10) || 3,
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY ?? '5000', 10) || 5000,
  },
  messageQueue: {
    delayMin: parseInt(process.env.MESSAGE_DELAY_MIN ?? '1000', 10) || 1000,
    delayMax: parseInt(process.env.MESSAGE_DELAY_MAX ?? '3000', 10) || 3000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-jwt-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  media: {
    uploadDir: process.env.MEDIA_UPLOAD_DIR || './uploads',
    baseUrl: process.env.MEDIA_BASE_URL || '',
  },
  aiWhitelist: {
    enabled: process.env.AI_WHITELIST_ENABLED === 'true',
    phones: (process.env.AI_WHITELIST_PHONES || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean),
  },
});
