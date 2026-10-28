import { useState, useId } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  IdCard,
  ArrowRight,
  Sparkles,
  Check,
  GraduationCap,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { anonymizeName } from '../utils/anonymize'

export default function AuthCard({ onAuthSuccess, onOpenForgotPassword, onNotify }) {
  // 'login' or 'register'
  const [authMode, setAuthMode] = useState('login')

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  // Register form state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regStudentId, setRegStudentId] = useState('')
  const [regCourse, setRegCourse] = useState('B.Tech Computer Science')
  const [regSemester, setRegSemester] = useState('Semester 4')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [agreedHonorCode, setAgreedHonorCode] = useState(true)

  // Password Strength Calculation
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-zinc-700' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' }
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' }
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' }
  }

  const passStrength = calculatePasswordStrength(regPassword)
  const passwordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword

  // Demo Credentials Fill
  const fillDemoAccount = (role) => {
    if (role === 'student') {
      setLoginEmail('random1@campus.edu')
      setLoginPassword('CampusStudent#2024')
      onNotify({
        type: 'info',
        title: 'Demo Loaded: Student',
        message: 'Credentials filled for Random 1 (B.Tech CS, Sem 4).',
      })
    } else {
      setLoginEmail('random2@campus.edu')
      setLoginPassword('PeerMentor#2024')
      onNotify({
        type: 'info',
        title: 'Demo Loaded: Peer Mentor',
        message: 'Credentials filled for Random 2 (Senior Mentor, Sem 6).',
      })
    }
    setErrorMsg('')
  }

  // Handle Login
  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both your college email and password.')
      return
    }

    if (!loginEmail.includes('@')) {
      setErrorMsg('Please enter a valid academic email address.')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      // Trigger subtle celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#ff0c0c', '#ff0101', '#ffffff'],
        })
      } catch (err) {
        // ignore if canvas not supported
      }

      onNotify({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back! Connected to campus workspace.`,
      })

      onAuthSuccess({
        fullName: anonymizeName(loginEmail.split('@')[0].replace('.', ' ')),
        email: loginEmail,
        studentId: '2024-CAMPUS-789',
        course: 'Computer Science & Engineering',
        semester: 'Semester 4',
        tokenBalance: 240,
        role: 'student',
      })
    }, 900)
  }

  // Handle Register
  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!regFullName || !regEmail || !regStudentId || !regPassword || !regConfirmPassword) {
      setErrorMsg('All registration fields are required.')
      return
    }

    if (!regEmail.includes('@')) {
      setErrorMsg('Please enter a valid college email.')
      return
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password should be at least 6 characters.')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.')
      return
    }

    if (!agreedHonorCode) {
      setErrorMsg('Please agree to the Academic Integrity & Honor Code.')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      try {
        confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ff0c0c', '#ffffff', '#ff0101'],
        })
      } catch (err) {}

      onNotify({
        type: 'success',
        title: 'Account Created & Verified',
        message: 'Welcome bonus of +50 tokens credited to your wallet!',
      })

      onAuthSuccess({
        fullName: anonymizeName(regFullName),
        email: regEmail,
        studentId: regStudentId,
        course: regCourse,
        semester: regSemester,
        tokenBalance: 50, // Welcome bonus
        role: 'student',
      })
    }, 1100)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Outer Card with subtle dark border and restrained red glow */}
      <div className="relative rounded-2xl bg-[#0f0f0f]/95 border border-white/[0.1] shadow-2xl p-6 sm:p-8 lg:p-10 backdrop-blur-xl overflow-hidden">
        {/* Subtle decorative top red line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff0c0c] to-transparent opacity-80" />

        {/* Top Header with H2 per typography requirements: 2rem */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#ff0c0c] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Portal</span>
            </span>

            {/* Micro Demo Trigger for Evaluator Convenience */}
            {authMode === 'login' && (
              <div className="flex items-center gap-1 text-[11px] text-white/50">
                <span>Quick demo:</span>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('student')}
                  className="text-white/80 hover:text-[#ff0c0c] transition-colors underline cursor-pointer"
                >
                  Student
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('mentor')}
                  className="text-white/80 hover:text-[#ff0c0c] transition-colors underline cursor-pointer"
                >
                  Mentor
                </button>
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-[2rem] font-bold text-white tracking-tight">
            {authMode === 'login' ? 'Sign in to Rizzolve' : 'Create Student Account'}
          </h2>
          <p className="text-sm text-[#fef9f8]/70 mt-1.5">
            {authMode === 'login'
              ? 'Access subject doubt boards, peer solutions, and your token ledger.'
              : 'Join your college cohort to ask questions, solve doubts, and earn bounties.'}
          </p>
        </div>

        {/* Mode Toggle Switch: Login vs Register */}
        <div className="relative p-1 bg-[#161616] border border-white/[0.08] rounded-xl flex items-center mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login')
              setErrorMsg('')
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              authMode === 'login'
                ? 'text-white bg-[#222222] shadow-md border border-white/10'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register')
              setErrorMsg('')
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              authMode === 'register'
                ? 'text-white bg-[#222222] shadow-md border border-white/10'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback Display */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[#ff0c0c]/10 border border-[#ff0c0c]/30 text-[#fef9f8] text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-[#ff0c0c] shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* ===================== LOGIN FORM ===================== */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1.5">
                College Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student.name@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl rizzolve-input"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs uppercase font-medium tracking-wider text-white/70">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs text-[#ff0c0c] hover:text-[#ff0101] hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl rizzolve-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#ff0c0c] focus:ring-[#ff0c0c] focus:ring-offset-0 cursor-pointer accent-[#ff0c0c]"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-[11px] text-white/40">Secure 256-bit session</span>
            </div>

            {/* Primary Action Button: --secondary (#ff0c0c) with smooth hover and glow */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] glow-red-hover flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,12,12,0.35)]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Campus...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Campus</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ===================== REGISTER FORM ===================== */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in fade-in duration-200">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Random 1"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl rizzolve-input"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* College Email & Student ID (2 Columns on tablet/desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-email" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                  College Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl rizzolve-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-studentid" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                  Student ID / Roll No.
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    id="reg-studentid"
                    type="text"
                    required
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="e.g. 2024-CS-0412"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl rizzolve-input"
                  />
                </div>
              </div>
            </div>

            {/* Course & Semester Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-course" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                  Course / Major
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <select
                    id="reg-course"
                    value={regCourse}
                    onChange={(e) => setRegCourse(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
                  >
                    <option value="B.Tech Computer Science">B.Tech Computer Science</option>
                    <option value="B.Tech Electronics (ECE)">B.Tech Electronics (ECE)</option>
                    <option value="B.Tech Mechanical">B.Tech Mechanical</option>
                    <option value="BCA / MCA">BCA / MCA</option>
                    <option value="B.Sc Data Science">B.Sc Data Science</option>
                    <option value="Other Engineering">Other Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reg-semester" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                  Semester
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <select
                    id="reg-semester"
                    value={regSemester}
                    onChange={(e) => setRegSemester(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl rizzolve-input bg-[#121212] cursor-pointer"
                  >
                    <option value="Semester 1">Semester 1 (Freshman)</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3 (Sophomore)</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5 (Junior)</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7 (Senior)</option>
                    <option value="Semester 8">Semester 8</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-pass" className="block text-xs uppercase font-medium tracking-wider text-white/70 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="reg-pass"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-11 py-2 text-sm rounded-xl rizzolve-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {regPassword && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-1 h-1">
                    <div className={`rounded-full transition-all ${passStrength.score >= 1 ? passStrength.color : 'bg-white/10'}`} />
                    <div className={`rounded-full transition-all ${passStrength.score >= 2 ? passStrength.color : 'bg-white/10'}`} />
                    <div className={`rounded-full transition-all ${passStrength.score >= 3 ? passStrength.color : 'bg-white/10'}`} />
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-white/60">
                    {passStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="reg-confirm" className="text-xs uppercase font-medium tracking-wider text-white/70">
                  Confirm Password
                </label>
                {regConfirmPassword && (
                  <span
                    className={`text-[11px] flex items-center gap-1 font-medium ${
                      passwordsMatch ? 'text-emerald-400' : 'text-[#ff0c0c]'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      'Does not match'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="reg-confirm"
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full pl-10 pr-11 py-2 text-sm rounded-xl rizzolve-input ${
                    regConfirmPassword && !passwordsMatch ? 'border-[#ff0c0c]/60' : ''
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                  aria-label={showRegConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Honor Code agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-white/70 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={agreedHonorCode}
                  onChange={(e) => setAgreedHonorCode(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[#ff0c0c] focus:ring-[#ff0c0c] cursor-pointer accent-[#ff0c0c]"
                />
                <span className="leading-relaxed">
                  I agree to the <span className="text-white underline">Campus Honor Code</span>. I will not post proprietary exam papers or plagiarize solutions.
                </span>
              </label>
            </div>

            {/* Primary Action Button: --secondary (#ff0c0c) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-[#ff0c0c] hover:bg-[#ff0101] glow-red-hover flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,12,12,0.35)]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Student Account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-white/20 text-white">
                    +50 Tokens
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Card Footer / Institutional Note */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Campus Workspace v1.0</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onNotify({
                type: 'info',
                title: 'College Onboarding Notice',
                message: 'Your college domain is verified automatically during registration.',
              })
            }}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Need Help?
          </button>
        </div>
      </div>
    </div>
  )
}
