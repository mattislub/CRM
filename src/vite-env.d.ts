/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANZILA_SUPPLIER_ID: string;
  readonly VITE_TRANZILA_API_KEY: string;
  readonly VITE_TRANZILA_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
