import { headers } from 'next/headers';

const PHONE_USER_AGENT_RE =
  /iPhone|iPod|Android.+Mobile|Windows Phone|Mobile Safari|Opera Mini|IEMobile/i;

export async function isPhoneRequest(): Promise<boolean> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? '';

  return PHONE_USER_AGENT_RE.test(userAgent);
}
