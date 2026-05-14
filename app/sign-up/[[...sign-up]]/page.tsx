import { SignUp } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect('/app');

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#f7e7c8_0,#f8fafc_32rem)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 font-black text-amber-300">SPA</div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Request SPA access</h1>
          <p className="mt-2 text-sm text-slate-600">New accounts are member accounts. Admin access is granted separately by approval.</p>
        </div>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/app" />
      </div>
    </main>
  );
}
