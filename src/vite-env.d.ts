/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BETA_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
