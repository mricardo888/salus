// API Configuration - uses environment variable in production, localhost in development
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
