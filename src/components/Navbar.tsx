import { Film, Home, Info } from 'lucide-react';
import { SITE_NAME } from '../content';

const LINKS = [
  { href: '#home', label: 'Home', Icon: Home },
  { href: '#episode', label: 'Current Episode', Icon: Film },
  { href: '#about', label: 'About', Icon: Info },
];

export default function Navbar() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/70 to-transparent pt-[env(safe-area-inset-top)]">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-10">
          <a href="#home" className="font-display text-xl tracking-tight text-bone">
            {SITE_NAME}
          </a>
          <ul className="hidden items-center gap-8 text-sm text-bone/70 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition-colors hover:text-bone">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-around rounded-2xl border border-white/10 bg-black/70 py-1 backdrop-blur-md md:hidden"
      >
        {LINKS.map(({ href, label, Icon }) => (
          <a key={href} href={href} className="flex min-h-[48px] min-w-[72px] flex-col items-center justify-center gap-0.5 text-[11px] text-bone/70 active:text-bone">
            <Icon size={20} aria-hidden />
            {label === 'Current Episode' ? 'Episode' : label}
          </a>
        ))}
      </nav>
    </>
  );
}
