import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, ProgressBar, SearchInput, Select } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { TallerFormModal } from '@/features/talleres/TallerForm';
import { normalizeText } from '@/lib/format';
import { ocupacion } from '@/services/domain';
import { useData } from '@/store/DataContext';
import type { Taller } from '@/types';

export default function TalleresPage() {
  const { db, deleteTaller } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'Todos' | 'Activos' | 'Inactivos'>('Activos');
  const [nuevo, setNuevo] = useState(false);
  const [edit, setEdit] = useState<Taller | undefined>();

  const list = useMemo(() => {
    const query = normalizeText(q.trim());
    return [...db.talleres]
      .filter((t) => {
        if (estado === 'Activos' && !t.activo) return false;
        if (estado === 'Inactivos' && t.activo) return false;
        if (!query) return true;
        return (
          normalizeText(t.nombre).includes(query) ||
          normalizeText(t.id).includes(query) ||
          normalizeText(t.diasHorarios).includes(query) ||
          t.terapeutas.some((x) => normalizeText(x).includes(query))
        );
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [db.talleres, q, estado]);

  const remove = async (t: Taller) => {
    const ok = await confirm({
      title: 'Eliminar taller',
      message: <>¿Eliminar el taller <strong>{t.nombre}</strong>? Los pacientes no se borran; solo se pierde la inscripción.</>,
      confirmLabel: 'Eliminar taller',
    });
    if (!ok) return;
    try {
      await deleteTaller(t.id);
      toast('Taller eliminado.');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <PageHeader
        title="Talleres"
        description="Espacios grupales y dispositivos terapéuticos/comunitarios. Cupo, terapeutas e inscriptos."
        actions={<Button onClick={() => setNuevo(true)}><Plus className="size-4" />Nuevo taller</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <SearchInput className="sm:col-span-2" value={q} onChange={setQ} placeholder="Buscar por nombre, ID, horario o terapeuta..." />
          <Select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} aria-label="Estado">
            <option value="Todos">Todos</option>
            <option value="Activos">Solo activos</option>
            <option value="Inactivos">Solo inactivos</option>
          </Select>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersRound className="size-6" />}
            title="Sin talleres"
            description={db.talleres.length === 0 ? 'Creá el primer taller para organizar los dispositivos grupales.' : 'No hay talleres con estos filtros.'}
            action={<Button onClick={() => setNuevo(true)}><Plus className="size-4" />Nuevo taller</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((t) => {
            const o = ocupacion(t);
            return (
              <Card key={t.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{t.nombre}</h2>
                      <Badge tone={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge>
                      {o.completo && <Badge tone="warning">Cupo completo</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{t.id} · {t.diasHorarios}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <IconButton label="Editar taller" onClick={() => setEdit(t)}><Pencil className="size-4" /></IconButton>
                    <IconButton label="Eliminar taller" onClick={() => remove(t)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>
                  </div>
                </div>

                <div className="flex-1 space-y-4 p-5">
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Ocupación</span>
                      <span className="text-slate-600">{o.inscriptos} de {o.cupo} cupos</span>
                    </div>
                    <ProgressBar value={o.porcentaje} tone={o.completo ? 'amber' : 'brand'} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Terapeutas a cargo</p>
                    <p className="mt-1 text-sm text-slate-700">{t.terapeutas.length ? t.terapeutas.join(' · ') : 'Sin asignar'}</p>
                  </div>

                  {t.objetivos && (
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Objetivos</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{t.objetivos}</p>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Pacientes inscriptos</p>
                    {t.inscriptos.length === 0 ? (
                      <p className="text-sm text-slate-500">Todavía no hay inscriptos.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {t.inscriptos.map((pid) => {
                          const p = db.pacientes.find((x) => x.id === pid);
                          return (
                            <li key={pid} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                              {p ? (
                                <Link to={`/pacientes/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.nombre}</Link>
                              ) : (
                                <span className="text-slate-500">{pid}</span>
                              )}
                              <span className="text-xs text-slate-400">{pid}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TallerFormModal open={nuevo} onClose={() => setNuevo(false)} />
      <TallerFormModal open={!!edit} onClose={() => setEdit(undefined)} taller={edit} />
    </>
  );
}
