// Structure of the legal documents: which dictionary keys make up each section, in order.
// The words live in lib/i18n/legal.en.ts and legal.sw.ts.
import type { MessageKey } from '@/lib/i18n';

export interface LegalSection {
  /** Anchor id, used by the table of contents. */
  id: string;
  title: MessageKey;
  paragraphs: readonly MessageKey[];
  bullets: readonly MessageKey[];
}

export interface LegalDocument {
  title: MessageKey;
  intro: MessageKey;
  sections: readonly LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'legal.privacy.title',
  intro: 'legal.privacy.intro',
  sections: [
    {
      id: 'collect',
      title: 'legal.privacy.collect.title',
      paragraphs: ['legal.privacy.collect.p1'],
      bullets: ['legal.privacy.collect.b1', 'legal.privacy.collect.b2', 'legal.privacy.collect.b3', 'legal.privacy.collect.b4', 'legal.privacy.collect.b5', 'legal.privacy.collect.b6'],
    },
    {
      id: 'use',
      title: 'legal.privacy.use.title',
      paragraphs: ['legal.privacy.use.p1'],
      bullets: ['legal.privacy.use.b1', 'legal.privacy.use.b2', 'legal.privacy.use.b3', 'legal.privacy.use.b4', 'legal.privacy.use.b5'],
    },
    {
      id: 'photos',
      title: 'legal.privacy.photos.title',
      paragraphs: ['legal.privacy.photos.p1', 'legal.privacy.photos.p2'],
      bullets: [],
    },
    {
      id: 'share',
      title: 'legal.privacy.share.title',
      paragraphs: ['legal.privacy.share.p1'],
      bullets: ['legal.privacy.share.b1', 'legal.privacy.share.b2', 'legal.privacy.share.b3', 'legal.privacy.share.b4'],
    },
    {
      id: 'transfer',
      title: 'legal.privacy.transfer.title',
      paragraphs: ['legal.privacy.transfer.p1'],
      bullets: [],
    },
    {
      id: 'keep',
      title: 'legal.privacy.keep.title',
      paragraphs: ['legal.privacy.keep.p1', 'legal.privacy.keep.p2'],
      bullets: [],
    },
    {
      id: 'rights',
      title: 'legal.privacy.rights.title',
      paragraphs: ['legal.privacy.rights.p1'],
      bullets: ['legal.privacy.rights.b1', 'legal.privacy.rights.b2', 'legal.privacy.rights.b3', 'legal.privacy.rights.b4', 'legal.privacy.rights.b5', 'legal.privacy.rights.b6'],
    },
    {
      id: 'security',
      title: 'legal.privacy.security.title',
      paragraphs: ['legal.privacy.security.p1'],
      bullets: [],
    },
    {
      id: 'children',
      title: 'legal.privacy.children.title',
      paragraphs: ['legal.privacy.children.p1'],
      bullets: [],
    },
    {
      id: 'cookies',
      title: 'legal.privacy.cookies.title',
      paragraphs: ['legal.privacy.cookies.p1', 'legal.privacy.cookies.p2'],
      bullets: [],
    },
    {
      id: 'changes',
      title: 'legal.privacy.changes.title',
      paragraphs: ['legal.privacy.changes.p1'],
      bullets: [],
    },
    {
      id: 'contact',
      title: 'legal.privacy.contact.title',
      paragraphs: ['legal.privacy.contact.p1'],
      bullets: [],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'legal.terms.title',
  intro: 'legal.terms.intro',
  sections: [
    {
      id: 'about',
      title: 'legal.terms.about.title',
      paragraphs: ['legal.terms.about.p1'],
      bullets: [],
    },
    {
      id: 'service',
      title: 'legal.terms.service.title',
      paragraphs: ['legal.terms.service.p1', 'legal.terms.service.p2'],
      bullets: [],
    },
    {
      id: 'account',
      title: 'legal.terms.account.title',
      paragraphs: [],
      bullets: ['legal.terms.account.b1', 'legal.terms.account.b2', 'legal.terms.account.b3', 'legal.terms.account.b4'],
    },
    {
      id: 'records',
      title: 'legal.terms.records.title',
      paragraphs: ['legal.terms.records.p1'],
      bullets: [],
    },
    {
      id: 'advice',
      title: 'legal.terms.advice.title',
      paragraphs: ['legal.terms.advice.p1'],
      bullets: ['legal.terms.advice.b1', 'legal.terms.advice.b2', 'legal.terms.advice.b3', 'legal.terms.advice.b4', 'legal.terms.advice.b5'],
    },
    {
      id: 'use',
      title: 'legal.terms.use.title',
      paragraphs: ['legal.terms.use.p1'],
      bullets: ['legal.terms.use.b1', 'legal.terms.use.b2', 'legal.terms.use.b3'],
    },
    {
      id: 'cost',
      title: 'legal.terms.cost.title',
      paragraphs: ['legal.terms.cost.p1'],
      bullets: [],
    },
    {
      id: 'ending',
      title: 'legal.terms.ending.title',
      paragraphs: ['legal.terms.ending.p1'],
      bullets: [],
    },
    {
      id: 'liability',
      title: 'legal.terms.liability.title',
      paragraphs: ['legal.terms.liability.p1', 'legal.terms.liability.p2'],
      bullets: [],
    },
    {
      id: 'law',
      title: 'legal.terms.law.title',
      paragraphs: ['legal.terms.law.p1'],
      bullets: [],
    },
    {
      id: 'changes',
      title: 'legal.terms.changes.title',
      paragraphs: ['legal.terms.changes.p1'],
      bullets: [],
    },
    {
      id: 'contact',
      title: 'legal.terms.contact.title',
      paragraphs: ['legal.terms.contact.p1'],
      bullets: [],
    },
  ],
};
