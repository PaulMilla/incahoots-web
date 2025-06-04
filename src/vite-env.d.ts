/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AUTH_URL: string
  readonly VITE_FIRESTORE_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}