import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  // Preprocessors
  preprocess: vitePreprocess(),
  
  // Compiler options
  compilerOptions: {
    runes: true
  }
};