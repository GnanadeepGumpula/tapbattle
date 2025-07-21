"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Hand, Trophy, Clock, Users, Home, User, AlertCircle } from "lucide-react"
import api from "../services/api"

const UserGamePage = () => {
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
        navigate("/join")
        return
      }

      setPlayerData(storedPlayerData)
      await loadGameData()
    } catch (error) {
      console.error("Error initializing player:", error)
      navigate("/join")
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
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Game Session</h1>
            <p className="text-gray-600">{playerData.playerName}</p>
            {playerData.teamName && <p className="text-sm text-teal-600">Team: {playerData.teamName}</p>}
          </div>
          <button
            onClick={() => navigate("/")}
            disabled={isUpdatingRef.current}
            className={`p-2 text-gray-600 hover:text-gray-800 transition-colors ${isUpdatingRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="card text-center mb-8">
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Session Code</div>
            <div className="text-2xl font-bold text-blue-600">{sessionId}</div>
          </div>
          <div className="flex justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Round {session.round}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {tapOrder.length} tapped
            </div>
            <div className="flex items-center">
              {playerData.teamName ? <Users className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />}
              {playerData.teamName ? "Team" : "Solo"}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-2">Last updated: {lastUpdated}</div>
        </div>

        <div className="card text-center mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Response Challenge</h2>

          <button
            onClick={handleButtonPress}
            disabled={hasPressed}
            className={`tap-button ${hasPressed ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {hasPressed ? (
              <div className="flex items-center justify-center">
                <Trophy className="w-8 h-8 mr-2" />
                TAPPED!
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Hand className="w-8 h-8 mr-2" />
                TAP NOW!
              </div>
            )}
          </button>

          {showAlreadyTapped && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-center text-orange-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Already tapped this round!</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">You are currently in position #{myPosition}</p>
            </div>
          )}

          {hasPressed && !showAlreadyTapped && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {getRankIcon(myPosition)}
                <span className={`ml-2 text-xl font-bold ${getRankColor(myPosition)}`}>
                  {myPosition === 1
                    ? "1st Place!"
                    : myPosition === 2
                      ? "2nd Place!"
                      : myPosition === 3
                        ? "3rd Place!"
                        : `${myPosition}th Place`}
                </span>
              </div>
              <div className="text-sm text-gray-600">Tapped at {pressTime}</div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Round {session.round} Leaderboard</h3>
          <div className="space-y-2">
            {tapOrder.slice(0, 10).map((tap, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  tap.playerName === playerData.playerName ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? "bg-yellow-500 text-white"
                        : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                            ? "bg-orange-500 text-white"
                            : "bg-blue-500 text-white"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span
                      className={`font-medium ${tap.playerName === playerData.playerName ? "text-blue-800" : "text-gray-800"}`}
                    >
                      {tap.playerName}
                    </span>
                    {tap.teamName && <div className="text-xs text-teal-600">Team: {tap.teamName}</div>}
                  </div>
                </div>
                <span className="text-sm text-gray-500">{tap.time}</span>
              </div>
            ))}
            {tapOrder.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No taps yet this round</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserGamePage