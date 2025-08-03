"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Hash, Users, Play, User, UserPlus, AlertCircle, CheckCircle, Camera } from "lucide-react"
import jsQR from "jsqr"
import api from "../services/api"
import { useTheme } from '../contexts/ThemeContext'
import PageLayout from '../components/PageLayout'

const JoinPage = () => {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const { theme } = useTheme()
  const [step, setStep] = useState(1)
  const [sessionData, setSessionData] = useState(null)
  const [formData, setFormData] = useState({
    joiningCode: "",
    teamName: "",
    password: "",
    playerName: "",
    joinMode: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(null)
  const [existingPlayerInfo, setExistingPlayerInfo] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null) // To store the camera stream for proper cleanup

  // Pre-fill joining code from URL parameter
  useEffect(() => {
    if (sessionId) {
      setFormData((prev) => ({ ...prev, joiningCode: sessionId.toUpperCase().slice(0, 6) }))
      handleNext() // Automatically validate the sessionId
    }
  }, [sessionId])

  // QR code scanner setup
  useEffect(() => {
    if (showScanner) {
      const startScanner = async () => {
        const video = videoRef.current
        const canvas = canvasRef.current

        if (!video || !canvas) {
          setError("Video or canvas element not found.")
          setShowScanner(false)
          return
        }

        try {
          // Request camera access
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
          video.srcObject = stream
          streamRef.current = stream // Store stream for cleanup
          await video.play()
          requestAnimationFrame(tick) // Start the scanning loop
        } catch (err) {
          console.error("Error accessing camera:", err)
          setError("Could not access camera. Please ensure it's allowed.")
          setShowScanner(false)
        }
      }

      const tick = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })

          if (code) {
            try {
              const url = new URL(code.data)
              // Assuming QR code contains a URL like https://yourgame.com/join/:sessionId
              const pathParts = url.pathname.split('/')
              const sessionIdFromQR = pathParts[pathParts.length - 1] // Extract sessionId from /join/:sessionId
              if (sessionIdFromQR) {
                console.log("QR Code session ID:", sessionIdFromQR)
                setFormData((prev) => ({ ...prev, joiningCode: sessionIdFromQR.toUpperCase().slice(0, 6) }))
                stopScanner()
                handleNext()
                return // Stop further scanning
              }
            } catch (e) {
              console.warn("QR code data is not a valid URL or malformed:", code.data, e)
              // Continue scanning if it's not a valid URL for sessionId extraction
            }
          }
        }

        if (showScanner) { // Continue scanning only if showScanner is still true
          requestAnimationFrame(tick)
        }
      }

      startScanner()

      // Cleanup function for useEffect
      return () => {
        stopScanner()
      }
    }
  }, [showScanner]) // Depend on showScanner to re-run effect when it changes

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowScanner(false)
  }

  const handleNext = async () => {
    setError("")

    if (step === 1 && formData.joiningCode.length === 6) {
      setLoading(true)
      try {
        const response = await api.getSession(formData.joiningCode)
        console.log("getSession Response:", response)
        if (response.success && response.data) {
          console.log("Session data:", response.data)
          setSessionData(response.data)
          if (response.data.playerMode === "single") {
            setStep(4)
          } else if (response.data.playerMode === "teams") {
            setStep(2)
          } else { // if playerMode is "both" or undefined/malformed
            setStep(2)
          }
        } else {
          console.log("Invalid session response:", response)
          setError("Invalid joining code. Please check and try again.")
        }
      } catch (error) {
        console.error("Error validating session:", error.message, error.response?.data)
        setError(`Failed to validate joining code: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`)
      }
      setLoading(false)
    } else if (step === 2) {
      if (sessionData.playerMode === "teams") {
        handleInputChange("joinMode", "existing_team") // Pre-select existing team if session is teams-only
        setStep(3)
      } else if (sessionData.playerMode === "both" && formData.joinMode) {
        if (formData.joinMode === "single") {
          setStep(4)
        } else if (formData.joinMode === "existing_team") {
          setStep(3)
        } else if (formData.joinMode === "new_team") {
          setStep(5)
        }
      } else {
        setError("Please select a join mode.")
      }
    } else if (step === 3 && formData.teamName.trim() && formData.password.trim()) {
      setLoading(true)
      try {
        console.log("Validating team:", { sessionId: formData.joiningCode, teamName: formData.teamName })
        const response = await api.validateTeam(formData.joiningCode, formData.teamName, formData.password)
        console.log("validateTeam Response:", response)
        if (response.success && response.isValid) {
          setStep(4)
        } else {
          setError("Invalid team name or password. Please check and try again.")
        }
      } catch (error) {
        console.error("Error validating team:", error.message, error.response?.data)
        setError(`Failed to validate team credentials: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`)
      }
      setLoading(false)
    } else if (step === 4 && formData.playerName.trim()) {
      setLoading(true)
      try {
        console.log("Checking player:", { sessionId: formData.joiningCode, playerName: formData.playerName })
        const playerCheck = await api.checkPlayerExists(formData.joiningCode, formData.playerName)
        console.log("checkPlayerExists Response:", playerCheck)
        if (playerCheck.success && playerCheck.exists && playerCheck.exists.exists) {
          const playerResponse = await api.getPlayerWithTeamInfo(formData.joiningCode, formData.playerName)
          console.log("getPlayerWithTeamInfo Response:", playerResponse)
          if (playerResponse.success && playerResponse.player) {
            // Handle player data whether it's an array or object
            const playerData = Array.isArray(playerResponse.player) ? playerResponse.player[0] : playerResponse.player
            setExistingPlayerInfo(playerData)
            setShowConfirmation("player")
            setLoading(false)
            return // Stop here to show confirmation
          } else {
            setError("Failed to fetch existing player information. Please try again.")
          }
        }

        await joinGame()
      } catch (error) {
        console.error("Error checking player/joining game:", error.message, error.response?.data)
        setError(`Failed to join game: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`)
        setLoading(false)
      }
    } else if (step === 5 && formData.teamName.trim() && formData.password.trim()) {
      setLoading(true)
      try {
        console.log("Checking team exists:", { sessionId: formData.joiningCode, teamName: formData.teamName })
        const teamCheck = await api.checkTeamExists(formData.joiningCode, formData.teamName)
        console.log("checkTeamExists Response:", teamCheck)
        if (teamCheck.success && teamCheck.exists) {
          setShowConfirmation("team")
          setLoading(false)
          return // Stop here to show confirmation
        }

        console.log("Creating team:", { sessionId: formData.joiningCode, teamName: formData.teamName })
        const createTeamResponse = await api.createTeam(formData.joiningCode, formData.teamName, formData.password, "player")
        console.log("createTeam Response:", createTeamResponse)
        if (createTeamResponse.success) {
          setStep(4) // Move to player name entry after creating team
        } else {
          throw new Error(createTeamResponse.error || "Failed to create team")
        }
      } catch (error) {
        console.error("Error creating team:", error.message, error.response?.data)
        setError(`Failed to create team: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`)
      }
      setLoading(false)
    } else {
        // Handle cases where required fields are not filled for the current step
        if (step === 1) setError("Please enter a 6-character joining code.")
        if (step === 3) setError("Please enter both team name and password.")
        if (step === 4) setError("Please enter your player name.")
        if (step === 5) setError("Please enter both team name and password for your new team.")
    }
  }

  const joinGame = async () => {
    try {
      let teamId = null

      if (formData.joinMode !== "single" && formData.teamName) {
        console.log("Fetching team for player join:", { sessionId: formData.joiningCode, teamName: formData.teamName })
        const teamResponse = await api.getTeam(formData.joiningCode, formData.teamName)
        console.log("getTeam Response for player join:", teamResponse)
        if (teamResponse.success && teamResponse.team) {
          teamId = teamResponse.team.teamId
        } else {
          throw new Error(teamResponse.error || "Team not found when trying to join.")
        }
      }

      console.log("Creating player:", { sessionId: formData.joiningCode, teamId, playerName: formData.playerName, joinMode: formData.joinMode })
      const createPlayerResponse = await api.createPlayer(formData.joiningCode, teamId, formData.playerName, formData.joinMode)
      console.log("createPlayer Response:", createPlayerResponse)
      if (!createPlayerResponse.success) {
        throw new Error(createPlayerResponse.error || "Failed to create player")
      }

      sessionStorage.setItem(
        `player_${formData.joiningCode}`,
        JSON.stringify({
          playerName: formData.playerName,
          teamName: formData.teamName || null,
          joinMode: formData.joinMode,
        }),
      )

      navigate(`/game/${formData.joiningCode}`)
    } catch (error) {
      console.error("Error joining game:", error.message, error.response?.data)
      setError(`Failed to join game: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmation = async (confirmed) => {
    if (confirmed) {
      if (showConfirmation === "player") {
        sessionStorage.setItem(
          `player_${formData.joiningCode}`,
          JSON.stringify({
            playerName: formData.playerName,
            teamName: existingPlayerInfo?.teamInfo?.teamName || formData.teamName || null,
            joinMode: existingPlayerInfo?.joinMode || formData.joinMode,
          }),
        )
        navigate(`/game/${formData.joiningCode}`)
      } else if (showConfirmation === "team") {
        // If confirmed that it's their team, proceed to player name entry for this team
        setStep(4)
      }
    } else {
      if (showConfirmation === "player") {
        setError("Please choose a different player name.")
        setFormData((prev) => ({ ...prev, playerName: "" })); // Clear player name field
      } else if (showConfirmation === "team") {
        setError("Please choose a different team name.")
        setFormData((prev) => ({ ...prev, teamName: "", password: "" })); // Clear team name and password
      }
    }
    setShowConfirmation(null)
    setExistingPlayerInfo(null)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error on input change
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Hash className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
              }`} />
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Enter Joining Code</h2>
              <p className={`${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Get the 6-character code from your host or scan the QR code</p>
            </div>
            <div>
              <input
                type="text"
                placeholder="ABC123"
                className={`w-full text-center text-2xl font-bold tracking-widest uppercase rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-blue-200 text-gray-800 placeholder-blue-300 focus:border-blue-400'
                }`}
                value={formData.joiningCode}
                onChange={(e) =>
                  handleInputChange(
                    "joiningCode",
                    e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .slice(0, 6)
                      .toUpperCase(),
                  )
                }
                maxLength="6"
              />
              <button
                onClick={() => {
                  stopScanner(); // Ensure scanner is stopped if already running
                  setShowScanner(true);
                }}
                className={`mt-4 flex items-center justify-center w-full py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/50'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <Camera className="w-5 h-5 mr-2" />
                Scan QR Code
              </button>
            </div>
            {showScanner && (
              <div className="mt-4 flex flex-col items-center">
                <video 
                  ref={videoRef} 
                  className={`w-full max-w-sm rounded-lg ${
                    theme === 'dark'
                      ? 'border-2 border-indigo-500/30'
                      : 'border border-gray-300'
                  }`} 
                  autoPlay 
                  playsInline 
                  muted 
                />
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={stopScanner}
                  className={`mt-4 w-full max-w-sm py-3 transition-colors ${
                    theme === 'dark'
                      ? 'text-indigo-400 hover:text-indigo-300'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cancel Scanning
                </button>
              </div>
            )}
          </div>
        )

      case 2:
        if (sessionData?.playerMode === "both") {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <UserPlus className={`w-16 h-16 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h2 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Choose Join Mode</h2>
                <p className={theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'}>
                  How would you like to participate?
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleInputChange("joinMode", "single")}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? formData.joinMode === "single"
                        ? 'border-indigo-500 bg-indigo-900/50'
                        : 'border-gray-700 hover:border-indigo-500/50 bg-gray-800/50'
                      : formData.joinMode === "single"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <User className={`w-6 h-6 mx-auto mb-2 ${
                    theme === 'dark' 
                      ? formData.joinMode === "single"
                        ? 'text-indigo-400'
                        : 'text-indigo-400/70'
                      : 'text-blue-600'
                  }`} />
                  <div className={`font-semibold ${
                    theme === 'dark'
                      ? formData.joinMode === "single"
                        ? 'text-white'
                        : 'text-indigo-200'
                      : 'text-gray-800'
                  }`}>Join as Single Player</div>
                </button>
                <button
                  onClick={() => handleInputChange("joinMode", "existing_team")}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? formData.joinMode === "existing_team"
                        ? 'border-indigo-500 bg-indigo-900/50'
                        : 'border-gray-700 hover:border-indigo-500/50 bg-gray-800/50'
                      : formData.joinMode === "existing_team"
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-2 ${
                    theme === 'dark'
                      ? formData.joinMode === "existing_team"
                        ? 'text-indigo-400'
                        : 'text-indigo-400/70'
                      : 'text-teal-600'
                  }`} />
                  <div className={`font-semibold ${
                    theme === 'dark'
                      ? formData.joinMode === "existing_team"
                        ? 'text-white'
                        : 'text-indigo-200'
                      : 'text-gray-800'
                  }`}>Join Existing Team</div>
                </button>
                <button
                  onClick={() => {
                    handleInputChange("joinMode", "new_team")
                    // setStep(5) is handled by handleNext after this state update
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? formData.joinMode === "new_team"
                        ? 'border-indigo-500 bg-indigo-900/50'
                        : 'border-gray-700 hover:border-indigo-500/50 bg-gray-800/50'
                      : formData.joinMode === "new_team"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-2 ${
                    theme === 'dark'
                      ? formData.joinMode === "new_team"
                        ? 'text-indigo-400'
                        : 'text-indigo-400/70'
                      : 'text-orange-600'
                  }`} />
                  <div className={`font-semibold ${
                    theme === 'dark'
                      ? formData.joinMode === "new_team"
                        ? 'text-white'
                        : 'text-indigo-200'
                      : 'text-gray-800'
                  }`}>Create New Team</div>
                </button>
              </div>
            </div>
          )
        } else { // sessionData.playerMode === "teams"
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Users className={`w-16 h-16 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-teal-600'
                }`} />
                <h2 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Teams Only Mode</h2>
                <p className={theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'}>
                  This session requires team participation
                </p>
                <div className={`mt-4 p-4 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-indigo-900/30 border-indigo-500/30'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-blue-700'
                  }`}>
                    <strong>Host has set this session to teams only.</strong>
                    <br />
                    You need to get a team name and password from the host to join.
                  </p>
                </div>
              </div>
              {/* This button implicitly sets joinMode to existing_team and proceeds to step 3 */}
              <button
                onClick={() => {
                  handleInputChange("joinMode", "existing_team")
                  // setStep(3) is handled by handleNext after this state update
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-900/50 hover:bg-indigo-800/50'
                    : 'border-teal-200 bg-teal-50 hover:bg-teal-100 hover:border-teal-300'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-teal-600'
                }`} />
                <div className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Enter Team Credentials</div>
                <div className={`text-sm ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-teal-600'
                }`}>Get team name and password from host</div>
              </button>
            </div>
          )
        }

      case 3: // Join Existing Team
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Users className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-teal-600'
              }`} />
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Join Existing Team</h2>
              <p className={theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'}>
                Enter team credentials
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Team Name"
                className={`w-full text-center text-xl rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-teal-200 text-gray-800 placeholder-teal-300 focus:border-teal-400'
                }`}
                value={formData.teamName}
                onChange={(e) => handleInputChange("teamName", e.target.value)}
              />
              <input
                type="password"
                placeholder="Team Password"
                className={`w-full text-center text-xl rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-teal-200 text-gray-800 placeholder-teal-300 focus:border-teal-400'
                }`}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>
          </div>
        )

      case 4: // Enter Player Name (for single or team)
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
              }`} />
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Enter Your Name</h2>
              <p className={theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'}>
                {formData.joinMode === "single" ? "Playing as individual" : formData.teamName ? `Joining team: ${formData.teamName}` : "Enter your name"}
              </p>
            </div>
            <div>
              <input
                type="text"
                placeholder="Your Name"
                className={`w-full text-center text-xl rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-blue-200 text-gray-800 placeholder-blue-300 focus:border-blue-400'
                }`}
                value={formData.playerName}
                onChange={(e) => handleInputChange("playerName", e.target.value)}
              />
            </div>
          </div>
        )

      case 5: // Create New Team
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <UserPlus className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-orange-600'
              }`} />
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Create New Team</h2>
              <p className={theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'}>
                Set up your team credentials
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Team Name"
                className={`w-full text-center text-xl rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-orange-200 text-gray-800 placeholder-orange-300 focus:border-orange-400'
                }`}
                value={formData.teamName}
                onChange={(e) => handleInputChange("teamName", e.target.value)}
              />
              <input
                type="password"
                placeholder="Team Password"
                className={`w-full text-center text-xl rounded-lg p-3 transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-2 border-indigo-500/30 text-white placeholder-indigo-400/50 focus:border-indigo-400'
                    : 'bg-white border-2 border-orange-200 text-gray-800 placeholder-orange-300 focus:border-orange-400'
                }`}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.joiningCode.length === 6
      case 2:
        // Only applicable if playerMode is "both" and a choice has been made
        return sessionData?.playerMode === "teams" || (sessionData?.playerMode === "both" && formData.joinMode !== "")
      case 3:
        return formData.teamName.trim().length > 0 && formData.password.trim().length > 0
      case 4:
        return formData.playerName.trim().length > 0
      case 5:
        return formData.teamName.trim().length > 0 && formData.password.trim().length > 0
      default:
        return false
    }
  }

  const getStepCount = () => {
    if (!sessionData) return 1 // Initial state before session data is loaded
    if (sessionData.playerMode === "single") return 2 // Code -> Player Name
    if (sessionData.playerMode === "teams") return 3 // Code -> Team Creds -> Player Name
    if (sessionData.playerMode === "both") {
        if (formData.joinMode === "single") return 3 // Code -> Choose Mode -> Player Name
        if (formData.joinMode === "existing_team") return 4 // Code -> Choose Mode -> Team Creds -> Player Name
        if (formData.joinMode === "new_team") return 4 // Code -> Choose Mode -> Create Team -> Player Name
        return 2 // Default when "both" mode is selected but no joinMode chosen yet (Code -> Choose Mode)
    }
    return 1 // Fallback
  }
  
  return (
    <PageLayout>
      <div className="w-full max-w-lg mx-auto">
        <button
          onClick={() => navigate("/")}
          className={`flex items-center ${theme === 'dark' ? 'text-indigo-400 hover:text-purple-400' : 'text-blue-600 hover:text-purple-600'} mb-8 transition-colors`}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        <div className={`p-8 rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
          theme === 'dark' 
            ? 'bg-white/5 border-indigo-500/30' 
            : 'bg-white/60 border-blue-300'
        }`}>
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              {Array.from({ length: getStepCount() }, (_, i) => i + 1).map((i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                      i <= step 
                        ? theme === 'dark'
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-blue-500 text-white'
                        : theme === 'dark'
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i}
                  </div>
                  {i < getStepCount() && (
                    <div className={`w-8 h-1 mx-2 ${
                      i < step 
                        ? theme === 'dark'
                          ? 'bg-indigo-500' 
                          : 'bg-blue-500'
                        : theme === 'dark'
                          ? 'bg-gray-800'
                          : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
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
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-red-300' : 'text-red-600'
              }`}>{error}</p>
            </div>
          )}

          {renderStep()}

          <div className="mt-8 space-y-4">
            <button
              onClick={handleNext}
              className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center ${
                theme === 'dark'
                  ? !canProceed() || loading || showScanner
                    ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : !canProceed() || loading || showScanner
                    ? 'bg-blue-600/50 text-white/50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              disabled={!canProceed() || loading || showScanner}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {step === 1 ? "Validating..." : step === getStepCount() ? "Joining..." : "Processing..."}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {step === getStepCount() ? "Join Game" : "Next"}
                  <Play className="w-5 h-5 ml-2" />
                </div>
              )}
            </button>

            {/* Back button logic */}
            {step > 1 && !showScanner && (
                <button
                    onClick={() => {
                        // Custom back logic for "both" player mode
                        if (step === 4 && sessionData?.playerMode === "both" && formData.joinMode !== "single") {
                            // If coming from team entry, go back to team choice or team creation based on joinMode
                            if (formData.joinMode === "existing_team") {
                                setStep(3); // Go back to existing team details
                            } else if (formData.joinMode === "new_team") {
                                setStep(5); // Go back to new team creation
                            }
                        } else if (step === 3 && sessionData?.playerMode === "teams") {
                            // If in teams-only mode, step 3 goes back to step 1 (joining code)
                            setStep(1);
                        } else if (step === 5 && sessionData?.playerMode === "both") {
                            // If creating a new team, go back to join mode selection
                            setStep(2);
                        }
                        else if (step === 4 && sessionData?.playerMode === "single") {
                            // If single player mode, from player name, go back to joining code
                            setStep(1);
                        }
                        else {
                            setStep(step - 1); // Default back one step
                        }
                        setError(""); // Clear error when going back
                    }}
                    className={`w-full py-3 transition-colors font-medium ${
                      theme === 'dark'
                        ? loading
                          ? 'text-indigo-400/50 cursor-not-allowed'
                          : 'text-indigo-400 hover:text-indigo-300'
                        : loading
                          ? 'text-gray-600/50 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-800'
                    }`}
                    disabled={loading}
                >
                    Back
                </button>
            )}
          </div>
        </div>

        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`p-8 rounded-3xl shadow-2xl max-w-md w-full ${
              theme === 'dark'
                ? 'bg-gray-900/95 border-2 border-indigo-500/30'
                : 'bg-white/95 border-2 border-blue-200'
            }`}>
              <div className="flex items-center mb-4">
                <AlertCircle className={`w-8 h-8 mr-3 ${
                  theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                }`} />
                <h3 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  {showConfirmation === "player" ? "Player Name Exists" : "Team Name Exists"}
                </h3>
              </div>

              {showConfirmation === "player" && existingPlayerInfo ? (
                <div className="mb-6">
                  <p className={`mb-4 ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
                  }`}>
                    A player named <strong>"{formData.playerName}"</strong> already exists in this session.
                  </p>
                  <div className={`p-4 rounded-lg mb-4 ${
                    theme === 'dark'
                      ? 'bg-indigo-900/30 border border-indigo-500/30'
                      : 'bg-blue-50'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      theme === 'dark' ? 'text-indigo-300' : 'text-blue-800'
                    }`}>Existing Player Info:</h4>
                    <div className={`text-sm space-y-1 ${
                      theme === 'dark' ? 'text-indigo-200' : 'text-blue-700'
                    }`}>
                      <div>• Name: {existingPlayerInfo.playerName}</div>
                      <div>• Mode: {existingPlayerInfo.joinMode === "single" ? "Solo Player" : "Team Player"}</div>
                      {existingPlayerInfo.teamInfo && <div>• Team: {existingPlayerInfo.teamInfo.teamName}</div>}
                      <div>• Joined: {new Date(existingPlayerInfo.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <p className={theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'}>
                    Is this you?
                  </p>
                </div>
              ) : (
                <p className={`mb-6 ${
                  theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
                }`}>
                  {showConfirmation === "player"
                    ? `A player named "${formData.playerName}" already exists in this session. Is this you?`
                    : `A team named "${formData.teamName}" already exists in this session. Do you want to join this team?`}
                </p>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => handleConfirmation(true)}
                  className={`flex-1 flex items-center justify-center py-3 px-6 rounded-xl font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`} // btn-secondary replaced with btn-primary for "Yes"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Yes, that's {showConfirmation === "player" ? "me" : "my team"}
                </button>
                <button
                  onClick={() => handleConfirmation(false)}
                  className={`flex-1 py-3 px-6 rounded-xl border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  No, use different name
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default JoinPage