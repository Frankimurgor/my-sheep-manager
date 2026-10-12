// src/config/contact.ts
// Single source of truth for Lumo Labs contact info.
// Change once here, updates everywhere in the app.

export const CONTACT = {
  developer: 'Franklin Kimurgor',
  company: 'Lumo Labs',
  businessEmail: 'lumolabske@gmail.com',
  personalEmail: 'franklinkimurgor@gmail.com',
  whatsapp: '254702208843',
  whatsappUrl: 'https://wa.me/254702208843',
  whatsappChannelUrl:
    'https://whatsapp.com/channel/0029Vb8uSQx2P59eLNbHEQ3S',
  github: 'https://github.com/Frankimurgor',
  expo: 'https://expo.dev/@frankkips',
  paypal: 'franklinkimurgor@gmail.com',
  version: '1.0.0',
} as const;

// Short blurb shown on the About screen.
export const ABOUT_BLURB =
  'My Sheep Manager is built by Lumo Labs — a small studio shipping offline-first, privacy-respecting mobile apps for real-world users. No accounts. No cloud. Your data stays on your device.';

// The tagline shown in Settings / More footers.
export const FOOTER_LINE = `Built by ${CONTACT.company} · v${CONTACT.version}`;