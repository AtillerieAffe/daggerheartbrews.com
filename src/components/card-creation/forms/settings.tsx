'use client';

import { CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useCardActions, useCardStore } from '@/store';
import { FormCheckbox } from '@/components/common/form/form-checkbox';
import { FormContainer } from '@/components/common/form';
import { GlowPresetControls } from './glow-presets';

export const SettingsForm = () => {
  const { settings } = useCardStore();
  const { setSettings } = useCardActions();
  return (
    <FormContainer className='w-full' title='Settings' collapsible>
      <CollapsibleContent>
        <div className='grid grid-cols-2 gap-2'>
          <FormCheckbox
            id='show-border'
            label='Show border?'
            checked={settings.border}
            onCheckedChange={(e) => {
              if (e !== 'indeterminate') {
                setSettings({ border: e });
              }
            }}
          />
          <FormCheckbox
            id='show-artist'
            label='Show artist?'
            checked={settings.artist}
            onCheckedChange={(e) => {
              if (e !== 'indeterminate') {
                setSettings({ artist: e });
              }
            }}
          />
          <FormCheckbox
            id='show-credits'
            label='Show credits?'
            checked={settings.credits}
            onCheckedChange={(e) => {
              if (e !== 'indeterminate') {
                setSettings({ credits: e });
              }
            }}
          />
          <FormCheckbox
            id='show-placeholder'
            label='Placeholder image?'
            checked={settings.placeholderImage}
            onCheckedChange={(e) => {
              if (e !== 'indeterminate') {
                setSettings({ placeholderImage: e });
              }
            }}
          />
        </div>
        {/* Background opacity slider */}
        <div className='mt-3 space-y-1'>
          <label htmlFor='background-opacity' className='text-sm font-medium'>
            Background opacity
          </label>
          <div className='flex items-center gap-3'>
            <input
              id='background-opacity'
              type='range'
              min={0}
              max={100}
              step={1}
              value={settings.backgroundImageOpacity ?? 100}
              onChange={(e) =>
                setSettings({ backgroundImageOpacity: Number(e.target.value) })
              }
              className='w-full'
            />
            <span className='w-10 text-right text-sm tabular-nums'>
              {(settings.backgroundImageOpacity ?? 100)}%
            </span>
          </div>
        </div>
        {/* Image size slider */}
        <div className='mt-3 space-y-1'>
          <label htmlFor='image-size' className='text-sm font-medium'>
            Image size
          </label>
          <div className='flex items-center gap-3'>
            <input
              id='image-size'
              type='range'
              min={40}
              max={140}
              step={1}
              value={settings.imageScale ?? 100}
              onChange={(e) => setSettings({ imageScale: Number(e.target.value) })}
              className='w-full'
            />
            <span className='w-10 text-right text-sm tabular-nums'>
              {(settings.imageScale ?? 100)}%
            </span>
          </div>
        </div>

        {/* Image rotation slider */}
        <div className='mt-3 space-y-1'>
          <label htmlFor='image-rotation' className='text-sm font-medium'>
            Image rotation
          </label>
          <div className='flex items-center gap-3'>
            <input
              id='image-rotation'
              type='range'
              min={-180}
              max={180}
              step={1}
              value={settings.imageRotation ?? 0}
              onChange={(e) => setSettings({ imageRotation: Number(e.target.value) })}
              className='w-full'
            />
            <span className='w-12 text-right text-sm tabular-nums'>
              {(settings.imageRotation ?? 0)}°
            </span>
          </div>
        </div>

        {/* Image vertical offset slider */}
        <div className='mt-3 space-y-1'>
          <label htmlFor='image-offset-y' className='text-sm font-medium'>
            Image vertical offset
          </label>
          <div className='flex items-center gap-3'>
            <input
              id='image-offset-y'
              type='range'
              min={-200}
              max={200}
              step={1}
              value={settings.imageOffsetY ?? 0}
              onChange={(e) => setSettings({ imageOffsetY: Number(e.target.value) })}
              className='w-full'
            />
            <span className='w-14 text-right text-sm tabular-nums'>
              {(settings.imageOffsetY ?? 0)}px
            </span>
          </div>
        </div>

        {/* Image horizontal flip toggle */}
        <div className='mt-3 flex items-center justify-between'>
          <span className='text-sm font-medium'>Flip image horizontally</span>
          <Button
            type='button'
            aria-pressed={!!settings.imageFlipHorizontal}
            variant={settings.imageFlipHorizontal ? 'secondary' : 'outline'}
            onClick={() =>
              setSettings({ imageFlipHorizontal: !settings.imageFlipHorizontal })
            }
            className='px-3'
          >
            {settings.imageFlipHorizontal ? 'Unflip' : 'Flip'}
          </Button>
        </div>

        {/* Glow toggle */}
        <div className='mt-3'>
          <FormCheckbox
            id='image-glow'
            label='Glow around image?'
            checked={!!settings.imageGlow}
            onCheckedChange={(v) =>
              v !== 'indeterminate' && setSettings({ imageGlow: v })
            }
          />
        </div>

        {settings.imageGlow ? (
          <>
            <div className='mt-2 grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <label htmlFor='glow-color' className='text-sm font-medium'>
                  Glow color
                </label>
                <input
                  id='glow-color'
                  type='color'
                  value={settings.imageGlowColor ?? '#ffffff'}
                  onChange={(e) => setSettings({ imageGlowColor: e.target.value })}
                  className='h-9 w-16 cursor-pointer rounded border'
                />
              </div>

              <div className='space-y-1'>
                <label htmlFor='glow-strength' className='text-sm font-medium'>
                  Glow strength
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    id='glow-strength'
                    type='range'
                    min={0}
                    max={400}
                    step={1}
                    value={Math.round((settings.imageGlowStrength ?? 0.7) * 100)}
                    onChange={(e) =>
                      setSettings({ imageGlowStrength: Number(e.target.value) / 100 })
                    }
                    className='w-full'
                  />
                  <span className='w-16 text-right text-sm tabular-nums'>
                    {Math.round((settings.imageGlowStrength ?? 0.7) * 100)}%
                  </span>
                </div>
              </div>

              <div className='col-span-2 space-y-1'>
                <label htmlFor='glow-radius' className='text-sm font-medium'>
                  Glow radius
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    id='glow-radius'
                    type='range'
                    min={0}
                    max={40}
                    step={1}
                    value={settings.imageGlowRadius ?? 12}
                    onChange={(e) => setSettings({ imageGlowRadius: Number(e.target.value) })}
                    className='w-full'
                  />
                  <span className='w-10 text-right text-sm tabular-nums'>
                    {(settings.imageGlowRadius ?? 12)}px
                  </span>
                </div>
              </div>
            </div>
            <GlowPresetControls
              currentColor={settings.imageGlowColor ?? '#ffffff'}
              currentStrength={settings.imageGlowStrength ?? 0.7}
              currentRadius={settings.imageGlowRadius ?? 12}
              onApply={(preset) =>
                setSettings({
                  imageGlow: true,
                  imageGlowColor: preset.color,
                  imageGlowStrength: preset.strength,
                  imageGlowRadius: preset.radius,
                })
              }
            />
          </>
        ) : null}
      </CollapsibleContent>
    </FormContainer>
  );
};
