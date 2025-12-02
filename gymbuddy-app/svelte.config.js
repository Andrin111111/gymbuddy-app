// svelte.config.js
import adapter from '@sveltejs/adapter-auto';

const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib'
      // hier könntest du später weitere Aliase ergänzen, z.B.
      // $components: 'src/components'
    }
  }
};

export default config;
