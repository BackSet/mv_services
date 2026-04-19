import api from './api';
import { normalizeMe, type Me } from '@/services/auth.service';

export type UpdateMeInput = {
  username: string;
  email: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateMyShipperInput = {
  nombre: string;
  codigoInterno?: string | null;
  nombreEncargado?: string | null;
};

export type UpdateMeResponse = {
  me: Me;
  token?: string;
};

export async function updateMe(input: UpdateMeInput): Promise<UpdateMeResponse> {
  const res = await api.put('/auth/me', input);
  return res.data as UpdateMeResponse;
}

export async function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  await api.put('/auth/me/password', input);
}

export async function updateMyShipper(input: UpdateMyShipperInput): Promise<Me> {
  const res = await api.put('/auth/me/shipper', input);
  return normalizeMe(res.data);
}
