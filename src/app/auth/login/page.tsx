import * as React from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';

import { AuthFormContainer, LoginForm } from '@/components/auth';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.session) {
    redirect('/');
  }
  return (
    <div className='flex items-center justify-center'>
      <div className='container w-full'>
        <AuthFormContainer
          title='Login to your account'
          description='Enter your email below to login to your account'
        >
          <LoginForm />
        </AuthFormContainer>
        <div className='my-2 text-center text-sm'>
          Don&apos;t have an account?{' '}
          <Link href='/auth/register' className='underline underline-offset-4'>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
