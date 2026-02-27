import { Link } from 'react-router-dom'
import { Shield, Users, BarChart3, Wine } from 'lucide-react'

const features = [
  {
    icon: Wine,
    title: 'Track Your Drinks',
    desc: 'Log shots, beers, and mixed drinks. See your BAC in real-time.',
  },
  {
    icon: Shield,
    title: 'Know Your Limits',
    desc: 'Personalized drink limits based on your body and calibrated over time.',
  },
  {
    icon: Users,
    title: 'Stay Accountable',
    desc: 'Friends get alerts when you go over your limit. Look out for each other.',
  },
  {
    icon: BarChart3,
    title: 'Leaderboard',
    desc: 'See how your university stacks up. Opt-in and compete with friends.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-buzz-primary">Buzz</span>Board
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Track responsibly. Drink smarter.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-3 bg-buzz-primary text-gray-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-gray-600 rounded-lg hover:border-gray-400 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <Icon className="text-buzz-primary mb-3" size={28} />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center bg-gray-900 rounded-xl p-8 border border-gray-800">
          <p className="text-buzz-warning font-medium mb-2">
            Drink Responsibly
          </p>
          <p className="text-gray-400 text-sm">
            BuzzBoard is designed to promote safe drinking habits. Always know
            your limits, stay hydrated, and never drink and drive.
          </p>
        </div>
      </div>
    </div>
  )
}
