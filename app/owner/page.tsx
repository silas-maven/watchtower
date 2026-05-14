import { redirect } from 'next/navigation';

export default function OwnerRedirect() {
  redirect('/admin/customers');
}
