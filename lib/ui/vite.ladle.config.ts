import tailwindcss from '@tailwindcss/vite';

// Ladle bundles its own Vite; a plain object avoids a direct vite dependency.
export default { plugins: [tailwindcss()] };
