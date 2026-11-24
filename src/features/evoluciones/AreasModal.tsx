import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, IconButton, Input, Modal } from '@/components/ui';
import { useFeedback } from '@/components/feedback';
import { normalizeText } from '@/lib/format';
import { useData } from '@/store/DataContext';

export function AreasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, saveArea, deleteArea } = useData();
  const { toast, toastError, confirm } = useFeedback();
  const [nuevo, setNuevo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const existe = (nombre: string, exceptId?: string) =>
    db.areas.some((a) => a.id !== exceptId && normalizeText(a.nombre) === normalizeText(nombre.trim()));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const nombre = nuevo.trim();
    if (!nombre) return;
    if (existe(nombre)) return toast('Ya existe un área con ese nombre.', 'error');
    try {
      await saveArea(nombre);
      setNuevo('');
      toast('Área agregada.');
    } catch (err) {
      toastError(err);
    }
  };

  const saveEdit = async (id: string) => {
    const nombre = editValue.trim();
    if (!nombre) return;
    if (existe(nombre, id)) return toast('Ya existe un área con ese nombre.', 'error');
    try {
      await saveArea(nombre, id);
      setEditId(null);
      toast('Área renombrada.');
    } catch (err) {
      toastError(err);
    }
  };

  const remove = async (id: string, nombre: string) => {
    const ok = await confirm({ title: 'Eliminar área', message: `¿Eliminar el área "${nombre}"?`, confirmLabel: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteArea(id);
      toast('Área eliminada.');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Áreas / especialidades" description="Agregá, renombrá o eliminá áreas. Los cambios se reflejan en todas las evoluciones."
      footer={<Button onClick={onClose}>Listo</Button>}>
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nueva área (ej. Nutrición)" aria-label="Nueva área" />
        <Button type="submit" disabled={!nuevo.trim()}><Plus className="size-4" />Agregar</Button>
      </form>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {db.areas.map((a) => {
          const usos = db.evoluciones.filter((e) => e.areaId === a.id).length;
          return (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              {editId === a.id ? (
                <>
                  <Input value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(a.id)} aria-label="Nombre del área" />
                  <IconButton label="Guardar" onClick={() => saveEdit(a.id)}><Check className="size-4" /></IconButton>
                  <IconButton label="Cancelar" onClick={() => setEditId(null)}><X className="size-4" /></IconButton>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-slate-800">{a.nombre}</span>
                  <span className="text-xs text-slate-400">{usos} evol.</span>
                  <IconButton label={`Renombrar ${a.nombre}`} onClick={() => { setEditId(a.id); setEditValue(a.nombre); }}><Pencil className="size-4" /></IconButton>
                  <IconButton label={`Eliminar ${a.nombre}`} onClick={() => remove(a.id, a.nombre)} className="hover:text-red-600"><Trash2 className="size-4" /></IconButton>
                </>
              )}
            </li>
          );
        })}
        {db.areas.length === 0 && <li className="px-3 py-4 text-sm text-slate-500">Todavía no hay áreas cargadas.</li>}
      </ul>
    </Modal>
  );
}
