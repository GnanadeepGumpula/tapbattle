"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, LogIn, UserPlus, User, Lock, AlertCircle } from "lucide-react"
import api from "../services/api"
import { useTheme } from '../contexts/ThemeContext'
import PageLayout from '../components/PageLayout'

const HostLoginPage = () => {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // Create new host
        const response = await api.createHost(formData.username, formData.password)
        if (response.success) {
          localStorage.setItem("hostUser", formData.username)
          navigate("/host-dashboard")
        } else {
          setError(response.error || "Failed to create account")
        }
      } else {
        // Validate existing host
        const response = await api.loginHost(formData.username, formData.password)
        if (response.success && response.isValid) {
          localStorage.setItem("hostUser", formData.username)
          navigate("/host-dashboard")
        } else {
          setError(response.error || "Invalid username or password")
        }
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setError(error.message || "Authentication failed. Please try again.")
    }

    setLoading(false)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error when user starts typing
  }

  const { theme } = useTheme();

  return (
    <PageLayout>
      <div className="w-full max-w-lg mx-auto px-4 py-2 sm:py-4">
        <button
          onClick={() => navigate("/")}
          className={`flex items-center text-sm sm:text-base ${theme === 'dark' ? 'text-indigo-400 hover:text-purple-400' : 'text-blue-600 hover:text-purple-600'} mb-4 sm:mb-8 transition-colors`}
        >
          <ArrowLeft className="w-6 h-6 mr-2" />
          Back to Home
        </button>
        <div className={`p-4 sm:p-8 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
          theme === 'dark' 
            ? 'bg-white/5 border-indigo-500/30' 
            : 'bg-white/60 border-blue-300'
        }`}>
          <div className="text-center mb-8">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500'
                : 'bg-gradient-to-br from-blue-500 to-purple-500'
            } animate-pulse`}>
              {isSignUp ? <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> : <LogIn className="w-8 h-8 sm:w-10 sm:h-10 text-white" />}
            </div>
            <h2 className={`text-2xl sm:text-4xl font-extrabold mb-1 sm:mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{isSignUp ? "Create Account" : "Host Login"}</h2>
            <p className={`text-base sm:text-lg ${
              theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
            }`}>{isSignUp ? "Join as a quiz host" : "Access your host dashboard"}</p>
          </div>
          {error && (
            <div className={`mb-6 p-4 rounded-lg ${
              theme === 'dark'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`flex items-center ${
                theme === 'dark' ? 'text-red-400' : 'text-red-800'
              }`}>
                <AlertCircle className="w-6 h-6 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-red-300' : 'text-red-600'
              }`}>{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-base sm:text-lg font-medium mb-1 sm:mb-2 ${theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'}`}>
                <User className={`w-4 h-4 sm:w-5 sm:h-5 inline mr-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
                Username
              </label>
              <input
                type="text"
                required
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-base sm:text-lg border-2 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-indigo-500/30 text-white placeholder-indigo-300/50 focus:border-indigo-400'
                    : 'bg-white border-blue-300 text-gray-900 placeholder-gray-400 focus:border-blue-400'
                }`}
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-lg font-medium mb-2 ${theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'}`}>
                <Lock className={`w-5 h-5 inline mr-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
                Password
              </label>
              <input
                type="password"
                required
                className={`w-full px-4 py-3 rounded-xl text-lg border-2 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-indigo-500/30 text-white placeholder-indigo-300/50 focus:border-indigo-400'
                    : 'bg-white border-blue-300 text-gray-900 placeholder-gray-400 focus:border-blue-400'
                }`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>
            {isSignUp && (
              <div>
                <label className={`block text-lg font-medium mb-2 ${theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'}`}>
                  <Lock className={`w-5 h-5 inline mr-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  className={`w-full px-4 py-3 rounded-xl text-lg border-2 transition-colors ${
                    theme === 'dark' 
                      ? 'bg-white/5 border-indigo-500/30 text-white placeholder-indigo-300/50 focus:border-indigo-400'
                      : 'bg-white border-blue-300 text-gray-900 placeholder-gray-400 focus:border-blue-400'
                  }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                />
              </div>
            )}
            <button
              type="submit"
              className={`w-full text-base sm:text-xl py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-white transition-all transform hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400'
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
            </button>
            <button
              type="button"
              className={`w-full text-sm sm:text-lg py-2 sm:py-3 mt-2 rounded-lg sm:rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-blue-600 hover:text-blue-500'
              }`}
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? "Already have an account? Login" : "New host? Create Account"}
            </button>
          </form>
        </div>
      </div>
    </PageLayout>
  );


}

export default HostLoginPage