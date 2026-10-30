/** Single source of truth for page and API paths. */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  dashboard: '/dashboard',
  importPlan: '/projects/new',
  project: (id: string) => `/projects/${id}`,
} as const;

export const API = {
  signup: '/api/auth/signup',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  projects: '/api/projects',
  project: (id: string) => `/api/projects/${id}`,
  aiFloorplan: '/api/ai/floorplan',
  aiFurnish: '/api/ai/furnish',
} as const;
