"use client"
import { useNavigate } from "react-router-dom"
import { Users, Crown, Zap } from "lucide-react"

const HomePage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img src="/image/tapbattle-logo.jpg" alt="TapBattle Logo" className="w-20 h-20 object-contain" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Tap<span className="text-blue-600">Battle</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">Host interactive quizzes and games with real-time participation</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div
            className="card hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
            onClick={() => navigate("/join")}
          >
            <div className="text-center">
              <div className="mb-6">
                <Users className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Game</h2>
                <p className="text-gray-600 leading-relaxed">
                  Enter a joining code to participate in an existing quiz session
                </p>
              </div>
              <button className="btn-secondary w-full">Join Now</button>
            </div>
          </div>

          <div
            className="card hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
            onClick={() => navigate("/host-login")}
          >
            <div className="text-center">
              <div className="mb-6">
                <Crown className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Host Game</h2>
                <p className="text-gray-600 leading-relaxed">
                  Create and manage your own quiz sessions with real-time tracking
                </p>
              </div>
              <button className="btn-accent w-full">Host Now</button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Real-time</h3>
            <p className="text-sm text-gray-600">Instant updates and live tracking</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Multi-user</h3>
            <p className="text-sm text-gray-600">Support for multiple participants</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Easy Setup</h3>
            <p className="text-sm text-gray-600">Quick and simple to get started</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
