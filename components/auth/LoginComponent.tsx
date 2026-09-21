'use client';

import { Label } from '@radix-ui/react-label';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useEffect } from 'react';
import { useQueryState } from 'nuqs';
import { isPopupOrIframe } from '@/utils/frameCheck';
import { openCenteredPopup } from '@/utils/popup';

export default function LoginComponent() {
  const [callbackUrl] = useQueryState('callbackUrl', { defaultValue: '/' });

  useEffect(() => {
    // iframe 로그인 처리
    function handleMessage(event: MessageEvent) {
      if (event.data.type === 'LOGIN_SUCCESS') {
        window.location.replace(callbackUrl);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [callbackUrl]);

  return (
    <>
      <Languages className="w-20 h-20 text-indigo-600 shrink-0" />
      <div className="flex flex-col items-center mb-3 mt-10">
        <Label htmlFor='sign in text' className='text-[32px] font-semibold'>Sign In</Label>
        <div className="flex flex-col my-3 items-center">
          <Label htmlFor='sign in description 1' className='text-[14px] font-normal'>Access your account using your</Label>
          <Label htmlFor='sign in description 2' className='text-[14px] font-normal'>company Microsoft login.</Label>
        </div>
      </div>

      <Button size='lg' className="m-1 p-6 font-semibold" variant="outline" onClick={() => {
        if (isPopupOrIframe()) {
          openCenteredPopup(
            '/auth/login/popup?callbackUrl=_parent_call',
            '_blank',
            600,
            700
          );
          return;
        }
        signIn('azure-ad');
      }}>
        <Image alt="Microsoft Logo" width={20} height={20} className="mr-5" src={'/M365.png'} />
        Sign in with Microsoft
      </Button>

    </>
  );
}
