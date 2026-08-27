import type { Metadata } from 'next';
import EnchainementClient from './EnchainementClient';

export const metadata: Metadata = {
  title: 'Enchaînement | AviaTest',
  description:
    'Enchaîne plusieurs tests psychotechniques sans pause, chacun avec ses réglages, pour te familiariser avec le rythme d’un examen.',
  robots: { index: false, follow: false },
};

export default function EnchainementPage() {
  return <EnchainementClient />;
}
