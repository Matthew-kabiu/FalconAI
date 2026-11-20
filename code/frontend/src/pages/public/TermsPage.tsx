import { TERMS_OF_SERVICE } from '@/components/legal/documents';
import { LegalPage } from '@/components/legal/LegalPage';

export default function TermsPage() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
