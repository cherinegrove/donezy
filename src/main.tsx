
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Every deploy changes the content-hashed filenames of lazily-loaded page
// chunks (e.g. TimeTracking-DGqwnigu.js). A browser tab left open since
// before a deploy still holds a reference to the old, now-deleted filename,
// so navigating to a page it hasn't loaded yet fails with "Failed to fetch
// dynamically imported module". Vite fires this event specifically for that
// case — reload once to pick up the new build. The sessionStorage guard
// prevents a reload loop if the reload itself doesn't resolve it (e.g. a
// genuine network issue); it's cleared on every successful app load, so a
// later, unrelated deploy can still trigger one more retry.
const RELOAD_GUARD_KEY = "donezy-preload-reload-attempted";
sessionStorage.removeItem(RELOAD_GUARD_KEY);
window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    window.location.reload();
  }
});

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);
