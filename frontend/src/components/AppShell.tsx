import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AppShellProps {
  children: ReactNode
  active?: 'library' | 'playlist' | 'watch'
  sidebarFooter?: ReactNode
}

const navItems = [
  { label: 'Library', icon: 'home', activeKey: 'library', href: '/' },
  { label: 'Playlists', icon: 'list', activeKey: 'playlist', href: '/' },
  { label: 'My Playlist', icon: 'star', activeKey: 'library', href: '/' },
]

const laterItems = [
  { label: 'History', icon: 'clock' },
  { label: 'Watch Later', icon: 'timer' },
  { label: 'Notes', icon: 'note' },
  { label: 'Trash', icon: 'trash' },
  { label: 'Settings', icon: 'settings' },
  { label: 'Templates', icon: 'template' },
  { label: 'Keyboard Shortcuts', icon: 'keyboard' },
]

function Icon({ name }: { name: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      )
    case 'clock':
    case 'timer':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'note':
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M14 3v4h4" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
          <path d="M9 7V4h6v3" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 0 0 7.2 15a1.7 1.7 0 0 0-1.6-1H5v-3h.6a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.4v3h-.4a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      )
    case 'template':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16" />
          <path d="M9 20V9" />
        </svg>
      )
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h.01M11 14h6" />
        </svg>
      )
    default:
      return null
  }
}

export default function AppShell({ children, active = 'library', sidebarFooter }: AppShellProps) {
  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-[278px] shrink-0 border-r border-white/10 bg-[#101419]/95 p-4 lg:flex lg:flex-col">
          <Link to="/" className="mb-6 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e11d24] shadow-[0_0_28px_rgba(225,29,36,0.25)]">
              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">YT Study</span>
              <span className="block text-[11px] text-slate-500">Playlist workspace</span>
            </span>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = active === item.activeKey && item.label !== 'My Playlist'
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/[0.07] text-white shadow-[inset_3px_0_0_#e11d24]'
                      : item.label === 'My Playlist'
                        ? 'text-amber-300 hover:bg-white/[0.05]'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="my-5 h-px bg-white/10" />

          <nav className="space-y-1">
            {laterItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                disabled
                title="To be implemented later"
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-500 ${
                  index >= 4 ? 'mt-1' : ''
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            {sidebarFooter}
            <button
              type="button"
              disabled
              title="To be implemented later"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400"
            >
              Collapse
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
