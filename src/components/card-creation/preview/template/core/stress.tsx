export const Stress = ({ stress }: { stress?: number }) => {
  return (
    <>
      <div
        className='absolute z-30'
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
        className='absolute z-40 text-sm text-white'
        style={{ right: '40px', top: '29px' }}
      >
        {stress}
      </div>
    </>
  );
};
