/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'stories/**/*.stories.tsx',
  viteConfig: 'vite.ladle.config.ts',
  addons: { width: { enabled: true, options: { phone: 390, desktop: 1280 }, defaultState: 0 } },
};
