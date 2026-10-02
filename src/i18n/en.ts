// English is the source dictionary: ro.ts and ru.ts must provide the same keys (enforced by the Dict type).
export const en = {
  language: 'Language',
  nav: {
    rent: 'Rent a Car',
    about: 'About',
    contact: 'Contact',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  account: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
  },
  footer: {
    rights: '© 2026 Rent Motors, Inc. All rights reserved.',
    privacy: 'Privacy',
    terms: 'Terms',
    contact: 'Contact',
  },
}

export type Dict = typeof en
