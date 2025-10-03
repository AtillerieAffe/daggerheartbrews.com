import * as React from 'react';

export const Thresholds: React.FC<{
  thresholds?: [number, number];
  thresholdsEnabled?: boolean;
}> = ({ thresholds, thresholdsEnabled }) => {
  if (!thresholdsEnabled) {
    return null;
  }
  return (
    <div
      className='relative flex items-center'
      style={{ height: 42, width: 300 }}
    >
      <img
        src='/assets/card/damage-thresholds.webp'
        alt='damage-thresholds'
        className='absolute inset-0 h-full w-full object-cover'
        loading='eager'
        decoding='sync'
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'fill' }}
      />
      <div
        className='z-10 flex flex-col justify-center text-center'
        style={{
          paddingTop: 20,
          width: 70,
          gap: 6,
        }}
      >
        <div
          className='text-sm font-semibold text-white uppercase'
          style={{ fontSize: 12 }}
        >
          Minor Damage
        </div>
        <div className='text-xs text-black'>Mark 1 HP</div>
      </div>
      <div className='text-center font-bold' style={{ width: 45 }}>
        {thresholds ? thresholds[0] : 0}
      </div>

      <div
        className='z-10 flex flex-col justify-center text-center'
        style={{
          paddingTop: 20,
          width: 70,
          gap: 6,
        }}
      >
        <div
          className='text-sm font-semibold text-white uppercase'
          style={{ fontSize: 12 }}
        >
          Major Damage
        </div>
        <div className='text-xs text-black'>Mark 2 HP</div>
      </div>
      <div className='text-center font-bold' style={{ width: 45 }}>
        {thresholds ? thresholds[1] : 0}
      </div>

      <div
        className='z-10 flex flex-col justify-center text-center'
        style={{
          paddingTop: 20,
          width: 70,
          gap: 6,
        }}
      >
        <div
          className='text-sm font-semibold text-white uppercase'
          style={{ fontSize: 12 }}
        >
          Severe Damage
        </div>
        <div className='text-xs text-black'>Mark 3 HP</div>
      </div>
    </div>
  );
};
