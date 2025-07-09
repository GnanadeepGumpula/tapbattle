"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Hash, Users, Play, User, UserPlus, AlertCircle, CheckCircle } from "lucide-react"
import googleSheetsService from "../services/googleSheets"

const JoinPage = () => {
  const navigate = useNavigate()
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

  const handleNext = async () => {
    setError("")

    if (step === 1 && formData.joiningCode.length === 6) {
      setLoading(true)
      try {
        const sessionInfo = await googleSheetsService.getSession(formData.joiningCode)
        if (sessionInfo) {
          setSessionData(sessionInfo)
          if (sessionInfo.playerMode === "single") {
            setStep(4)
          } else if (sessionInfo.playerMode === "teams") {
            setStep(2)
          } else {
            setStep(2)
          }
        } else {
          setError("Invalid joining code. Please check and try again.")
        }
      } catch (error) {
        console.error("Error validating session:", error)
        setError("Failed to validate joining code. Please try again.")
      }
      setLoading(false)
    } else if (step === 2) {
      if (sessionData.playerMode === "teams") {
        // Automatically proceed to team credentials for teams-only mode
        handleInputChange("joinMode", "existing_team")
        setStep(3)
      } else if (sessionData.playerMode === "both" && formData.joinMode) {
        if (formData.joinMode === "single") {
          setStep(4)
        } else if (formData.joinMode === "existing_team") {
          setStep(3)
        }
      }
    } else if (step === 3 && formData.teamName.trim() && formData.password.trim()) {
      setLoading(true)
      try {
        const isValid = await googleSheetsService.validateTeam(
          formData.joiningCode,
          formData.teamName,
          formData.password,
        )
        if (isValid) {
          setStep(4)
        } else {
          setError("Invalid team name or password. Please check and try again.")
        }
      } catch (error) {
        console.error("Error validating team:", error)
        setError("Failed to validate team credentials. Please try again.")
      }
      setLoading(false)
    } else if (step === 4 && formData.playerName.trim()) {
      setLoading(true)
      try {
        // Check if player name already exists
        const playerCheck = await googleSheetsService.checkPlayerExists(formData.joiningCode, formData.playerName)
        if (playerCheck.exists) {
          // Get additional info about the existing player
          const playerWithTeam = await googleSheetsService.getPlayerWithTeamInfo(
            formData.joiningCode,
            formData.playerName,
          )
          setExistingPlayerInfo(playerWithTeam)
          setShowConfirmation("player")
          setLoading(false)
          return
        }

        await joinGame()
      } catch (error) {
        console.error("Error checking player:", error)
        setError("Failed to join game. Please try again.")
        setLoading(false)
      }
    } else if (step === 5 && formData.teamName.trim() && formData.password.trim()) {
      setLoading(true)
      try {
        // Check if team name already exists
        const teamExists = await googleSheetsService.checkTeamExists(formData.joiningCode, formData.teamName)
        if (teamExists) {
          setShowConfirmation("team")
          setLoading(false)
          return
        }

        // Create new team
        await googleSheetsService.createTeam(formData.joiningCode, formData.teamName, formData.password)
        setStep(4)
      } catch (error) {
        console.error("Error creating team:", error)
        setError("Failed to create team. Please try again.")
      }
      setLoading(false)
    }
  }

  const joinGame = async () => {
    try {
      let teamId = null

      if (formData.joinMode !== "single" && formData.teamName) {
        const team = await googleSheetsService.getTeam(formData.joiningCode, formData.teamName)
        teamId = team?.teamId
      }

      await googleSheetsService.createPlayer(formData.joiningCode, teamId, formData.playerName, formData.joinMode)

      // Store player data in session storage
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
      console.error("Error joining game:", error)
      setError("Failed to join game. Please try again.")
    }
    setLoading(false)
  }

  const handleConfirmation = async (confirmed) => {
    if (confirmed) {
      if (showConfirmation === "player") {
        // Use existing player - just store in session and navigate
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
        // Use existing team
        setStep(4)
      }
    } else {
      // Ask for different name
      if (showConfirmation === "player") {
        setError("Please choose a different player name.")
      } else if (showConfirmation === "team") {
        setError("Please choose a different team name.")
      }
    }
    setShowConfirmation(null)
    setExistingPlayerInfo(null)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Hash className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Enter Joining Code</h2>
              <p className="text-gray-600">Get the 6-character code from your host</p>
            </div>
            <div>
              <input
                type="text"
                placeholder="ABC123"
                className="input-field text-center text-2xl font-bold tracking-widest uppercase"
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
            </div>
          </div>
        )

      case 2:
        if (sessionData?.playerMode === "both") {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <UserPlus className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Join Mode</h2>
                <p className="text-gray-600">How would you like to participate?</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleInputChange("joinMode", "single")}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    formData.joinMode === "single"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <User className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold text-gray-800">Join as Single Player</div>
                </button>
                <button
                  onClick={() => handleInputChange("joinMode", "existing_team")}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    formData.joinMode === "existing_team"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <Users className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <div className="font-semibold text-gray-800">Join Existing Team</div>
                </button>
              </div>
            </div>
          )
        } else {
          // Teams only mode
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Users className="w-16 h-16 text-teal-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Teams Only Mode</h2>
                <p className="text-gray-600">This session requires team participation</p>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Host has set this session to teams only.</strong>
                    <br />
                    You need to get a team name and password from the host to join.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleInputChange("joinMode", "existing_team")
                  setStep(3)
                }}
                className="w-full p-4 bg-teal-50 hover:bg-teal-100 rounded-xl border-2 border-teal-200 hover:border-teal-300 transition-all"
              >
                <Users className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-800">Enter Team Credentials</div>
                <div className="text-sm text-teal-600">Get team name and password from host</div>
              </button>
            </div>
          )
        }

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-teal-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Join Existing Team</h2>
              <p className="text-gray-600">Enter team credentials</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Team Name"
                className="input-field text-center text-xl"
                value={formData.teamName}
                onChange={(e) => handleInputChange("teamName", e.target.value)}
              />
              <input
                type="password"
                placeholder="Team Password"
                className="input-field text-center text-xl"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Enter Your Name</h2>
              <p className="text-gray-600">
                {formData.teamName ? `Joining team: ${formData.teamName}` : "Playing as individual"}
              </p>
            </div>
            <div>
              <input
                type="text"
                placeholder="Your Name"
                className="input-field text-center text-xl"
                value={formData.playerName}
                onChange={(e) => handleInputChange("playerName", e.target.value)}
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <UserPlus className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create New Team</h2>
              <p className="text-gray-600">Set up your team credentials</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Team Name"
                className="input-field text-center text-xl"
                value={formData.teamName}
                onChange={(e) => handleInputChange("teamName", e.target.value)}
              />
              <input
                type="password"
                placeholder="Team Password"
                className="input-field text-center text-xl"
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
        return formData.joinMode !== ""
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
    if (!sessionData) return 3
    if (sessionData.playerMode === "single") return 2
    if (formData.joinMode === "single") return 3
    if (formData.joinMode === "existing_team") return 4
    if (formData.joinMode === "new_team") return 4
    return 4
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        <div className="card">
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              {Array.from({ length: getStepCount() }, (_, i) => i + 1).map((i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i <= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i}
                  </div>
                  {i < getStepCount() && <div className={`w-8 h-1 mx-2 ${i < step ? "bg-blue-600" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {renderStep()}

          <div className="mt-8 space-y-4">
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={`btn-primary w-full ${!canProceed() || loading ? "opacity-50 cursor-not-allowed" : ""}`}
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

            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={loading}
              >
                Back
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-800">
                  {showConfirmation === "player" ? "Player Name Exists" : "Team Name Exists"}
                </h3>
              </div>

              {showConfirmation === "player" && existingPlayerInfo ? (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    A player named <strong>"{formData.playerName}"</strong> already exists in this session.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Existing Player Info:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>• Name: {existingPlayerInfo.playerName}</div>
                      <div>• Mode: {existingPlayerInfo.joinMode === "single" ? "Solo Player" : "Team Player"}</div>
                      {existingPlayerInfo.teamInfo && <div>• Team: {existingPlayerInfo.teamInfo.teamName}</div>}
                      <div>• Joined: {new Date(existingPlayerInfo.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <p className="text-gray-600">Is this you?</p>
                </div>
              ) : (
                <p className="text-gray-600 mb-6">
                  {showConfirmation === "player"
                    ? `A player named "${formData.playerName}" already exists in this session. Is this you?`
                    : `A team named "${formData.teamName}" already exists in this session. Is this your team?`}
                </p>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => handleConfirmation(true)}
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Yes, that's me
                </button>
                <button
                  onClick={() => handleConfirmation(false)}
                  className="flex-1 py-3 px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  No, use different name
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinPage
