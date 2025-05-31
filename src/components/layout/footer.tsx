import Link from 'next/link';
import { DaggerheartBrewsIcon } from '../icons';

export const Footer: React.FC = () => {
  return (
    <footer className='container'>
      <div className='mb-4 rounded-lg bg-neutral-900 p-4 text-neutral-200'>
        <div className='grid grid-cols-3 gap-2'>
          <div>
            <div className='mb-4 flex items-center gap-2'>
              <DaggerheartBrewsIcon
                src='/assets/images/dh-cgl-logo.png'
                height={30}
                width={30}
              />
              <h4 className='font-eveleth-clean hidden text-xl tracking-tight md:block'>
                Daggerheart Brews
              </h4>
            </div>
            <p className='text-left text-sm text-neutral-400'>
              Built by{' '}
              <a
                className='underline underline-offset-4'
                href='https://github.com/kelvin-mai'
              >
                kelvin-mai
              </a>
              . The soure code is availble on{' '}
              <a
                className='underline underline-offset-4'
                href='https://github.com/kelvin-mai/daggerheartbrews.com'
              >
                GitHub
              </a>
              .
            </p>
          </div>
          <div>
            <h4 className='mb-4 text-lg font-bold tracking-tight'>
              Quick Links
            </h4>
            <ul className='space-y-2'>
              <li>
                <Link href='/'>Home</Link>
              </li>
              <li>
                <Link href='/card/create'>Create</Link>
              </li>
              <li>
                <Link href='/game-master/screen'>GM Screen</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className='mb-4 text-lg font-bold tracking-tight'>Connect</h4>
            <a href='mailto:me@kelvinmai.io' target='_blank'>
              me@kelvinmai.io
            </a>
          </div>
        </div>
        <div className='pt-4 text-left text-sm text-neutral-400'>
          © {new Date().getFullYear()} Kelvin Mai. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
