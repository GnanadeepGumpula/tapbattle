import axios from "axios";

// Configure axios with timeout and retry logic
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.retry = 3;
axios.defaults.retryDelay = 1000;

// Add retry interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Check if we should retry
    if (!config || !config.retry || config.__retryCount >= config.retry) {
      return Promise.reject(error);
    }
    
    // Increment retry count
    config.__retryCount = config.__retryCount || 0;
    config.__retryCount += 1;
    
    // Wait before retry
    await new Promise(resolve => 
      setTimeout(resolve, config.retryDelay || 1000)
    );
    
    return axios(config);
  }
);

// More robust environment detection for production
const getBaseURL = () => {
  // Check if we're in production and VITE_API_URL is not set
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    return 'https://tapbattle-server-d2d0btaba6aub8g8.canadacentral-01.azurewebsites.net';
  }
  
  // Use environment variable or default to localhost for development
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // Ensure the URL has a protocol
  if (envUrl && !envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    return `https://${envUrl}`;
  }
  
  return envUrl;
};

const BASE_URL = getBaseURL();

console.log('API Base URL:', BASE_URL); // Debug log to check what URL is being used

const api = {
  /* ---------------- HOST ROUTES ---------------- */

  // Create/register a host
  createHost: async (username, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/hosts`, { username, password });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

// Host login (validate credentials)
loginHost: async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/hosts/validate`, { username, password });
    return { success: true, isValid: response.data.isValid };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
},



  // Delete a host
  deleteHost: async (username) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/hosts/${username}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /* ---------------- SESSION ROUTES ---------------- */

  // Create a session
  createSession: async (sessionId, hostUsername, playerMode) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/sessions`, {
        sessionId,
        hostUsername,
        playerMode,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get all sessions for a host
  getHostSessions: async (hostUsername) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/sessions/${hostUsername}`);
      return { success: true, sessions: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message, sessions: [] };
    }
  },

  // Update session round
  updateSessionRound: async (sessionId, round) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/sessions/${sessionId}/round`, { round });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Delete a session (backend handles cascade delete)
  deleteSession: async (sessionId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/sessions/${sessionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /* ---------------- TEAM ROUTES ---------------- */

  // Create a team
  createTeam: async (sessionId, teamName, password) => {
    try {
      console.log('createTeam - calling with:', { sessionId, teamName, password: '***' });
      const response = await axios.post(`${BASE_URL}/api/teams`, { sessionId, teamName, password });
      console.log('createTeam - response:', response.data);
      return { success: true, teamId: response.data.teamId };
    } catch (error) {
      console.error('createTeam error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },
  
  // Get session details
getSession: async (sessionId) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${sessionId}`); // <-- ✅ Add await
    if (!res.data || Object.keys(res.data).length === 0) {
      return { success: false, error: "Session not found" };
    }
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Unknown error",
    };
  }
},

checkPlayerExists: async (sessionId, playerName) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${sessionId}/player/${playerName}/exists`)
    return res.data // Backend returns { success: true, exists: boolean }
  } catch (err) {
    return { success: false, error: err.message }
  }
},



  // Validate team credentials
  validateTeam: async (sessionId, teamName, password) => {
    try {
      console.log('validateTeam - calling with:', { sessionId, teamName, password: '***' });
      const response = await axios.post(`${BASE_URL}/api/teams/validate`, { sessionId, teamName, password });
      console.log('validateTeam - response:', response.data);
      return { success: true, isValid: response.data.isValid };
    } catch (error) {
      console.error('validateTeam error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Check if team exists (using player check as workaround)
  checkTeamExists: async (sessionId, teamName) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/teams/session/${sessionId}`);
      console.log('checkTeamExists - teams response:', response.data);
      if (response.data && Array.isArray(response.data)) {
        const teamExists = response.data.some(team => team.teamName === teamName);
        console.log('checkTeamExists - team exists:', teamExists, 'for team:', teamName);
        return { success: true, exists: teamExists };
      }
      return { success: true, exists: false };
    } catch (error) {
      console.error('checkTeamExists error:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get team by name (using teams list endpoint)
  getTeam: async (sessionId, teamName) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/teams/session/${sessionId}`);
      if (response.data && Array.isArray(response.data)) {
        const team = response.data.find(t => t.teamName === teamName);
        if (team) {
          return { success: true, data: team };
        } else {
          return { success: false, error: "Team not found" };
        }
      }
      return { success: false, error: "No teams found" };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  getSessionTeams: async (sessionId) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/teams/session/${sessionId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Unknown error',
    };
  }
},


  /* ---------------- PLAYER ROUTES ---------------- */

  // Create a player
  createPlayer: async (sessionId, teamId, playerName, joinMode) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/players`, { sessionId, teamId, playerName, joinMode });
      return { success: true, playerId: response.data.playerId };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get player info with team
getPlayerWithTeamInfo: async (sessionId, playerName) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${sessionId}/player/${playerName}`)
    return res.data // Backend returns { success: true, player: PlayerObject }
  } catch (err) {
    return { success: false, error: err.message }
  }
},


  getPlayersInSession: async (sessionId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/players/${sessionId}`);
    return { success: true, players: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message, players: [] };
  }
},

deletePlayer: async (playerId) => {
  try {
    const res = await axios.delete(`${BASE_URL}/api/players/${playerId}`);
    return { success: true, data: res.data };
  } catch (err) {
    console.error("Delete player failed:", err);
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Server error',
    };
  }
},




  /* ---------------- TAP ORDER ROUTES ---------------- */

  // Record a tap
  addTap: async (sessionId, playerName, teamName, round) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/taps`, { sessionId, playerName, teamName, round });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get tap order for a round
  getTapOrder: async (sessionId, round) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/taps/${sessionId}/${round}`);
      return { success: true, taps: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message, taps: [] };
    }
  },

  // Clear all taps for a session
  clearTapOrder: async (sessionId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/taps/${sessionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  deleteRowsByColumn: async (sheetName, columnName, value) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/sheets/${sheetName}/column/${columnName}/value/${value}`);
      return res.data;
    } catch (err) {
      console.error("API error:", err);
      return { success: false, error: err.message };
    }
  },
};

export default api;