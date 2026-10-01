/**
 * Shared Axios instance for the Lucas API.
 *
 * Base URL points at the NestJS backend `/api/v1` prefix (see design.md —
 * API Endpoints). The base URL is read from an Expo public env var so it can
 * be overridden per environment; it falls back to localhost for development.
 *
 * This is a minimal client. Auth token injection + refresh interceptors are
 * added in later auth tasks.
 */
import axios from 'axios';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});
