import { redirect } from 'next/navigation';
import LoginComponent from '@/components/auth/LoginComponent';
import AuthService from '@/services/AuthService';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}) {
  const _searchParams = await searchParams;

  const authService = new AuthService();
  const session = await authService.getSession();
  if (session) {
    redirect(_searchParams.callbackUrl ?? '/');
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <LoginComponent />
    </div>
  );
}
