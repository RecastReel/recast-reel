import { redirect } from 'next/navigation';

// Sign-in and sign-up are the same passwordless step.
export default function Page() { redirect('/login'); }
