import api from './api';

export type Consolidado = {
  id: number;
  numeroGuia?: string | null;
  pesoTotalLbs?: number | null;
  pesoTotalKgs?: number | null;
  estado?: string | null;
  paquetes?: { id: number; numeroGuia?: string }[];
};

export async function listConsolidados(): Promise<Consolidado[]> {
  const res = await api.get('/consolidados');
  return res.data;
}

export async function getConsolidado(id: string | number): Promise<Consolidado> {
  const res = await api.get(`/consolidados/${id}`);
  return res.data;
}

export async function createConsolidado(input?: { numeroGuia?: string | null }): Promise<Consolidado> {
  const res = await api.post('/consolidados', input ?? {});
  return res.data;
}

export async function addPaqueteToConsolidado(consolidadoId: string | number, paqueteId: string | number): Promise<void> {
  await api.post(`/consolidados/${consolidadoId}/paquetes/${paqueteId}`);
}

export async function removePaqueteFromConsolidado(consolidadoId: string | number, paqueteId: string | number): Promise<Consolidado> {
  const res = await api.delete(`/consolidados/${consolidadoId}/paquetes/${paqueteId}`);
  return res.data;
}

export async function updateConsolidado(consolidadoId: string | number, input: { numeroGuia?: string | null }): Promise<Consolidado> {
  const res = await api.put(`/consolidados/${consolidadoId}`, input);
  return res.data;
}

export async function cerrarConsolidado(consolidadoId: string | number, input: { numeroGuia?: string | null }): Promise<Consolidado> {
  const res = await api.put(`/consolidados/${consolidadoId}/cerrar`, input);
  return res.data;
}

export async function abrirConsolidado(consolidadoId: string | number): Promise<Consolidado> {
  const res = await api.put(`/consolidados/${consolidadoId}/abrir`, {});
  return res.data;
}

export async function deleteConsolidado(id: string | number): Promise<void> {
  await api.delete(`/consolidados/${id}`);
}

