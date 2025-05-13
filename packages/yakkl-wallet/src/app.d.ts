/// <reference types="@sveltejs/kit" />
// ///<reference types="webextension-polyfill" />

// See https://kit.svelte.dev/docs/types#app.d.ts
// for information about these interfaces
declare global {
  const __DEV__: boolean;
  const __PROD__: boolean;
  const __LOG_LEVEL__: string;
  // const browser_ext: typeof import('webextension-polyfill');

  declare namespace App {
    // interface Locals {}
    // interface Platform {}
    // interface Session {}
    // interface Stuff {}
  }
}

export {};
