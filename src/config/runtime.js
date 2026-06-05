export const API_PORT = import.meta.env.VITE_API_PORT || '4311';
export const API_BASE = import.meta.env.VITE_API_BASE || `http://localhost:${API_PORT}`;
export const WS_BASE = import.meta.env.VITE_WS_BASE || API_BASE.replace(/^http/, 'ws');
