"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Hand, Trophy, Clock, Users, Home, User, AlertCircle } from "lucide-react"
import api from "../services/api"
import { useTheme } from '../contexts/ThemeContext'
import PageLayout from '../components/PageLayout'

const UserGamePage = () => {
  const { theme } = useTheme();
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [hasPressed, setHasPressed] = useState(false)
  const [pressTime, setPressTime] = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [session, setSession] = useState(null)
  const [tapOrder, setTapOrder] = useState([])
  const [myPosition, setMyPosition] = useState(null)
  const [showAlreadyTapped, setShowAlreadyTapped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentRound, setCurrentRound] = useState(null)
  const [sessionNotFound, setSessionNotFound] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Use ref to track interval and prevent navigation during updates
  const intervalRef = useRef(null)
  const isUpdatingRef = useRef(false)

  useEffect(() => {
    initializePlayer()
  }, [sessionId])

  // Set up polling for real-time updates
  useEffect(() => {
    if (!loading && playerData && session && !sessionNotFound) {
      intervalRef.current = setInterval(() => {
        if (!isUpdatingRef.current) {
          loadGameData(true) // Silent update
        }
      }, 1000) // 1-second refresh
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loading, playerData, session, sessionNotFound])

  const initializePlayer = async () => {
    try {
      // Get player data from session storage
      const storedPlayerData = JSON.parse(sessionStorage.getItem(`player_${sessionId}`) || "{}")
      
      if (!storedPlayerData.playerName) {
        // No player data found, redirect to join page
        navigate("/join")
        return
      }
      
      setPlayerData(storedPlayerData)
      
      // Load initial game data
      await loadGameData()
    } catch (error) {
      console.error("Error initializing player:", error)
      setSessionNotFound(true)
      setLoading(false)
    }
  }

  const loadGameData = async (silent = false) => {
    try {
      if (!silent) isUpdatingRef.current = true

      const sessionResponse = await api.getSession(sessionId)
      if (!sessionResponse.success || !sessionResponse.data) {
        if (!silent) {
          setSessionNotFound(true)
          setLoading(false)
        } else {
          console.warn("Session not found during silent update")
        }
        return
      }

      const sessionData = sessionResponse.data

      // Pause polling if session is completed
      if (sessionData.status === "completed") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setSession(sessionData)
        if (!silent) {
          setLoading(false)
        }
        return
      }

      // Reset session not found if we get data
      if (sessionNotFound) {
        setSessionNotFound(false)
      }

      // Check if round changed
      if (currentRound !== null && sessionData.round !== currentRound) {
        setHasPressed(false)
        setPressTime(null)
        setMyPosition(null)
        console.log(`Round changed from ${currentRound} to ${sessionData.round}`)
      }

      // Update state only if data has changed
      if (JSON.stringify(session) !== JSON.stringify(sessionData)) {
        setSession(sessionData)
        setCurrentRound(sessionData.round)
      }

      const tapsResponse = await api.getTapOrder(sessionId, sessionData.round)
      if (tapsResponse.success && JSON.stringify(tapOrder) !== JSON.stringify(tapsResponse.taps)) {
        setTapOrder(tapsResponse.taps)
      }

      // Check if current player has tapped in this round
      const playerData = JSON.parse(sessionStorage.getItem(`player_${sessionId}`) || "{}")
      const myTap = tapsResponse.success && tapsResponse.taps.find((tap) => tap.playerName === playerData.playerName)

      if (myTap) {
        setHasPressed(true)
        setPressTime(myTap.time)
        setMyPosition(tapsResponse.taps.findIndex((tap) => tap.playerName === playerData.playerName) + 1)
      } else if (hasPressed && !myTap) {
        // Player was reset due to round change
        setHasPressed(false)
        setPressTime(null)
        setMyPosition(null)
      }

      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error) {
      console.error("Error loading game data:", error)
      if (!silent) {
        setSessionNotFound(true)
        setLoading(false)
      } else {
        console.warn("Silent update failed, retrying on next interval")
      }
    }

    if (!silent) {
      setLoading(false)
      isUpdatingRef.current = false
    }
  }

  const handleButtonPress = async () => {
    if (!playerData || !session) return

    // Check if player already tapped in current round
    const alreadyTapped = tapOrder.some((tap) => tap.playerName === playerData.playerName)

    if (alreadyTapped) {
      setShowAlreadyTapped(true)
      setTimeout(() => setShowAlreadyTapped(false), 3000)
      return
    }

    try {
      const now = new Date()
      setHasPressed(true)
      setPressTime(now.toLocaleTimeString())

      const response = await api.addTap(sessionId, playerData.playerName, playerData.teamName, session.round)
      if (!response.success) {
        throw new Error(response.error || "Failed to record tap")
      }

      // Immediately update local state
      const newTap = {
        playerName: playerData.playerName,
        teamName: playerData.teamName,
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        round: session.round,
      }

      const newTapOrder = [...tapOrder, newTap].sort((a, b) => a.timestamp - b.timestamp)
      setTapOrder(newTapOrder)
      setMyPosition(newTapOrder.findIndex((tap) => tap.playerName === playerData.playerName) + 1)
    } catch (error) {
      console.error("Error recording tap:", error)
      setHasPressed(false)
      setPressTime(null)
    }
  }

  const getRankColor = (position) => {
    switch (position) {
      case 1:
        return "text-yellow-600"
      case 2:
        return "text-gray-600"
      case 3:
        return "text-orange-600"
      default:
        return "text-blue-600"
    }
  }

  const getRankIcon = (position) => {
    if (position <= 3) {
      return <Trophy className={`w-6 h-6 ${getRankColor(position)}`} />
    }
    return <Users className="w-6 h-6 text-blue-600" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Game...</h2>
          <p className="text-gray-600">Setting up your game session</p>
        </div>
      </div>
    )
  }

  if (sessionNotFound || !playerData || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load game session</p>
          <button onClick={() => navigate("/join")} className="btn-primary">
            Join Game
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-6 gap-4">
          <div className="flex-1">
            <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight uppercase mb-3 ${
              theme === 'dark' 
                ? 'text-indigo-400 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                : 'text-blue-600 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            }`}>TapBattle Arena</h1>
            <div className={`p-3 rounded-lg ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border border-indigo-500/30' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'
              }`}>{playerData?.playerName}</p>
              {playerData?.teamName && (
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}>Team: {playerData.teamName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            disabled={isUpdatingRef.current}
            className={`p-2 ${
              theme === 'dark' 
                ? 'text-indigo-400 hover:text-purple-400' 
                : 'text-blue-600 hover:text-purple-600'
            } transition-colors ${isUpdatingRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Session Info Card */}
        <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 text-center mb-2 sm:mb-6 ${
          theme === 'dark' 
            ? 'bg-white/5 border-indigo-500/30' 
            : 'bg-white/60 border-blue-300'
        }`}> 
          <div className="mb-4">
            <div className={`text-sm mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>Session Code</div>
            <div className={`text-2xl font-bold tracking-widest ${
              theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
            }`}>{sessionId}</div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center">
              <Clock className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
              <span className={`font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'}`}>
                Round {session?.round}
              </span>
            </div>
            <div className="flex items-center">
              <Users className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
              <span className={`font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                {tapOrder.length} tapped
              </span>
            </div>
            <div className="flex items-center">
              {playerData?.teamName ? (
                <Users className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
              ) : (
                <User className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
              )}
              <span className={`font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'}`}>
                {playerData?.teamName ? "Team" : "Solo"}
              </span>
            </div>
          </div>
          <div className={`text-sm mt-2 ${theme === 'dark' ? 'text-indigo-300/60' : 'text-gray-500'}`}>
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Tap Button Card */}
        <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 text-center mb-2 sm:mb-6 ${
          theme === 'dark' 
            ? 'bg-white/5 border-purple-500/30' 
            : 'bg-white/60 border-purple-300'
        } animate-fade-in`}> 
          <h2 className={`text-2xl font-bold mb-6 uppercase tracking-wider ${
            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
          }`}>Quick Response Challenge</h2>

          <button
            onClick={handleButtonPress}
            disabled={hasPressed}
            className={`tap-button w-full sm:w-auto px-10 py-6 text-2xl font-extrabold rounded-2xl shadow-xl transition-all duration-200 border-2 text-white ${
              hasPressed 
                ? `opacity-50 cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-indigo-800 to-purple-800 border-indigo-700'
                      : 'bg-gradient-to-r from-blue-300 to-purple-300 border-blue-200'
                  }`
                : `${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 hover:from-indigo-500 hover:to-purple-500'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 border-blue-400 hover:from-blue-400 hover:to-purple-400'
                  } animate-pulse hover:scale-105 hover:shadow-2xl`
            }`}
          >
            {hasPressed ? (
              <div className="flex items-center justify-center">
                <Trophy className={`w-10 h-10 mr-3 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-300'
                } animate-bounce`} />
                TAPPED!
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Hand className={`w-10 h-10 mr-3 ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-blue-300'
                } animate-pulse`} />
                TAP NOW!
              </div>
            )}
          </button>

          {showAlreadyTapped && (
            <div className="mt-4 p-4 bg-gold/20 border border-gold rounded-lg animate-fade-in">
              <div className="flex items-center justify-center text-gold">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Already tapped this round!</span>
              </div>
              <p className="text-sm text-gold mt-1">You are currently in position #{myPosition}</p>
            </div>
          )}

          {hasPressed && !showAlreadyTapped && (
            <div className="mt-6 p-4 bg-neon-green/20 rounded-lg animate-fade-in">
              <div className="flex items-center justify-center mb-2">
                {getRankIcon(myPosition)}
                <span className={`ml-2 text-2xl font-extrabold text-neon-green animate-bounce`}> 
                  {myPosition === 1
                    ? "1st Place!"
                    : myPosition === 2
                      ? "2nd Place!"
                      : myPosition === 3
                        ? "3rd Place!"
                        : `${myPosition}th Place`}
                </span>
              </div>
              <div className="text-sm text-electric-blue">Tapped at {pressTime}</div>
            </div>
          )}
        </div>

        {/* Leaderboard Card */}
        <div className={`p-6 rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
          theme === 'dark' 
            ? 'bg-white/5 border-indigo-500/30' 
            : 'bg-white/60 border-blue-300'
        } animate-fade-in`}> 
          <h3 className={`text-xl font-bold mb-4 uppercase tracking-wider ${
            theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
          }`}>Round {session.round} Leaderboard</h3>
          <div className="space-y-2">
            {tapOrder.slice(0, 10).map((tap, index) => (
              <div
                key={index}
                className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl gap-2 ${
                  tap.playerName === playerData.playerName 
                    ? theme === 'dark' 
                      ? "bg-indigo-500/20 border-2 border-purple-500" 
                      : "bg-blue-100 border-2 border-blue-500"
                    : theme === 'dark'
                      ? "bg-indigo-500/10"
                      : "bg-gray-50"
                } animate-fade-in`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-extrabold shadow-lg ${
                      index === 0
                        ? `${theme === 'dark' ? 'bg-indigo-500' : 'bg-blue-500'} text-white animate-bounce`
                        : index === 1
                          ? `${theme === 'dark' ? 'bg-purple-500' : 'bg-purple-500'} text-white`
                          : index === 2
                            ? `${theme === 'dark' ? 'bg-indigo-600' : 'bg-blue-600'} text-white`
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-300'
                              : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span
                      className={`font-bold ${
                        tap.playerName === playerData?.playerName 
                          ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          : theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'
                      }`}
                    >
                      {tap.playerName}
                    </span>
                    {tap.teamName && (
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'
                      }`}>Team: {tap.teamName}</div>
                    )}
                  </div>
                </div>
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}>{tap.time}</span>
              </div>
            ))}
            {tapOrder.length === 0 && (
              <div className={`text-center py-4 ${
                theme === 'dark' ? 'text-indigo-300/60' : 'text-gray-500'
              }`}>
                <Clock className={`w-8 h-8 mx-auto mb-2 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'
                } animate-pulse`} />
                <p>No taps yet this round</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default UserGamePage