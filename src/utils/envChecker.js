export function checkEnvironment() {
  const requiredVars = ["VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL", "VITE_GOOGLE_PRIVATE_KEY", "VITE_GOOGLE_SPREADSHEET_ID"]

  const missing = []
  const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : process.env

  requiredVars.forEach((varName) => {
    if (!env[varName]) {
      missing.push(varName)
    }
  })

  return {
    isValid: missing.length === 0,
    missing,
    hasEnv: !!env,
  }
}

export function displayEnvironmentStatus() {
  const status = checkEnvironment()

  if (!status.hasEnv) {
    console.warn("⚠️ No environment variables detected")
    return false
  }

  if (!status.isValid) {
    console.error("❌ Missing required environment variables:")
    status.missing.forEach((varName) => {
      console.error(`   - ${varName}`)
    })
    console.error("\n📝 Please check your .env file and ensure all variables are set.")
    return false
  }

  console.log("✅ All required environment variables are set")
  return true
}
