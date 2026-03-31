import api from './api';

export type Permiso = {
  id: number;
  nombre: string;
  descripcion?: string | null;
};

export async function listPermisos(): Promise<Permiso[]> {
  const res = await api.get('/permisos');
  return res.data;
}

export async function getPermiso(id: string | number): Promise<Permiso> {
  const res = await api.get(`/permisos/${id}`);
  return res.data;
}

export async function createPermiso(input: { nombre: string; descripcion?: string | null }): Promise<Permiso> {
  const res = await api.post('/permisos', input);
  return res.data;
}

export async function updatePermiso(
  id: string | number,
  input: { nombre: string; descripcion?: string | null }
): Promise<Permiso> {
  const res = await api.put(`/permisos/${id}`, input);
  return res.data;
}

export async function deletePermiso(id: string | number): Promise<void> {
  await api.delete(`/permisos/${id}`);
}

