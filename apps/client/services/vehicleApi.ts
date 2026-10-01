/**
 * Vehicle API — React Query hooks for the Vehicle_Module (Requirement 4).
 *
 * Backed by the NestJS VehiclesController which operates on "the current
 * user's vehicle" (each user has at most one — vehicles.user_id is UNIQUE):
 *   • useVehicle       — GET    /vehicles/me  (returns the vehicle or null)
 *   • useCreateVehicle — POST   /vehicles
 *   • useUpdateVehicle — PATCH  /vehicles/me
 *   • useDeleteVehicle — DELETE /vehicles/me
 *
 * All reads/writes share the ['vehicle'] query key; mutations invalidate it on
 * success so the cached vehicle stays in sync.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from './api';
import type { ApiErrorBody } from './authApi';
import type { VehiclePayload } from './vehicleSchema';

/** The vehicle record returned by the Vehicle_Module. */
export interface Vehicle {
  id: string;
  userId: string;
  vehicleType: string;
  model: string;
  purchaseDate: string;
  soatExpiry: string;
  tecnomecanicaExpiry: string;
  kitExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields accepted by PATCH /vehicles/me — all optional. */
export type UpdateVehiclePayload = Partial<VehiclePayload>;

export type VehicleError = AxiosError<ApiErrorBody>;

/** Shared query key for the current user's vehicle. */
export const VEHICLE_QUERY_KEY = ['vehicle'] as const;

async function fetchVehicle(): Promise<Vehicle | null> {
  const { data } = await api.get<Vehicle | null>('/vehicles/me');
  return data;
}

/**
 * Reads the current user's vehicle (GET /vehicles/me). Resolves to `null`
 * when the user has not registered one yet.
 */
export function useVehicle(): UseQueryResult<Vehicle | null, VehicleError> {
  return useQuery<Vehicle | null, VehicleError>({
    queryKey: VEHICLE_QUERY_KEY,
    queryFn: fetchVehicle,
  });
}

async function createVehicle(payload: VehiclePayload): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>('/vehicles', payload);
  return data;
}

/**
 * Registers the current user's vehicle (POST /vehicles).
 *
 * A 409 Conflict means the user already has a vehicle; callers inspect
 * `error.response.status` to surface that message.
 */
export function useCreateVehicle(): UseMutationResult<
  Vehicle,
  VehicleError,
  VehiclePayload
> {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, VehicleError, VehiclePayload>({
    mutationFn: createVehicle,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEY });
    },
  });
}

async function updateVehicle(payload: UpdateVehiclePayload): Promise<Vehicle> {
  const { data } = await api.patch<Vehicle>('/vehicles/me', payload);
  return data;
}

/** Updates the current user's vehicle (PATCH /vehicles/me). */
export function useUpdateVehicle(): UseMutationResult<
  Vehicle,
  VehicleError,
  UpdateVehiclePayload
> {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, VehicleError, UpdateVehiclePayload>({
    mutationFn: updateVehicle,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEY });
    },
  });
}

async function deleteVehicle(): Promise<void> {
  await api.delete('/vehicles/me');
}

/** Removes the current user's vehicle (DELETE /vehicles/me). */
export function useDeleteVehicle(): UseMutationResult<
  void,
  VehicleError,
  void
> {
  const queryClient = useQueryClient();
  return useMutation<void, VehicleError, void>({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEY });
    },
  });
}
