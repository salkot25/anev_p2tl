/**
 * Configuration manager for Anev P2TL
 */

export const getBackendUrl = () => {
  return localStorage.getItem('p2tl_backend_url') || import.meta.env.VITE_BACKEND_URL || '';
};
