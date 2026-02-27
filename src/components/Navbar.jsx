import { NavLink } from 'react-router-dom'
import { Home, Wine, Users, Trophy, User } from 'lucide-react'

const links = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/track', icon: Wine, label: 'Track' },
  { to: '/social', icon: Users, label: 'Social' },
  { to: '/leaderboard', icon: Trophy, label: 'Board' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive ? 'text-buzz-primary' : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
