import api from './api';
import {
  listPermisos as _listPermisos,
  type Permiso as PermisoFromPermisosService,
} from './permisos.service';

export type Permiso = PermisoFromPermisosService;

export type Rol = {
  id: number;
  nombre: string;
  permisos?: Permiso[];
};

export async function listPermisos(): Promise<Permiso[]> {
  return _listPermisos();
}

export async function listRoles(): Promise<Rol[]> {
  const res = await api.get('/roles');
  return res.data;
}

export async function getRol(id: string | number): Promise<Rol> {
  const res = await api.get(`/roles/${id}`);
  return res.data;
}

export async function createRol(input: { nombre: string; permisos: Permiso[] }): Promise<Rol> {
  const res = await api.post('/roles', input);
  return res.data;
}

export async function updateRol(id: string | number, input: { nombre: string; permisos: Permiso[] }): Promise<Rol> {
  const res = await api.put(`/roles/${id}`, input);
  return res.data;
}

export async function deleteRol(id: string | number): Promise<void> {
  await api.delete(`/roles/${id}`);
}

