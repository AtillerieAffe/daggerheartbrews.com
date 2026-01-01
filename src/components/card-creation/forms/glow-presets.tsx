'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GlowPreset } from '@/lib/types';

const formatStrength = (strength: number) =>
  `${Math.round(Math.max(0, strength) * 100)}%`;

const formatRadius = (radius: number) => `${Math.round(radius)}px`;

type GlowPresetControlsProps = {
  onApply(preset: Pick<GlowPreset, 'color' | 'strength' | 'radius'>): void;
  currentColor: string;
  currentStrength: number;
  currentRadius: number;
};

export const GlowPresetControls: React.FC<GlowPresetControlsProps> = ({
  onApply,
  currentColor,
  currentStrength,
  currentRadius,
}) => {
  const [presets, setPresets] = React.useState<GlowPreset[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [loadingPresets, setLoadingPresets] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [savingPreset, setSavingPreset] = React.useState(false);
  const [deletingPreset, setDeletingPreset] = React.useState(false);

  const colorValue = currentColor || '#ffffff';
  const strengthValue = Number.isFinite(currentStrength)
    ? Math.max(0, currentStrength)
    : 0.7;
  const radiusValue = Number.isFinite(currentRadius) ? currentRadius : 12;

  const loadPresets = React.useCallback(async () => {
    try {
      setLoadingPresets(true);
      const res = await fetch('/api/glow-presets');
      if (res.status === 401) {
        setPresets([]);
        return;
      }
      if (!res.ok) {
        throw new Error('Glow presets konnten nicht geladen werden.');
      }
      const json = (await res.json()) as { success?: boolean; data?: GlowPreset[] };
      if (Array.isArray(json.data)) {
        setPresets(json.data);
      } else {
        setPresets([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Glow-Presets.';
      toast.error(message);
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  const handleApply = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      onApply({ color: preset.color, strength: preset.strength, radius: preset.radius });
      toast.success(`Preset "${preset.name}" geladen.`);
    },
    [presets, onApply],
  );

  const handleSave = React.useCallback(async () => {
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      toast.error('Bitte gib einen Namen für das Preset an.');
      return;
    }
    try {
      setSavingPreset(true);
      const res = await fetch('/api/glow-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          color: colorValue,
          strength: strengthValue,
          radius: radiusValue,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message = json?.error || 'Glow-Preset konnte nicht gespeichert werden.';
        throw new Error(message);
      }
      const json = (await res.json()) as { data: GlowPreset };
      const created = json.data;
      setPresets((prev) => [...prev, created]);
      setSelectedId(created.id);
      setSaveDialogOpen(false);
      setPresetName('');
      toast.success('Glow-Preset gespeichert.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern des Glow-Presets.';
      toast.error(message);
    } finally {
      setSavingPreset(false);
    }
  }, [presetName, colorValue, strengthValue, radiusValue]);

  const existingMatchingPreset = React.useMemo(() => {
    return presets.find(
      (preset) =>
        preset.color.toLowerCase() === colorValue.toLowerCase() &&
        Math.abs(preset.strength - strengthValue) < 0.005 &&
        Math.abs(preset.radius - radiusValue) < 0.5,
    );
  }, [presets, colorValue, strengthValue, radiusValue]);

  React.useEffect(() => {
    if (selectedId && !presets.some((preset) => preset.id === selectedId)) {
      setSelectedId('');
    }
  }, [presets, selectedId]);

  const handleDelete = React.useCallback(async () => {
    const currentId = selectedId || existingMatchingPreset?.id;
    if (!currentId) {
      toast.error('Bitte wähle zuerst ein Preset aus.');
      return;
    }
    const preset = presets.find((p) => p.id === currentId);
    if (!preset) {
      toast.error('Preset wurde nicht gefunden.');
      return;
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(`Preset "${preset.name}" wirklich löschen?`)
        : true;
    if (!confirmed) return;
    try {
      setDeletingPreset(true);
      const res = await fetch(`/api/glow-presets/${preset.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message = json?.error || 'Glow-Preset konnte nicht gelöscht werden.';
        throw new Error(message);
      }
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
      setSelectedId((prev) => (prev === preset.id ? '' : prev));
      toast.success(`Preset "${preset.name}" gelöscht.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen des Glow-Presets.';
      toast.error(message);
    } finally {
      setDeletingPreset(false);
    }
  }, [selectedId, presets, existingMatchingPreset]);

  React.useEffect(() => {
    if (existingMatchingPreset) {
      setSelectedId(existingMatchingPreset.id);
    }
  }, [existingMatchingPreset]);

  return (
    <div className='mt-3 space-y-2 rounded-md border border-slate-800/30 bg-slate-900/30 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-medium text-slate-100'>Glow-Presets</p>
        <div className='flex items-center gap-1.5'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => void loadPresets()}
            disabled={loadingPresets}
          >
            {loadingPresets ? 'Laden…' : 'Aktualisieren'}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => void handleDelete()}
            disabled={deletingPreset || (!selectedId && !existingMatchingPreset)}
            aria-label='Preset löschen'
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>
      <p className='text-xs text-slate-300'>Wähle ein Preset aus, um die gespeicherten Glow-Einstellungen anzuwenden.</p>
      <Select
        value={selectedId || undefined}
        onValueChange={handleApply}
        disabled={!presets.length || loadingPresets}
      >
        <SelectTrigger className='w-full justify-between'>
          <SelectValue placeholder={loadingPresets ? 'Lade Presets…' : 'Preset auswählen'} />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              <span className='flex items-center gap-2'>
                <span
                  className='size-4 rounded border border-white/20'
                  style={{ backgroundColor: preset.color }}
                />
                <span className='flex flex-col text-left'>
                  <span className='text-sm font-medium'>{preset.name}</span>
                  <span className='text-xs text-muted-foreground'>
                    {formatStrength(preset.strength)} • {formatRadius(preset.radius)}
                  </span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button className='w-full' variant='secondary'>
            Glow-Preset speichern
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Glow-Preset speichern</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='glow-preset-name'>Name</Label>
              <Input
                id='glow-preset-name'
                value={presetName}
                placeholder='Preset-Name'
                onChange={(event) => setPresetName(event.target.value)}
                autoFocus
              />
            </div>
            <div className='grid grid-cols-3 gap-2 rounded-md border border-border p-3 text-xs text-slate-200'>
              <div className='space-y-1'>
                <span className='block text-muted-foreground'>Farbe</span>
                <span className='flex items-center gap-2'>
                  <span
                    className='size-4 rounded border border-white/20'
                    style={{ backgroundColor: colorValue }}
                  />
                  <span>{colorValue}</span>
                </span>
              </div>
              <div className='space-y-1'>
                <span className='block text-muted-foreground'>Stärke</span>
                <span>{formatStrength(strengthValue)}</span>
              </div>
              <div className='space-y-1'>
                <span className='block text-muted-foreground'>Radius</span>
                <span>{formatRadius(radiusValue)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setSaveDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => void handleSave()} disabled={savingPreset}>
              {savingPreset ? 'Speichere…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
