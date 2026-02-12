import { redirect } from 'next/navigation';

// Root page redirects to landing
export default function Home() {
    redirect('/landing');
}
