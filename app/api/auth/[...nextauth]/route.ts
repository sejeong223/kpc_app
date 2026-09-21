import { type NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import AuthService from '@/services/AuthService';

interface RouteHandlerContext {
  params: Promise<{ nextauth: string[] }>;
}

async function nextHandler(req: NextRequest, res: RouteHandlerContext) {
  const authService = new AuthService();
  const options = await authService.getNextAuthOptions();
  return await NextAuth(req, res, options);
}

export async function GET(req: NextRequest, res: RouteHandlerContext) {
  return await nextHandler(req, res);
}

export async function POST(req: NextRequest, res: RouteHandlerContext) {
  return await nextHandler(req, res);
}
