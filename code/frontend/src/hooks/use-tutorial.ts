// Shows a tutorial the first time a person meets it, then never again unless asked.
// "Seen" is saved on the person's ACCOUNT (Clerk `unsafeMetadata.tutorialsSeen`), so
// it stays hidden on their next sign-in from any phone. That field can be written
// from the browser, which is fine here: it only controls a help screen, never access.
import { useState } from 'react';
import { useUser } from '@clerk/react';
import { TUTORIALS, type TutorialId } from '@/lib/tutorials';

const seenList = (metadata: unknown): string[] => {
  const list = (metadata as { tutorialsSeen?: unknown } | null)?.tutorialsSeen;
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
};

export function useTutorial(id: TutorialId) {
  const { isLoaded, user } = useUser();
  /** Asked for by the person ("Show me how"). */
  const [requested, setRequested] = useState(false);
  /** Closed during this visit, so it does not pop back while the save is in flight. */
  const [closed, setClosed] = useState(false);

  const seen = seenList(user?.unsafeMetadata).includes(id);
  const firstTime = isLoaded && Boolean(user) && !seen && !closed;

  const close = () => {
    setRequested(false);
    setClosed(true);
    if (!user || seen) return;
    const tutorialsSeen = [...seenList(user.unsafeMetadata), id];
    // If the save fails (offline), the tutorial simply shows once more next time.
    void user.update({ unsafeMetadata: { ...user.unsafeMetadata, tutorialsSeen } }).catch(() => undefined);
  };

  return {
    steps: TUTORIALS[id],
    open: requested || firstTime,
    show: () => setRequested(true),
    close,
  };
}
