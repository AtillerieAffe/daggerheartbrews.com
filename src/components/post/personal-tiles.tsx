'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type {
  AdversaryDetails,
  CardDetails,
  UserAdversary,
  UserCard,
} from '@/lib/types';
import { useAdversaryActions, useCardActions } from '@/store';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { CardPreview } from '../card-creation/preview';
import { mergeCardSettings } from '@/lib/constants';
import { AdversaryPreviewStatblock } from '../adversary-creation/preview/statblock';

type PersonalCardTileProps = React.ComponentProps<'div'> & {
  cardPreview: CardDetails;
  userCard: UserCard;
};

export const PersonalCardTile: React.FC<PersonalCardTileProps> = ({
  cardPreview,
  userCard,
}) => {
  const router = useRouter();
  const { setUserCard, setCardDetails, setSettings } = useCardActions();
  const [visiblility, setVisibility] = React.useState(userCard.public);
  const mergedSettings = React.useMemo(
    () => mergeCardSettings(cardPreview.settings ?? undefined),
    [cardPreview.settings],
  );

  const handleEdit = () => {
    setUserCard(userCard);
    setCardDetails(cardPreview);
    setSettings(mergedSettings);
    router.push('/card/create');
  };

  const updateVisibility = async () => {
    const nextVisibility = !visiblility;
    try {
      setVisibility(nextVisibility);
      const res = await fetch(`/api/community/cards/${userCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({ public: nextVisibility }),
      });
      const data = await res.json();
      if (!data.success) throw Error('Unable to update visibility');
      toast.success(`Card visibility set to ${nextVisibility ? 'public' : 'draft'}.`);
    } catch {
      toast.error('Something went wrong. Card visibility unable to change.');
      setVisibility(!nextVisibility);
    }
  };

  const deleteCard = async () => {
    try {
      const res = await fetch(`/api/community/cards/${userCard.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw Error('Something went wrong');
      toast.success('Deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Unable to delete card.');
    }
  };

  return (
    <div className='bg-card flex flex-col rounded-lg border p-3'>
      <div className='flex items-center justify-center'>
        <CardPreview
          card={cardPreview}
          settings={mergedSettings}
        />
      </div>
      <div className='mt-3 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='text-sm'>Public</span>
          <Switch checked={visiblility} onCheckedChange={updateVisibility} />
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='secondary' onClick={handleEdit}>
            Edit
          </Button>
          <Button size='sm' variant='destructive' onClick={deleteCard}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

type PersonalAdversaryTileProps = React.ComponentProps<'div'> & {
  adversaryPreview: AdversaryDetails;
  userAdversary: UserAdversary;
};

export const PersonalAdversaryTile: React.FC<PersonalAdversaryTileProps> = ({
  adversaryPreview,
  userAdversary,
}) => {
  const router = useRouter();
  const { setAdversaryDetails, setUserAdversary } = useAdversaryActions();
  const [visiblility, setVisibility] = React.useState(userAdversary.public);

  const handleEdit = () => {
    setUserAdversary(userAdversary);
    setAdversaryDetails(adversaryPreview);
    router.push('/adversary/create');
  };

  const updateVisibility = async () => {
    const nextVisibility = !visiblility;
    try {
      setVisibility(nextVisibility);
      const res = await fetch(`/api/community/adversary/${userAdversary.id}`, {
        method: 'PUT',
        body: JSON.stringify({ public: nextVisibility }),
      });
      const data = await res.json();
      if (!data.success) throw Error('Unable to update visibility');
      toast.success(`Adversary visibility set to ${nextVisibility ? 'public' : 'draft'}.`);
    } catch {
      toast.error('Something went wrong. Adversary visibility unable to change.');
      setVisibility(!nextVisibility);
    }
  };

  const deleteAdversary = async () => {
    try {
      const res = await fetch(`/api/community/adversary/${userAdversary.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw Error('Something went wrong');
      toast.success('Deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Unable to delete adversary.');
    }
  };

  return (
    <div className='bg-card flex flex-col rounded-lg border p-3'>
      <AdversaryPreviewStatblock adversary={adversaryPreview} />
      <div className='mt-3 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='text-sm'>Public</span>
          <Switch checked={visiblility} onCheckedChange={updateVisibility} />
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='secondary' onClick={handleEdit}>
            Edit
          </Button>
          <Button size='sm' variant='destructive' onClick={deleteAdversary}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
