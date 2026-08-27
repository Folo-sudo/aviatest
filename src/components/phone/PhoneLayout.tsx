'use client';

import { createContext, useContext, type ReactNode } from 'react';

const PhoneLayoutContext = createContext(false);

export function PhoneLayoutProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <PhoneLayoutContext.Provider value={active}>
      <div className={active ? 'aviatest-phone' : undefined} data-phone={active ? '1' : undefined}>
        {children}
      </div>
    </PhoneLayoutContext.Provider>
  );
}

export function usePhoneLayout(): boolean {
  return useContext(PhoneLayoutContext);
}
