// svelte.config.js
import adapter from '@sveltejs/adapter-netlify';

const config = {
  kit: {
    adapter: adapter({
      // Standard (Node-based) Netlify Functions
      edge: false
    }),
    alias: {
      $lib: 'src/lib'
    }
  }
};

export default config;
