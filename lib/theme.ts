/** Theme preference shared by the <head> script and the toggle. */
export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "me-theme";

/**
 * Inlined in <head> so the saved theme applies before the first paint (no
 * flash of the wrong theme). "system" means no attribute: CSS then follows
 * prefers-color-scheme.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
