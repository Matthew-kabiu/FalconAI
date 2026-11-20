import { PRIVACY_POLICY } from '@/components/legal/documents';
import { LegalPage } from '@/components/legal/LegalPage';

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
