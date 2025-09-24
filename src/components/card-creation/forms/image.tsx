'use client';

import * as React from 'react';

import { formatBytes, useFileUpload } from '@/hooks/use-file-upload';
import { Button } from '@/components/ui/button';
import { UploadIcon, X } from 'lucide-react';
import { useCardActions, useCardStore } from '@/store';
import {
  type Area,
  ImageCropper,
  ImageCropperArea,
  ImageCropperImage,
} from '@/components/common';
import { FormContainer } from '@/components/common/form';
import { CollapsibleContent } from '@radix-ui/react-collapsible';
import { fileToBase64 } from '@/lib/utils';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

const CROP_ASPECT_RATIO = 1;
const MIN_CROP_ZOOM = 0.2;
const CROP_ZOOM_SENSITIVITY = 2e-3;

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImage = async (
  url: string,
  area: Area,
): Promise<Blob | null> => {
  try {
    const image = await createImage(url);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    canvas.width = area.width;
    canvas.height = area.height;
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      area.width,
      area.height,
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject();
        }
      }, 'image/png');
    });
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const ImageForm = () => {
  const {
    card: { image, backgroundImage },
  } = useCardStore();
  const { setCardDetails } = useCardActions();
  // Foreground image upload
  const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    accept: 'image/*',
    initialFiles: React.useMemo(() => {
      if (!image) return [];
      const isData = image.startsWith('data:');
      // Best-effort mime detection from data URL
      const mime = isData
        ? image.substring(5, image.indexOf(';')) // between 'data:' and ';'
        : 'image/png';
      return [
        {
          id: 'foreground-initial',
          name: 'saved-foreground',
          size: 0,
          type: mime,
          url: image,
        },
      ];
    }, [image]) as any,
  });
  // Background image upload
  const [
    { files: bgFiles },
    { removeFile: removeBgFile, openFileDialog: openBgDialog, getInputProps: getBgInputProps },
  ] = useFileUpload({
    accept: 'image/*',
    initialFiles: React.useMemo(() => {
      if (!backgroundImage) return [];
      const isData = backgroundImage.startsWith('data:');
      const mime = isData
        ? backgroundImage.substring(5, backgroundImage.indexOf(';'))
        : 'image/png';
      return [
        {
          id: 'background-initial',
          name: 'saved-background',
          size: 0,
          type: mime,
          url: backgroundImage,
        },
      ];
    }, [backgroundImage]) as any,
  });
  const [file] = files;
  const [bgFile] = bgFiles;

  React.useEffect(() => {
    const run = async () => {
      // No newly selected file: keep existing image as-is
      if (!file) return;
      // If we have a freshly selected File, convert to base64 so it persists
      const f = file.file;
      if (f instanceof File) {
        try {
          const b64 = await fileToBase64(f);
          setCardDetails({ image: b64 });
        } catch {
          // leave existing image untouched on error
        }
      } else if (file.preview?.startsWith('data:')) {
        // Already a data URL
        setCardDetails({ image: file.preview });
      } else {
        // leave existing image untouched
      }
    };
    run();
  }, [file, setCardDetails]);

  React.useEffect(() => {
    const run = async () => {
      // No newly selected background file: keep existing background image
      if (!bgFile) return;
      const f = bgFile.file;
      if (f instanceof File) {
        try {
          const b64 = await fileToBase64(f);
          setCardDetails({ backgroundImage: b64 });
        } catch {
          // leave existing background image untouched on error
        }
      } else if (bgFile.preview?.startsWith('data:')) {
        setCardDetails({ backgroundImage: bgFile.preview });
      } else {
        // leave existing background image untouched
      }
    };
    run();
  }, [bgFile, setCardDetails]);

  const handleCropApply = React.useCallback(
    async (area: Area | null, preview?: string, current?: string) => {
      if (area && preview) {
        const blob = await getCroppedImage(preview, area);
        if (blob) {
          const cropped = await fileToBase64(blob);
          if (current !== cropped) {
            setCardDetails({ image: cropped });
          }
        }
      }
    },
    [setCardDetails],
  );

  const handleCropChange = useDebouncedCallback(
    (area: Area | null) => handleCropApply(area, file?.preview, image),
    200,
  );

  const handleBgCropApply = React.useCallback(
    async (area: Area | null, preview?: string, current?: string) => {
      if (area && preview) {
        const blob = await getCroppedImage(preview, area);
        if (blob) {
          const cropped = await fileToBase64(blob);
          if (current !== cropped) {
            setCardDetails({ backgroundImage: cropped });
          }
        }
      }
    },
    [setCardDetails],
  );

  const handleBgCropChange = useDebouncedCallback(
    (area: Area | null) => handleBgCropApply(area, bgFile?.preview, backgroundImage),
    200,
  );

  return (
    <FormContainer title='Card Image' collapsible defaultOpen>
      <div className='space-y-2'>
        <div className='flex flex-col gap-2'>
          <Button
            variant='outline'
            className='h-10 bg-white'
            onClick={openFileDialog}
          >
            <UploadIcon className='size-3' />
            Add Image
          </Button>
          <input
            {...getInputProps()}
            className='sr-only'
            aria-label='Upload image file'
            tabIndex={-1}
          />
          {file ? (
            <div className='dark:bg-input/30 flex items-center justify-between gap-2 rounded-md border bg-white p-2'>
              <div className='flex items-center gap-4 overflow-hidden'>
                <div className='bg-accent aspect-square shrink-0 rounded'>
                  <img
                    className='size-10 rounded-[inherit] object-cover'
                    src={file.preview}
                    alt={file.file.name}
                  />
                </div>
                <div>
                  <p className='truncate text-sm font-medium'>
                    {file.file.name}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {formatBytes(file.file.size)}
                  </p>
                </div>
              </div>
              <Button
                size='icon'
                variant='ghost'
                onClick={() => removeFile(file.id)}
                aria-label='Remove file'
              >
                <X aria-hidden='true' />
              </Button>
            </div>
          ) : null}
        </div>
        <CollapsibleContent>
          {file?.preview ? (
            <ImageCropper
              key={file.preview}
              className='h-64 rounded'
              image={file.preview}
              aspectRatio={CROP_ASPECT_RATIO}
              minZoom={MIN_CROP_ZOOM}
              zoomSensitivity={CROP_ZOOM_SENSITIVITY}
              onCropChange={handleCropChange}
            >
              <ImageCropperImage />
              <ImageCropperArea />
            </ImageCropper>
          ) : null}
        </CollapsibleContent>

        {/* Background Image */}
        <div className='mt-4 flex flex-col gap-2'>
          <Button
            variant='outline'
            className='h-10 bg-white'
            onClick={openBgDialog}
          >
            <UploadIcon className='size-3' />
            Add Background Image
          </Button>
          <input
            {...getBgInputProps()}
            className='sr-only'
            aria-label='Upload background image file'
            tabIndex={-1}
          />
          {bgFile ? (
            <div className='dark:bg-input/30 flex items-center justify-between gap-2 rounded-md border bg-white p-2'>
              <div className='flex items-center gap-4 overflow-hidden'>
                <div className='bg-accent aspect-square shrink-0 rounded'>
                  <img
                    className='size-10 rounded-[inherit] object-cover'
                    src={bgFile.preview}
                    alt={bgFile.file.name}
                  />
                </div>
                <div>
                  <p className='truncate text-sm font-medium'>
                    {bgFile.file.name}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {formatBytes(bgFile.file.size)}
                  </p>
                </div>
              </div>
              <Button
                size='icon'
                variant='ghost'
                onClick={() => removeBgFile(bgFile.id)}
                aria-label='Remove background file'
              >
                <X aria-hidden='true' />
              </Button>
            </div>
          ) : null}
        </div>
        <CollapsibleContent>
          {bgFile?.preview ? (
            <ImageCropper
              key={bgFile.preview}
              className='h-64 rounded'
              image={bgFile.preview}
              aspectRatio={CROP_ASPECT_RATIO}
              minZoom={MIN_CROP_ZOOM}
              zoomSensitivity={CROP_ZOOM_SENSITIVITY}
              onCropChange={handleBgCropChange}
            >
              <ImageCropperImage />
              <ImageCropperArea />
            </ImageCropper>
          ) : null}
        </CollapsibleContent>
      </div>
    </FormContainer>
  );
};
