export interface IntegrationStatus {
  id: string
  name: string
  category: string
  type: string
  status: 'CONFIGURED' | 'UNCONFIGURED'
  statusText: string
  description: string
  requiredKeys: string[]
  configuredKeys: string[]
}

export class PlatformIntegrationService {
  getIntegrations(): IntegrationStatus[] {
    const mpesaKeys = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY']
    const configuredMpesa = mpesaKeys.filter((k) => Boolean(process.env[k]))
    const isMpesaConfigured = Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET)

    const geminiKeys = ['GEMINI_API_KEY']
    const configuredGemini = geminiKeys.filter((k) => Boolean(process.env[k]))
    const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY)

    const smsKeys = ['AFRICASTALKING_API_KEY', 'AFRICASTALKING_USERNAME']
    const configuredSms = smsKeys.filter((k) => Boolean(process.env[k]))
    const isSmsConfigured = Boolean(process.env.AFRICASTALKING_API_KEY || process.env.TWILIO_AUTH_TOKEN)

    const s3Keys = ['AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    const configuredS3 = s3Keys.filter((k) => Boolean(process.env[k]))
    const isS3Configured = Boolean(process.env.AWS_S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET)

    return [
      {
        id: 'mpesa',
        name: 'M-Pesa Daraja 2.0 API',
        category: 'Mobile Payments',
        type: 'Primary Payment Gateway',
        status: isMpesaConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        statusText: isMpesaConfigured
          ? 'Credentials active in environment'
          : 'Pending MPESA_CONSUMER_KEY in .env',
        description:
          'Safaricom Daraja API for automated STK Push, customer split payments, and instant C2B reconciliations.',
        requiredKeys: mpesaKeys,
        configuredKeys: configuredMpesa,
      },
      {
        id: 'gemini',
        name: 'Google Gemini AI Studio',
        category: 'Intelligence',
        type: 'Core AI Provider',
        status: isGeminiConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        statusText: isGeminiConfigured
          ? 'Active API key verified'
          : 'Pending GEMINI_API_KEY in .env',
        description:
          'Powers natural language sales analytics, stock velocity advisories, and smart retail inventory queries.',
        requiredKeys: geminiKeys,
        configuredKeys: configuredGemini,
      },
      {
        id: 'sms',
        name: "Africa's Talking / Twilio SMS Gateway",
        category: 'Messaging',
        type: 'Notification Service',
        status: isSmsConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        statusText: isSmsConfigured
          ? 'Gateway credentials loaded'
          : 'Pending AFRICASTALKING_API_KEY in .env',
        description:
          'Automated SMS alerts dispatched to business managers when critical inventory thresholds are breached.',
        requiredKeys: smsKeys,
        configuredKeys: configuredSms,
      },
      {
        id: 's3',
        name: 'Amazon S3 / Cloudflare R2 Object Storage',
        category: 'Cloud Storage',
        type: 'Infrastructure Backup & Media',
        status: isS3Configured ? 'CONFIGURED' : 'UNCONFIGURED',
        statusText: isS3Configured
          ? 'Cloud storage bucket active'
          : 'Local NVMe Active (S3 Archive Unconfigured)',
        description:
          'Off-site immutable database backup archive and high-volume product catalog media storage.',
        requiredKeys: s3Keys,
        configuredKeys: configuredS3,
      },
    ]
  }
}

export const platformIntegrationService = new PlatformIntegrationService()
