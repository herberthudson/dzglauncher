import type {JSX} from 'solid-js';
import {A} from '@solidjs/router';
import {useTranslation} from 'solid-i18next';
import {Clock, Package, Server, Settings, Star} from 'lucide-solid';
import dzglLogo from '@/assets/dzgl-logo.png';

const navLinkClass =
  'rounded-md border border-transparent px-3 py-2 text-[0.8125rem] text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const navLinkActiveClass = 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';

export function AppShell(props: {children?: JSX.Element}) {
  const [t] = useTranslation();
  return (
    <div class="relative flex h-full min-h-0 flex-col bg-background text-left text-sm leading-snug text-foreground">
      <div
        class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.32]"
        style={{'background-image': 'url(/dzgl-background.jpg)'}}
        aria-hidden="true"
      />
      <div class="relative z-10 flex min-h-0 flex-1 flex-col">
        <nav
          class="flex min-h-nav flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card/85 px-4 shadow-ds backdrop-blur-[3px]"
          aria-label={t('nav.ariaMain')}
        >
          <span class="relative mr-3 inline-block h-12 w-[10rem] shrink-0 overflow-hidden">
            <img
              src={dzglLogo}
              alt="dzglauncher"
              title="dzglauncher"
              class="box-border h-full w-full object-contain object-center"
              decoding="async"
            />
          </span>
          <div class="flex flex-1 flex-wrap items-center gap-1">
            <A href="/browse" class={navLinkClass} activeClass={navLinkActiveClass} end={false}>
              <span class="inline-flex items-center gap-1.5">
                <Server size={18} strokeWidth={1.75} aria-hidden />
                <span>{t('nav.servers')}</span>
              </span>
            </A>
            <A href="/settings" class={navLinkClass} activeClass={navLinkActiveClass}>
              <span class="inline-flex items-center gap-1.5">
                <Settings size={18} strokeWidth={1.75} aria-hidden />
                <span>{t('nav.settings')}</span>
              </span>
            </A>
            <A href="/favorites" class={navLinkClass} activeClass={navLinkActiveClass}>
              <span class="inline-flex items-center gap-1.5">
                <Star size={18} strokeWidth={1.75} aria-hidden />
                <span>{t('nav.favorites')}</span>
              </span>
            </A>
            <A href="/history" class={navLinkClass} activeClass={navLinkActiveClass}>
              <span class="inline-flex items-center gap-1.5">
                <Clock size={18} strokeWidth={1.75} aria-hidden />
                <span>{t('nav.history')}</span>
              </span>
            </A>
            <A href="/mods" class={navLinkClass} activeClass={navLinkActiveClass}>
              <span class="inline-flex items-center gap-1.5">
                <Package size={18} strokeWidth={1.75} aria-hidden />
                <span>{t('nav.modsWorkshop')}</span>
              </span>
            </A>
          </div>
        </nav>
        <main class="box-border min-h-0 w-full max-w-none flex-1 overflow-auto p-3">{props.children}</main>
      </div>
    </div>
  );
}
