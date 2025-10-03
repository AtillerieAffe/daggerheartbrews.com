import { useCardStore } from '@/store';
import type { CardDetails } from '@/lib/types';

type EquipmentProps = {
  cardOverride?: Pick<
    CardDetails,
    'tier' | 'tierEnabled' | 'hands' | 'handsEnabled' | 'armor' | 'armorEnabled'
  >;
};

export const Equipment: React.FC<EquipmentProps> = ({ cardOverride }) => {
  const fallbackCard = useCardStore((store) => store.card);
  const {
    tier,
    tierEnabled,
    hands,
    handsEnabled,
    armor,
    armorEnabled,
  } = cardOverride ?? fallbackCard;
  return (
    <>
      {tierEnabled && (
        <div className='absolute z-30' style={{ left: '24px', top: '24px' }}>
          <img className='size-10' src='/assets/card/level-bg.webp' />
          <div className='absolute inset-0 flex items-center justify-center'>
            <p
              className='z-10 font-bold text-black'
              style={{
                fontSize: '22px',
              }}
            >
              {tier}
            </p>
          </div>
        </div>
      )}
      {armorEnabled && (
        <div className='absolute z-30' style={{ right: '24px', top: '24px' }}>
          <img className='size-10' src='/assets/card/dh-armor-bg.webp' />
          <div className='absolute inset-0 flex items-center justify-center'>
            <p
              className='z-10 font-bold text-black'
              style={{
                fontSize: '22px',
              }}
            >
              {armor}
            </p>
          </div>
        </div>
      )}
      {handsEnabled && (
        <div className='absolute z-30' style={{ right: '24px', top: '24px' }}>
          <img
            className='h-8'
            src={`/assets/card/dh-${hands === 2 ? 'two-hands' : 'one-hand'}.webp`}
          />
        </div>
      )}
    </>
  );
};
