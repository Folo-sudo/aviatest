import { redirect } from 'next/navigation';

export default function SignalerBeugRedirect() {
  redirect('/boite?tab=beugs');
}
