import { Outlet } from 'react-router-dom';

/** Centres a single-task page (sign-in, status, not found) inside the public shell. */
export function CenteredLayout() {
  return (
    <div className="flex flex-1 items-center justify-center px-[4vw] py-[clamp(1.5rem,6vh,4rem)]">
      <Outlet />
    </div>
  );
}
