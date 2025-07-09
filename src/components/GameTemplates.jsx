"use client"

import { useState } from "react"
import { Zap, Users, Clock, Target, Settings, Play, Edit3, Trash2, Plus } from "lucide-react"

const GameTemplates = ({ onCreateSession }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customTemplates, setCustomTemplates] = useState([])
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    playerMode: "both",
    maxRounds: 5,
    timeLimit: 30,
    category: "general",
  })

  const defaultTemplates = [
    {
      id: "quick-fire",
      name: "Quick Fire",
      description: "Fast-paced quiz with short rounds",
      playerMode: "both",
      maxRounds: 10,
      timeLimit: 15,
      category: "speed",
      icon: Zap,
      color: "bg-yellow-500",
      features: ["Fast rounds", "Individual & team play", "High energy"],
    },
    {
      id: "team-battle",
      name: "Team Battle",
      description: "Competitive team-based quiz",
      playerMode: "teams",
      maxRounds: 7,
      timeLimit: 30,
      category: "competition",
      icon: Users,
      color: "bg-blue-500",
      features: ["Teams only", "Strategic gameplay", "Collaboration focus"],
    },
    {
      id: "endurance-challenge",
      name: "Endurance Challenge",
      description: "Long-form quiz testing stamina",
      playerMode: "both",
      maxRounds: 20,
      timeLimit: 45,
      category: "endurance",
      icon: Clock,
      color: "bg-green-500",
      features: ["Extended play", "Stamina testing", "Progressive difficulty"],
    },
    {
      id: "precision-mode",
      name: "Precision Mode",
      description: "Accuracy-focused with careful timing",
      playerMode: "single",
      maxRounds: 5,
      timeLimit: 60,
      category: "precision",
      icon: Target,
      color: "bg-purple-500",
      features: ["Individual play", "Accuracy focus", "Thoughtful responses"],
    },
  ]

  const allTemplates = [...defaultTemplates, ...customTemplates]

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim()) {
      alert("Please fill in all required fields")
      return
    }

    const template = {
      ...newTemplate,
      id: `custom-${Date.now()}`,
      icon: Settings,
      color: "bg-gray-500",
      features: ["Custom settings", "Personalized experience", "Your creation"],
      isCustom: true,
    }

    setCustomTemplates([...customTemplates, template])
    setNewTemplate({
      name: "",
      description: "",
      playerMode: "both",
      maxRounds: 5,
      timeLimit: 30,
      category: "general",
    })
    setShowCreateTemplate(false)

    // Save to localStorage
    localStorage.setItem("gameTemplates", JSON.stringify([...customTemplates, template]))
  }

  const handleDeleteTemplate = (templateId) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    const updatedTemplates = customTemplates.filter((t) => t.id !== templateId)
    setCustomTemplates(updatedTemplates)
    localStorage.setItem("gameTemplates", JSON.stringify(updatedTemplates))

    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null)
    }
  }

  const handleUseTemplate = (template) => {
    const sessionId = Math.random().toString(36).substr(2, 6).toUpperCase()

    // Store template settings for the session
    sessionStorage.setItem(
      `template_${sessionId}`,
      JSON.stringify({
        templateName: template.name,
        playerMode: template.playerMode,
        maxRounds: template.maxRounds,
        timeLimit: template.timeLimit,
        category: template.category,
      }),
    )

    onCreateSession(sessionId, template.playerMode)
  }

  const getCategoryColor = (category) => {
    const colors = {
      speed: "bg-yellow-100 text-yellow-800",
      competition: "bg-blue-100 text-blue-800",
      endurance: "bg-green-100 text-green-800",
      precision: "bg-purple-100 text-purple-800",
      general: "bg-gray-100 text-gray-800",
    }
    return colors[category] || colors.general
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Game Templates</h2>
          <p className="text-gray-600">Choose a pre-configured game mode or create your own</p>
        </div>
        <button
          onClick={() => setShowCreateTemplate(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Custom Template</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="My Custom Quiz"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="input-field"
                  placeholder="Describe your quiz template..."
                  rows="3"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player Mode</label>
                <select
                  className="input-field"
                  value={newTemplate.playerMode}
                  onChange={(e) => setNewTemplate({ ...newTemplate, playerMode: e.target.value })}
                >
                  <option value="single">Single Players Only</option>
                  <option value="teams">Teams Only</option>
                  <option value="both">Teams & Single Players</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Rounds</label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    max="50"
                    value={newTemplate.maxRounds}
                    onChange={(e) => setNewTemplate({ ...newTemplate, maxRounds: Number.parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (sec)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="5"
                    max="300"
                    value={newTemplate.timeLimit}
                    onChange={(e) => setNewTemplate({ ...newTemplate, timeLimit: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  className="input-field"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="speed">Speed</option>
                  <option value="competition">Competition</option>
                  <option value="endurance">Endurance</option>
                  <option value="precision">Precision</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button onClick={handleCreateTemplate} className="btn-primary flex-1">
                Create Template
              </button>
              <button
                onClick={() => setShowCreateTemplate(false)}
                className="flex-1 py-3 px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTemplates.map((template) => {
          const IconComponent = template.icon
          return (
            <div
              key={template.id}
              className={`card cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                selectedTemplate?.id === template.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                {template.isCustom && (
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Edit functionality could be added here
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{template.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Player Mode:</span>
                  <span className="font-medium">
                    {template.playerMode === "single" ? "Solo" : template.playerMode === "teams" ? "Teams" : "Mixed"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Max Rounds:</span>
                  <span className="font-medium">{template.maxRounds}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Time Limit:</span>
                  <span className="font-medium">{template.timeLimit}s</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {template.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-600">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleUseTemplate(template)
                }}
                className="btn-primary w-full flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Use Template
              </button>
            </div>
          )
        })}
      </div>

      {/* Template Details */}
      {selectedTemplate && (
        <div className="card">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 ${selectedTemplate.color} rounded-xl flex items-center justify-center`}>
                <selectedTemplate.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selectedTemplate.name}</h3>
                <p className="text-gray-600">{selectedTemplate.description}</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getCategoryColor(selectedTemplate.category)}`}
                >
                  {selectedTemplate.category.charAt(0).toUpperCase() + selectedTemplate.category.slice(1)}
                </span>
              </div>
            </div>
            <button onClick={() => handleUseTemplate(selectedTemplate)} className="btn-primary flex items-center">
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Game Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Player Mode:</span>
                  <span className="font-medium">
                    {selectedTemplate.playerMode === "single"
                      ? "Individual Players"
                      : selectedTemplate.playerMode === "teams"
                        ? "Teams Only"
                        : "Teams & Individuals"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maximum Rounds:</span>
                  <span className="font-medium">{selectedTemplate.maxRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time per Round:</span>
                  <span className="font-medium">{selectedTemplate.timeLimit} seconds</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Features</h4>
              <div className="space-y-1">
                {selectedTemplate.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Best For</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {selectedTemplate.category === "speed" && (
                  <>
                    <div>• Quick team building</div>
                    <div>• High energy events</div>
                    <div>• Short time slots</div>
                  </>
                )}
                {selectedTemplate.category === "competition" && (
                  <>
                    <div>• Corporate events</div>
                    <div>• Team competitions</div>
                    <div>• Strategic gameplay</div>
                  </>
                )}
                {selectedTemplate.category === "endurance" && (
                  <>
                    <div>• Long sessions</div>
                    <div>• Stamina testing</div>
                    <div>• Progressive difficulty</div>
                  </>
                )}
                {selectedTemplate.category === "precision" && (
                  <>
                    <div>• Individual assessment</div>
                    <div>• Accuracy focus</div>
                    <div>• Thoughtful responses</div>
                  </>
                )}
                {selectedTemplate.category === "general" && (
                  <>
                    <div>• Mixed groups</div>
                    <div>• Flexible gameplay</div>
                    <div>• All skill levels</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameTemplates
