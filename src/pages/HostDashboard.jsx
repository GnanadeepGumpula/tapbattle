"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  History,
  LogOut,
  Calendar,
  Users,
  Trophy,
  Trash2,
  AlertTriangle,
  Download,
  AlertCircle,
} from "lucide-react"
import api from "../services/api"
import StatisticsDashboard from "../components/StatisticsDashboard"
import dataExportService from "../services/dataExport"
import { useTheme } from '../contexts/ThemeContext'
import PageLayout from '../components/PageLayout'

const HostDashboard = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [hostUser, setHostUser] = useState("")
  const [previousSessions, setPreviousSessions] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const user = localStorage.getItem("hostUser")
    if (!user) {
      navigate("/host-login")
      return
    }
    setHostUser(user)
    loadSessions(user)
  }, [navigate])

  const loadSessions = async (username) => {
    try {
      const response = await api.getHostSessions(username)
      if (response.success) {
        setPreviousSessions(response.sessions)
      } else {
        console.error("Error loading sessions:", response.error)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("hostUser")
    navigate("/")
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true)
      console.log("Starting complete account deletion process...")

      const progressSteps = [
        "Finding all your sessions...",
        "Deleting session data...",
        "Removing teams and players...",
        "Clearing tap records...",
        "Deleting your account...",
        "Final cleanup...",
      ]

      for (let i = 0; i < progressSteps.length; i++) {
        console.log(progressSteps[i])
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      const response = await api.deleteHost(hostUser)
      if (response.success) {
        console.log("Account and ALL related data deleted successfully")
        localStorage.removeItem("hostUser")
        alert("Your account and all related data have been completely deleted.")
        navigate("/")
      } else {
        throw new Error(response.error || "Failed to delete account")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("Failed to delete account completely. Some data may remain. Please contact support.")
      setDeleting(false)
    }
  }

  const createNewSession = () => {
    const sessionId = Math.random().toString(36).substr(2, 6).toUpperCase()
    navigate(`/host-interface/${sessionId}`)
  }

  const openPreviousSession = (sessionId) => {
    navigate(`/host-interface/${sessionId}`)
  }

  const deleteSession = async (sessionId) => {
    try {
      setDeleting(true)
      console.log(`Starting deletion of session: ${sessionId}`)

      const progressSteps = [
        "Deleting tap records...",
        "Removing players...",
        "Deleting teams...",
        "Removing session...",
        "Cleaning up...",
      ]

      for (let i = 0; i < progressSteps.length; i++) {
        console.log(progressSteps[i])
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const response = await api.deleteSession(sessionId)
      if (response.success) {
        console.log(`Session ${sessionId} and ALL related data deleted successfully`)
        await loadSessions(hostUser)
        setShowDeleteConfirm(null)
        setDeleting(false)
        alert(`Session ${sessionId} and all related data have been completely deleted.`)
      } else {
        throw new Error(response.error || "Failed to delete session")
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      alert("Failed to delete session completely. Some data may remain. Please try again.")
      setDeleting(false)
    }
  }

  const confirmDelete = (sessionId) => {
    setShowDeleteConfirm(sessionId)
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      await dataExportService.exportHostStatistics(hostUser)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Failed to export data. Please try again.")
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }
  
  return (
    <PageLayout>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-row items-center justify-between mb-6 sm:mb-8 space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className={`text-4xl font-extrabold mb-2 ${
              theme === 'dark'
                ? 'text-indigo-400 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'text-blue-600 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            }`}>Host Dashboard</h1>
            <p className={`text-lg font-medium ${
              theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'
            }`}>Welcome, <span className={theme === 'dark' ? 'text-purple-400 font-bold' : 'text-purple-600 font-bold'}>{hostUser}</span>!</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowDeleteAccount(true)}
              className={`flex items-center transition-colors text-xs sm:text-sm py-1 px-2 sm:px-3 rounded-md ${
                theme === 'dark'
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-red-600 hover:text-red-800'
              }`}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-1 sm:mr-2 animate-pulse" />
              Delete
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center transition-colors text-xs sm:text-sm py-1 px-2 sm:px-3 rounded-md ${
                theme === 'dark'
                  ? 'text-indigo-400 hover:text-indigo-300'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2 animate-bounce" />
              Logout
            </button>
          </div>
        </div>

        {/* Storage Management Message */}
        <div className={`p-6 rounded-xl border-l-4 mb-6 sm:mb-8 ${
          theme === 'dark'
            ? 'bg-white/5 border-indigo-500'
            : 'bg-white/60 border-blue-500'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              theme === 'dark'
                ? 'bg-indigo-500/20'
                : 'bg-blue-100'
            }`}>
              <AlertCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>💾 Smart Storage Management</h3>
              <p className={`mb-2 text-sm sm:text-base ${
                theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'
              }`}>
                <strong>"Clean Data, Clear Mind - Optimize Your Storage, Maximize Your Performance!"</strong>
              </p>
              <p className={`text-xs sm:text-sm ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>
                Regularly delete unused sessions and player data to maintain optimal performance. Clean storage means
                faster loading times and better user experience.
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}> Remember: Organized data = Organized success!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex space-x-1 mb-6 sm:mb-8 p-1 rounded-lg ${
          theme === 'dark' ? 'bg-white/5' : 'bg-white/60'
        }`}>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "overview" 
                ? theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-white text-blue-600 shadow-sm'
                : theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "statistics" 
                ? theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-white text-blue-600 shadow-sm'
                : theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div
                className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 transition-all duration-300 cursor-pointer transform hover:-translate-y-2 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-indigo-500/30 hover:bg-white/10'
                    : 'bg-white/60 border-blue-300 hover:bg-white/80'
                }`}
                onClick={createNewSession}
              >
                <div className="text-center">
                  <Plus className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                  }`} />
                  <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Create New Session</h2>
                  <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
                  }`}>Start a fresh quiz session with a new joining code</p>
                  <button className={`w-full text-sm sm:text-base py-2 sm:py-3 rounded-xl font-bold text-white transition-all ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400'
                  }`}>Create Session</button>
                </div>
              </div>

              <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-purple-500/30'
                  : 'bg-white/60 border-purple-300'
              }`}>
                <div className="text-center">
                  <History className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Previous Sessions</h2>
                  <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
                  }`}>Continue with your existing sessions</p>
                  {previousSessions.length > 0 ? (
                    <div className="space-y-2">
                      {previousSessions.slice(0, 3).map((session) => (
                        <div
                          key={session.sessionId}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-white/5 hover:bg-white/10'
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                        >
                          <button onClick={() => openPreviousSession(session.sessionId)} className="flex-1 text-left">
                            <div className="flex justify-between items-center">
                              <span className={`font-semibold text-sm sm:text-base ${
                                theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'
                              }`}>{session.sessionId}</span>
                              <span className={`text-xs sm:text-sm ${
                                theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                              }`}>Round {session.round}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => confirmDelete(session.sessionId)}
                            className={`p-2 transition-colors ml-2 ${
                              theme === 'dark'
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-red-600 hover:text-red-800'
                            }`}
                            disabled={deleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {previousSessions.length > 3 && (
                        <p className={`text-xs sm:text-sm mt-2 ${
                          theme === 'dark' ? 'text-indigo-300/60' : 'text-gray-500'
                        }`}>+{previousSessions.length - 3} more sessions</p>
                      )}
                    </div>
                  ) : (
                    <p className={`italic text-sm sm:text-base ${
                      theme === 'dark' ? 'text-indigo-300/60' : 'text-gray-500'
                    }`}>No previous sessions found</p>
                  )}
                </div>
              </div>
            </div>

            {/* All Sessions List */}
            {previousSessions.length > 0 && (
              <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-indigo-500/30'
                  : 'bg-white/60 border-blue-300'
              }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6">
                  <h2 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-0 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>All Sessions</h2>
                  <button
                    onClick={handleExportData}
                    className={`flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-white transition-all ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400'
                    }`}
                    disabled={loading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </button>
                </div>
                <div className="grid gap-3">
                  {previousSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10'
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                          theme === 'dark'
                            ? 'bg-indigo-500/20'
                            : 'bg-blue-100'
                        }`}>
                          <span className={`font-bold text-sm sm:text-base ${
                            theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                          }`}>{session.sessionId}</span>
                        </div>
                        <div>
                          <div className={`font-semibold text-sm sm:text-base ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>Session {session.sessionId}</div>
                          <div className={`text-xs sm:text-sm ${
                            theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                          }`}>
                            Created: {new Date(session.createdAt).toLocaleDateString()}
                          </div>
                          <div className={`text-xs sm:text-sm ${
                            theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                          }`}>
                            Round: {session.round} | Mode: {session.playerMode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openPreviousSession(session.sessionId)}
                          className={`text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => confirmDelete(session.sessionId)}
                          className={`p-2 transition-colors ${
                            theme === 'dark'
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          disabled={deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className={`p-6 rounded-xl shadow-lg backdrop-blur-md text-center border-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-indigo-500/30'
                  : 'bg-white/60 border-blue-300'
              }`}>
                <Calendar className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Sessions Created</h3>
                <p className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                }`}>{previousSessions.length}</p>
              </div>
              <div className={`p-6 rounded-xl shadow-lg backdrop-blur-md text-center border-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-purple-500/30'
                  : 'bg-white/60 border-purple-300'
              }`}>
                <Users className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Active Sessions</h3>
                <p className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}>{previousSessions.filter((s) => s.active).length}</p>
              </div>
              <div className={`p-6 rounded-xl shadow-lg backdrop-blur-md text-center border-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-indigo-500/30'
                  : 'bg-white/60 border-blue-300'
              }`}>
                <Trophy className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Total Rounds</h3>
                <p className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                }`}>
                  {previousSessions.reduce((total, session) => total + (session.round || 1), 0)}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "statistics" && <StatisticsDashboard hostUsername={hostUser} sessions={previousSessions} />}

        {/* Delete Session Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`p-6 rounded-xl shadow-xl max-w-md w-full ${
              theme === 'dark'
                ? 'bg-gray-900 border-2 border-indigo-500/30'
                : 'bg-white/95 border-2 border-blue-300'
            }`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Delete Session</h3>
              <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${
                theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
              }`}>
                Are you sure you want to delete session <strong>{showDeleteConfirm}</strong>? This action cannot be
                undone and will remove all associated data including players and tap records.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => deleteSession(showDeleteConfirm)}
                  className={`flex-1 text-sm sm:text-base py-2 sm:py-3 rounded-xl font-bold text-white transition-all ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400'
                  }`}
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors text-sm sm:text-base border-2 ${
                    theme === 'dark'
                      ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                      : 'border-blue-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccount && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`p-6 rounded-xl shadow-xl max-w-md w-full ${
              theme === 'dark'
                ? 'bg-gray-900 border-2 border-indigo-500/30'
                : 'bg-white/95 border-2 border-blue-300'
            }`}>
              <div className="flex items-center mb-4">
                <AlertTriangle className={`w-6 h-6 sm:w-8 sm:h-8 mr-3 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`} />
                <h3 className={`text-lg sm:text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Delete Account</h3>
              </div>
              <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${
                theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
              }`}>
                Are you sure you want to delete your account <strong>{hostUser}</strong>? This action cannot be undone
                and will permanently remove:
              </p>
              <ul className={`text-xs sm:text-sm mb-4 sm:mb-6 space-y-1 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>
                <li>• Your host account</li>
                <li>• All your sessions ({previousSessions.length} sessions)</li>
                <li>• All player data from your sessions</li>
                <li>• All tap records and game history</li>
              </ul>
              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteAccount}
                  className={`flex-1 text-sm sm:text-base py-2 sm:py-3 rounded-xl font-bold text-white transition-all ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400'
                  }`}
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting Account...
                    </div>
                  ) : (
                    "Delete Account"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  className={`flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors text-sm sm:text-base border-2 ${
                    theme === 'dark'
                      ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                      : 'border-blue-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default HostDashboard