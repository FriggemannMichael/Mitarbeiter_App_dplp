/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly BASE_URL: string
  readonly VITE_COMPANY_NAME: string
  readonly VITE_COMPANY_ADDRESS: string
  readonly VITE_COMPANY_PHONE: string
  readonly VITE_COMPANY_EMAIL: string
  readonly VITE_API_URL?: string
  readonly VITE_CUSTOMER_KEY?: string
  readonly VITE_SKIP_API?: string
  readonly VITE_CONFIG_PATH?: string
  readonly VITE_FORCE_API?: string
  readonly VITE_PRIMARY_COLOR?: string
  readonly VITE_THEME_COLOR?: string
  readonly VITE_ALLOWED_EMAILS: string
  readonly VITE_DEFAULT_EMAIL: string
  readonly VITE_ALLOWED_WHATSAPP: string
  readonly VITE_DEFAULT_WHATSAPP: string
  readonly VITE_ADMIN_PASSWORD: string
  readonly VITE_COMPANY_CODE: string
  readonly VITE_EXPECTED_CODE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_FILENAME_PATTERN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
