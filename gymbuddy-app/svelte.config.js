// svelte.config.js
import adapter from "@sveltejs/adapter-netlify";

const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $lib: "src/lib"
    }
  }
};

export default config;
