import { useCardStore } from '@/store';

export const Stress = () => {
  const {
    card: { stress },
  } = useCardStore();
  return (
    <>
      <div
        className='absolute'
        style={{
          right: '24px',
          top: '24px',
        }}
      >
        <img
          src='/assets/card/stress-cost-bg.webp'
          style={{ height: '32px', width: '32px' }}
        />
      </div>
      <div
        className='absolute text-sm text-white'
        style={{ right: '40px', top: '29px' }}
      >
        {stress}
      </div>
    </>
  );
};
