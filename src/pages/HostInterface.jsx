"use client";

import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Users, RefreshCw, Settings, Timer, Crown, User, UserPlus, Trash2, Shield, UserMinus, Download, Plus, Edit, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import api from "../services/api";
import dataExportService from "../services/dataExport";
import { useTheme } from '../contexts/ThemeContext';
import PageLayout from '../components/PageLayout';

function HostInterface() {
  const { theme } = useTheme();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [tapOrder, setTapOrder] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayersList, setTeamPlayersList] = useState([]);
  const [playerMode, setPlayerMode] = useState("both");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showPlayerModeChange, setShowPlayerModeChange] = useState(false);
  const [showTeamCreator, setShowTeamCreator] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("taporder"); // Changed default tab
  const [soloPlayers, setSoloPlayers] = useState([]);

  const lastUpdateRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const qrCodeRef = useRef(null);
  const isUpdatingRef = useRef(false);

  const joinLink = `${window.location.origin}/join/${sessionId}`;

  const loadAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) isUpdatingRef.current = true;

      const hostUser = localStorage.getItem("hostUser");
      if (!hostUser) {
        navigate("/host-login");
        return;
      }

      const sessionResponse = await api.getHostSessions(hostUser);
      if (!sessionResponse.success) throw new Error(sessionResponse.error || "Failed to load session");

      const sessionData = sessionResponse.sessions.find(s => s.sessionId === sessionId);
      if (!sessionData) {
        if (!silent) {
          setShowModeSelector(true);
          setLoading(false);
        }
        return;
      }
      
      // Ensure we have all the required session data
      const enhancedSessionData = {
        ...sessionData,
        gameCode: sessionData.gameCode || sessionId,
        status: sessionData.status || 'active'
      };

      if (sessionData.status === "completed") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setSession(sessionData);
        setPlayerMode(sessionData.playerMode);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      const [tapsResponse, teamsResponse, playersResponse] = await Promise.all([
        api.getTapOrder(sessionId, sessionData.round),
        api.getSessionTeams(sessionId),
        api.getPlayersInSession(sessionId),
      ]);

    setSession(enhancedSessionData);
    setPlayerMode(enhancedSessionData.playerMode);      setTapOrder(prevTaps =>
        tapsResponse.success && JSON.stringify(prevTaps) !== JSON.stringify(tapsResponse.taps)
          ? tapsResponse.taps
          : prevTaps
      );

      setTeams(prevTeams =>
        teamsResponse.success && JSON.stringify(prevTeams) !== JSON.stringify(teamsResponse.data)
          ? teamsResponse.data
          : prevTeams
      );

      const allPlayers = (playersResponse.success && Array.isArray(playersResponse.players))
        ? playersResponse.players
        : [];
      setPlayers(allPlayers);
      
      const soloPlayersList = allPlayers.filter(p => !p.teamId || p.joinMode === "single");
      setSoloPlayers(soloPlayersList);

      if (selectedTeam) {
        const teamPlayersList = allPlayers.filter(p => p.teamId === selectedTeam.teamId);
        setTeamPlayersList(teamPlayersList);
      }

      lastUpdateRef.current = Date.now();
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      if (!silent) {
        setLoading(false);
        isUpdatingRef.current = false;
      }
    }
  }, [sessionId, selectedTeam, navigate]);


  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  useEffect(() => {
    if (!loading && !showModeSelector && !isDeleting) {
      intervalRef.current = setInterval(() => {
        if (!isUpdatingRef.current) {
          loadAllData(true)
        }
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loading, showModeSelector, isDeleting, loadAllData])

  const createSessionWithMode = async (mode) => {
    try {
      const hostUser = localStorage.getItem("hostUser")
      const response = await api.createSession(sessionId, hostUser, mode)
      if (response.success) {
        const newSession = {
          sessionId,
          hostUsername: hostUser,
          playerMode: mode,
          round: 1,
          createdAt: new Date().toISOString(),
          active: true,
        }

        setSession(newSession)
        setPlayerMode(mode)
        setShowModeSelector(false)
        await loadAllData()
      } else {
        throw new Error(response.error || "Failed to create session")
      }
    } catch (error) {
      console.error("Error creating session:", error)
      alert("Failed to create session. Please try again.")
    }
  }

  const changePlayerMode = async (newMode) => {
    try {
      setIsDeleting(true)
      const response = await api.updateSessionRound(sessionId, session.round, newMode)
      if (response.success) {
        setSession((prev) => ({ ...prev, playerMode: newMode }))
        setPlayerMode(newMode)
        setShowPlayerModeChange(false)
        await loadAllData()
      } else {
        throw new Error(response.error || "Failed to change player mode")
      }
    } catch (error) {
      console.error("Error changing player mode:", error)
      alert("Failed to change player mode. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const createTeam = async () => {
    if (!newTeam.name.trim() || !newTeam.password.trim()) {
      alert("Please enter both team name and password")
      return
    }

    try {
      setIsDeleting(true)
      const response = await api.createTeam(sessionId, newTeam.name, newTeam.password)
      if (response.success) {
        setNewTeam({ name: "", password: "" })
        setShowTeamCreator(false)
        await loadAllData()
      } else {
        alert(response.error || "Team name already exists. Please choose a different name.")
      }
    } catch (error) {
      console.error("Error creating team:", error)
      alert("Failed to create team. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const refreshRound = async () => {
    try {
      setIsDeleting(true)
      const newRound = session.round + 1
      const clearResponse = await api.clearTapOrder(sessionId)
      if (!clearResponse.success) {
        throw new Error(clearResponse.error || "Failed to clear tap order")
      }
      const updateResponse = await api.updateSessionRound(sessionId, newRound)
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || "Failed to update session round")
      }

      setSession((prev) => ({ ...prev, round: newRound }))
      setTapOrder([])

      setTimeout(async () => {
        await loadAllData()
        setIsDeleting(false)
      }, 2000)
    } catch (error) {
      console.error("Error refreshing round:", error)
      alert("Failed to start new round. Please try again.")
      setIsDeleting(false)
    }
  }

  const copyJoiningCode = () => {
    navigator.clipboard.writeText(sessionId)
    alert("Joining code copied to clipboard!")
  }

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinLink)
    alert("Join link copied to clipboard!")
  }

  const shareJoinLink = async () => {
    try {
      await navigator.share({
        title: `Join Session ${sessionId}`,
        text: `Join my session with code ${sessionId}`,
        url: joinLink,
      })
    } catch (error) {
      console.error("Error sharing join link:", error)
      alert("Failed to share join link. You can copy it instead.")
    }
  }

  const downloadQRCode = () => {
    const canvas = qrCodeRef.current.querySelector("canvas")
    const url = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `session-${sessionId}-qrcode.png`
    link.href = url
    link.click()
  }

  const handleExportSession = async () => {
    try {
      await dataExportService.exportSessionData(sessionId)
    } catch (error) {
      alert("Failed to export session data. Please try again.")
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Are you sure you want to delete this team? All team members will be removed.")) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await api.deleteRowsByColumn("Teams", "A", teamId)
      if (response.success) {
        if (selectedTeam?.teamId === teamId) {
          setSelectedTeam(null)
          setTeamPlayersList([])
        }
        await loadAllData()
        alert("Team and all members have been completely deleted.")
      } else {
        throw new Error(response.error || "Failed to delete team")
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      alert("Failed to delete team completely. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRemovePlayer = async (playerId) => {
    const confirmDelete = window.confirm("Are you sure you want to remove this player?");
    if (!confirmDelete) return;

    try {
      const response = await api.deletePlayer(playerId);
      if (response.success) {
        setPlayers((prevPlayers) => prevPlayers.filter((p) => p.playerId !== playerId));
        alert("Player removed successfully!");
      } else {
        console.error("Failed to delete player:", response.error);
        alert("Failed to delete player. Please try again.");
      }
    } catch (err) {
      console.error("Error removing player:", err);
      alert("Error while deleting player. Try again.");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (showModeSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="card text-center">
            <Settings className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-4 sm:mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Configure Player Mode</h2>
            <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Choose how participants can join your session</p>

            <div className="grid gap-4">
              <button
                onClick={() => createSessionWithMode("single")}
                className="p-4 sm:p-6 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all"
              >
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg sm:text-xl font-bold text-blue-800 mb-2">Single Players</h3>
                <p className="text-blue-600 text-sm sm:text-base">Individual participants only</p>
              </button>

              <button
                onClick={() => createSessionWithMode("teams")}
                className="p-4 sm:p-6 bg-teal-50 hover:bg-teal-100 rounded-xl border-2 border-teal-200 hover:border-teal-300 transition-all"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 mx-auto mb-3" />
                <h3 className="text-lg sm:text-xl font-bold text-teal-800 mb-2">Teams Only</h3>
                <p className="text-teal-600 text-sm sm:text-base">Team-based participation</p>
                <p className="text-xs sm:text-sm text-teal-500 mt-2">You'll need to create teams for players to join</p>
              </button>

              <button
                onClick={() => createSessionWithMode("both")}
                className="p-4 sm:p-6 bg-purple-50 hover:bg-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-all"
              >
                <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg sm:text-xl font-bold text-purple-800 mb-2">Teams & Single Players</h3>
                <p className="text-purple-600 text-sm sm:text-base">Mixed participation mode</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Session Not Found</h2>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">The session could not be loaded.</p>
          <button
            onClick={() => navigate("/host-dashboard")}
            disabled={isUpdatingRef.current}
            className={`btn-secondary text-sm sm:text-base py-2 sm:py-3 ${isUpdatingRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const filteredSoloPlayers = Array.isArray(players)
  ? players.filter(p => !p.teamId || p.joinMode === "single")
  : [];


  return (
    <PageLayout>
      <div className="w-full max-w-7xl mx-auto min-h-screen px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-8 space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-3">
            <h1 className={`text-2xl sm:text-4xl font-extrabold mb-1 sm:mb-2 ${
              theme === 'dark'
                ? 'text-indigo-400 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'text-blue-600 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            }`}>Host Interface</h1>
            <p className={`text-lg font-medium ${
              theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'
            }`}>Session: <span className={theme === 'dark' ? 'text-purple-400 font-bold' : 'text-purple-600 font-bold'}>{sessionId}</span></p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportSession}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              } ${isUpdatingRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isUpdatingRef.current}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={() => navigate("/host-dashboard")}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              } ${isUpdatingRef.current ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isUpdatingRef.current}
            >
              Back
            </button>
          </div>
        </div>

        {/* --- FIXED: Restructured this section --- */}
        <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 mb-4 sm:mb-8 ${
          theme === 'dark'
            ? 'bg-white/5 border-indigo-500/30'
            : 'bg-white/60 border-blue-300'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
            <h2 className={`text-lg sm:text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Session Information</h2>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowPlayerModeChange(true)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                  theme === 'dark'
                    ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isUpdatingRef.current}
              >
                <Edit className="w-4 h-4 mr-1 sm:mr-2" />
                Change Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h3 className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Game Code</h3>
              <div className="flex items-center justify-between">
                <p className={`text-lg sm:text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{session?.gameCode || 'Loading...'}</p>
                <button
                  onClick={copyJoiningCode}
                  className={`ml-2 p-1 rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title="Copy Game Code"
                  disabled={isUpdatingRef.current}
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h3 className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Player Mode</h3>
              <p className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>{playerMode === "single" ? "Solo Only" : playerMode === "teams" ? "Teams Only" : "Mixed Mode"}</p>
            </div>
            <div className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h3 className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Players</h3>
              <p className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>{`${players.length} Connected`}</p>
            </div>
            <div className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h3 className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Teams</h3>
              <p className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>{teams ? teams.length : 0}</p>
            </div>
          </div>
        </div>

        {/* Join Link and QR Code Section */}
        <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-lg backdrop-blur-md border-2 ${
          theme === 'dark'
            ? 'bg-white/5 border-indigo-500/30'
            : 'bg-white/60 border-blue-300'
        }`}>
          <h3 className={`text-sm sm:text-base font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Share Session</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className={`p-3 sm:p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h4 className={`text-xs sm:text-sm font-semibold mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>Join Link</h4>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className={`w-full sm:w-auto text-xs sm:text-sm px-3 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-100 text-blue-600'
                } truncate`}>
                  {joinLink}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyJoinLink}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title="Copy Link"
                    disabled={isUpdatingRef.current}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {navigator.share && (
                    <button
                      onClick={shareJoinLink}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title="Share Link"
                      disabled={isUpdatingRef.current}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className={`p-3 sm:p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'bg-white/40 border-blue-200'
            }`}>
              <h4 className={`text-xs sm:text-sm font-semibold mb-2 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
              }`}>QR Code</h4>
              <div className="flex items-center space-x-3">
                <div ref={qrCodeRef} className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-white' : 'bg-gray-100'
                }`}>
                  <QRCodeCanvas value={joinLink} size={60} />
                </div>
                <button
                  onClick={downloadQRCode}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                  title="Download QR Code"
                  disabled={isUpdatingRef.current}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className={`text-xs sm:text-sm mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>Last updated: {lastUpdated}</div>
        </div>

        {/* Teams Only Mode Message */}
        {playerMode === "teams" && (
          <div className={`mt-4 p-4 sm:p-5 rounded-xl border-2 backdrop-blur-sm ${
            theme === 'dark'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Settings className={`w-5 h-5 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <span className={`font-semibold text-sm sm:text-base ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'
              }`}>Teams Only Mode Active</span>
            </div>
            <p className={`text-xs sm:text-sm mt-2 ${
              theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
            }`}>
              Players can only join existing teams. Create teams below for players to join with team name and
              password.
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`flex space-x-1 my-6 sm:my-8 p-1 rounded-lg backdrop-blur-sm ${
          theme === 'dark' ? 'bg-indigo-500/10' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setActiveTab("taporder")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "taporder" 
                ? theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-white text-blue-600 shadow-sm'
                : theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Tap Order
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "teams" 
                ? theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-white text-blue-600 shadow-sm'
                : theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Teams ({teams && teams.length})
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "players" 
                ? theme === 'dark'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-white text-blue-600 shadow-sm'
                : theme === 'dark'
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Solo Players ({soloPlayers.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "taporder" && (
          <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
            theme === 'dark'
              ? 'bg-white/5 border-indigo-500/30'
              : 'bg-white/60 border-blue-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Button Tap Order - Round {session.round}</h2>
              <button
                onClick={refreshRound}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm sm:text-base transition-colors ${
                  theme === 'dark'
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isDeleting || isUpdatingRef.current}
              >
                <RefreshCw className={`w-4 h-4 ${isDeleting ? "animate-spin" : ""}`} />
                <span>{isDeleting ? "Starting..." : "New Round"}</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tapOrder.length > 0 ? (
                tapOrder.map((tap, index) => (
                  <div
                    key={tap.tapId}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border-l-4 ${
                      theme === 'dark'
                        ? 'bg-indigo-500/10 border-indigo-500'
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        theme === 'dark'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <span className={`font-semibold text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>{tap.playerName}</span>
                        {tap.teamName && <div className={`text-xs sm:text-sm ${
                          theme === 'dark' ? 'text-teal-300' : 'text-teal-600'
                        }`}>Team: {tap.teamName}</div>}
                        <div className={`text-xs sm:text-sm ${
                          theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                        }`}>{tap.time}</div>
                      </div>
                    </div>
                    <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                    }`} />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm sm:text-base ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-gray-500'
                  }`}>Waiting for participants to tap the button...</p>
                  <p className={`text-xs sm:text-sm mt-2 ${
                    theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                  }`}>
                    Share the joining code: <strong className={
                      theme === 'dark' ? 'text-indigo-400' : 'text-gray-700'
                    }>{sessionId}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* Team Creation */}
            <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
              theme === 'dark'
                ? 'bg-white/5 border-indigo-500/30'
                : 'bg-white/60 border-blue-300'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                <h3 className={`text-lg sm:text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>Team Management</h3>
                <button
                  onClick={() => setShowTeamCreator(!showTeamCreator)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  disabled={isUpdatingRef.current}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </button>
              </div>

              {showTeamCreator && (
                <div className={`p-4 sm:p-5 rounded-xl border-2 mb-4 ${
                  theme === 'dark'
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`font-semibold mb-4 text-sm sm:text-base ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Create New Team</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Team Name"
                      className={`w-full px-3 py-2 rounded-lg text-sm sm:text-base transition-colors ${
                        theme === 'dark'
                          ? 'bg-indigo-500/20 border-indigo-500/30 text-white placeholder-indigo-300'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'focus:ring-indigo-400'
                          : 'focus:ring-blue-400'
                      }`}
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Team Password"
                      className={`w-full px-3 py-2 rounded-lg text-sm sm:text-base transition-colors ${
                        theme === 'dark'
                          ? 'bg-indigo-500/20 border-indigo-500/30 text-white placeholder-indigo-300'
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 ${
                        theme === 'dark'
                          ? 'focus:ring-indigo-400'
                          : 'focus:ring-blue-400'
                      }`}
                      value={newTeam.password}
                      onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
                    <button
                      onClick={createTeam}
                      className={`px-4 py-2 rounded-lg text-sm sm:text-base transition-colors ${
                        theme === 'dark'
                          ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={isDeleting || !newTeam.name.trim() || !newTeam.password.trim() || isUpdatingRef.current}
                    >
                      {isDeleting ? "Creating..." : "Create Team"}
                    </button>
                    <button
                      onClick={() => {
                        setShowTeamCreator(false)
                        setNewTeam({ name: "", password: "" })
                      }}
                      className={`px-4 py-2 rounded-lg text-sm sm:text-base border transition-colors ${
                        theme === 'dark'
                          ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      disabled={isUpdatingRef.current}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Teams List */}
              <div className="lg:col-span-1">
                <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-indigo-500/30'
                    : 'bg-white/60 border-blue-300'
                }`}>
                  <h3 className={`text-lg sm:text-xl font-bold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Teams ({teams && teams.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Array.isArray(teams) &&
                      teams.map((team) => {
                        const teamPlayerCount = Array.isArray(players)
                          ? players.filter((p) => p.teamId === team.teamId).length
                          : 0
                        return (
                          <div
                            key={team.teamId}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedTeam?.teamId === team.teamId
                                ? theme === 'dark'
                                  ? 'border-indigo-500 bg-indigo-500/20'
                                  : 'border-blue-500 bg-blue-50'
                                : theme === 'dark'
                                  ? 'border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/10'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedTeam(team)
                              setTeamPlayersList(players.filter((p) => p.teamId === team.teamId))
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className={`font-semibold text-sm sm:text-base ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                                }`}>{team.teamName}</h4>
                                <div className={`flex items-center space-x-3 text-xs sm:text-sm ${
                                  theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                                }`}>
                                  <span className="flex items-center">
                                    <Users className={`w-3 h-3 mr-1 ${
                                      theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                                    }`} />
                                    {teamPlayerCount} players
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    theme === 'dark'
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}>
                                    {team.createdBy === "player" ? "Player-set password" : `Password: ${team.password}`}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTeam(team.teamId)
                                }}
                                className={`p-1 transition-colors ${
                                  theme === 'dark'
                                    ? 'text-red-400 hover:text-red-300'
                                    : 'text-red-600 hover:text-red-800'
                                }`}
                                disabled={isDeleting || isUpdatingRef.current}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    {teams && teams.length === 0 && (
                      <div className="text-center py-8">
                        <Users className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                          theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'
                        }`} />
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-indigo-200' : 'text-gray-500'
                        }`}>No teams created yet</p>
                        <p className={`text-xs sm:text-sm mt-2 ${
                          theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                        }`}>Create teams for players to join</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Details */}
              <div className="lg:col-span-2">
                {selectedTeam ? (
                  <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-indigo-500/30'
                      : 'bg-white/60 border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div>
                        <h3 className={`text-lg sm:text-xl font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>{selectedTeam.teamName}</h3>
                        <p className={`text-xs sm:text-sm ${
                          theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                        }`}>
                          {selectedTeam.createdBy === "player" ? "Player-set password" : `Password: `}
                          {selectedTeam.createdBy !== "player" && (
                            <span className={`font-mono px-2 py-1 rounded ${
                              theme === 'dark'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-gray-100 text-gray-700'
                            }`}>{selectedTeam.password}</span>
                          )}
                        </p>
                        <p className={`text-xs sm:text-sm ${
                          theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                        }`}>
                          Created: {new Date(selectedTeam.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl sm:text-2xl font-bold ${
                          theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                        }`}>{teamPlayersList.length}</div>
                        <div className={`text-xs sm:text-sm ${
                          theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                        }`}>Members</div>
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-lg sm:text-xl font-bold mb-4 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>Team Members</h4>
                      {teamPlayersList.length > 0 ? (
                        <div className="space-y-3">
                          {teamPlayersList.map((player, index) => (
                            <div
                              key={player.playerId}
                              className={`flex items-center justify-between p-3 sm:p-4 rounded-lg ${
                                theme === 'dark'
                                  ? 'bg-indigo-500/10'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                                  theme === 'dark'
                                    ? index === 0
                                      ? 'bg-indigo-500/30'
                                      : 'bg-indigo-500/20'
                                    : index === 0
                                      ? 'bg-blue-100'
                                      : 'bg-gray-100'
                                }`}>
                                  {index === 0 ? (
                                    <Crown className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                      theme === 'dark'
                                        ? 'text-indigo-300'
                                        : 'text-blue-600'
                                    }`} />
                                  ) : (
                                    <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                      theme === 'dark'
                                        ? 'text-indigo-400'
                                        : 'text-gray-600'
                                    }`} />
                                  )}
                                </div>
                                <div>
                                  <div className={`font-semibold text-sm sm:text-base ${
                                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                                  }`}>{player.playerName}</div>
                                  <div className={`text-xs sm:text-sm ${
                                    theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                                  }`}>
                                    Joined: {new Date(player.createdAt).toLocaleDateString()}
                                  </div>
                                  {index === 0 && (
                                    <div className={`text-xs sm:text-sm font-medium ${
                                      theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'
                                    }`}>Team Leader</div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemovePlayer(player.playerId)}
                                className={`p-2 transition-colors ${
                                  theme === 'dark'
                                    ? 'text-red-400 hover:text-red-300'
                                    : 'text-red-600 hover:text-red-800'
                                }`}
                                title="Remove from Team"
                                disabled={isDeleting || isUpdatingRef.current}
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                            theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'
                          }`} />
                          <p className={`text-sm sm:text-base ${
                            theme === 'dark' ? 'text-indigo-200' : 'text-gray-500'
                          }`}>No members in this team yet</p>
                          <p className={`text-xs sm:text-sm mt-2 ${
                            theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                          }`}>Share team name and password with players</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`p-8 sm:p-10 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 text-center ${
                    theme === 'dark'
                      ? 'bg-white/5 border-indigo-500/30'
                      : 'bg-white/60 border-blue-300'
                  }`}>
                    <Users className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${
                      theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'
                    }`} />
                    <h3 className={`text-lg sm:text-xl font-bold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>Select a Team</h3>
                    <p className={`text-sm sm:text-base ${
                      theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'
                    }`}>Choose a team from the list to view and manage its members</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className={`p-4 sm:p-6 rounded-xl sm:rounded-3xl shadow-2xl backdrop-blur-md border-2 ${
            theme === 'dark'
              ? 'bg-white/5 border-indigo-500/30'
              : 'bg-white/60 border-blue-300'
          }`}>
            <h3 className={`text-lg sm:text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Solo Players ({soloPlayers.length})</h3>
            {filteredSoloPlayers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSoloPlayers.map((player) => (
                  <div 
                    key={player.playerId} // FIXED: Used unique playerId for key
                    className={`p-3 sm:p-4 rounded-lg ${
                      theme === 'dark'
                        ? 'bg-indigo-500/10'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                          theme === 'dark'
                            ? 'bg-indigo-500/20'
                            : 'bg-blue-100'
                        }`}>
                          <User className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            theme === 'dark'
                              ? 'text-indigo-300'
                              : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <div className={`font-semibold text-sm sm:text-base ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>{player.playerName}</div>
                          <div className={`text-xs sm:text-sm ${
                            theme === 'dark' ? 'text-indigo-300' : 'text-gray-600'
                          }`}>
                            Joined: {new Date(player.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePlayer(player.playerId)}
                        className={`p-2 transition-colors ${
                          theme === 'dark'
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                        title="Remove Player"
                        disabled={isDeleting || isUpdatingRef.current}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'
                }`} />
                <p className={`text-sm sm:text-base ${
                  theme === 'dark' ? 'text-indigo-200' : 'text-gray-500'
                }`}>No solo players yet</p>
                <p className={`text-xs sm:text-sm ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-gray-500'
                }`}>Players will appear here when they join as individuals</p>
              </div>
            )}
          </div>
        )}

        {/* Player Mode Change Modal */}
        {showPlayerModeChange && (
          <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${
            theme === 'dark'
              ? 'bg-black/70'
              : 'bg-black/50'
          }`}>
            <div className={`max-w-md w-full p-6 rounded-2xl shadow-2xl backdrop-blur-lg ${
              theme === 'dark'
                ? 'bg-gray-900/90 border-2 border-indigo-500/30'
                : 'bg-white'
            }`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>Change Player Mode</h3>
              <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Current mode:{" "}
                <strong className={theme === 'dark' ? 'text-white' : ''}>
                  {playerMode === "single" ? "Solo Only" : playerMode === "teams" ? "Teams Only" : "Mixed Mode"}
                </strong>
              </p>

              <div className="space-y-3 mb-4 sm:mb-6">
                <button
                  onClick={() => changePlayerMode("single")}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                    theme === 'dark'
                      ? playerMode === "single"
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-700 hover:border-blue-500/50 text-gray-300'
                      : playerMode === "single"
                        ? 'border-blue-500 bg-blue-50 text-gray-800'
                        : 'border-gray-200 hover:border-blue-300 text-gray-800'
                  }`}
                  disabled={isDeleting || isUpdatingRef.current}
                >
                  <User className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-2 ${
                    theme === 'dark'
                      ? 'text-blue-400'
                      : 'text-blue-600'
                  }`} />
                  <div className="font-semibold">Single Players Only</div>
                </button>

                <button
                  onClick={() => changePlayerMode("teams")}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                    theme === 'dark'
                      ? playerMode === "teams"
                        ? 'border-teal-500 bg-teal-500/20 text-white'
                        : 'border-gray-700 hover:border-teal-500/50 text-gray-300'
                      : playerMode === "teams"
                        ? 'border-teal-500 bg-teal-50 text-gray-800'
                        : 'border-gray-200 hover:border-teal-300 text-gray-800'
                  }`}
                  disabled={isDeleting || isUpdatingRef.current}
                >
                  <Users className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-2 ${
                    theme === 'dark'
                      ? 'text-teal-400'
                      : 'text-teal-600'
                  }`} />
                  <div className="font-semibold">Teams Only</div>
                </button>

                <button
                  onClick={() => changePlayerMode("both")}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                    theme === 'dark'
                      ? playerMode === "both"
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-gray-700 hover:border-purple-500/50 text-gray-300'
                      : playerMode === "both"
                        ? 'border-purple-500 bg-purple-50 text-gray-800'
                        : 'border-gray-200 hover:border-purple-300 text-gray-800'
                  }`}
                  disabled={isDeleting || isUpdatingRef.current}
                >
                  <UserPlus className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-2 ${
                    theme === 'dark'
                      ? 'text-purple-400'
                      : 'text-purple-600'
                  }`} />
                  <div className="font-semibold">Mixed Mode</div>
                </button>
              </div>

              <button
                onClick={() => setShowPlayerModeChange(false)}
                className={`w-full py-2 sm:py-3 px-4 sm:px-6 border rounded-lg transition-colors text-sm sm:text-base ${
                  theme === 'dark'
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={isDeleting || isUpdatingRef.current}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default HostInterface; // FIXED: Removed stray parenthesis