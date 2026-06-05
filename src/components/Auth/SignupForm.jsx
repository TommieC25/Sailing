import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';
import { formatPhoneNumber, phoneDigits } from '../../utils/phoneFormat';
import { friendlyPasswordError, generateStrongPassword, getPasswordValidationMessage, PASSWORD_MIN_LENGTH } from '../../utils/passwordRules';

const SIGNUP_SUCCESS_EMAIL_KEY = 'signupSuccessEmail';
const SIGNUP_SUCCESS_AT_KEY = 'signupSuccessAt';
const SIGNUP_SUCCESS_TTL_MS = 30 * 60 * 1000;

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2rem', paddingBottom: '2rem' },
  innerContainer: { flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', width: '100%', justifyContent: 'center' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1rem 0', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '3rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1.5rem', fontWeight: 600, color: '#e0f2fe', margin: 0 },
  card: { background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)', padding: '32px' },
  cardTitle: { fontSize: '2.25rem', fontWeight: 900, textAlign: 'center', marginBottom: '32px', color: '#1e3a8a', margin: '0 0 32px 0' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1.125rem', paddingX: '1.25rem', paddingY: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600, padding: '1rem 1.25rem' },
  form: { display: 'grid', gap: '1.5rem' },
  fieldGroup: { display: 'grid', gap: '12px' },
  label: { display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', marginBottom: '0.75rem' },
  input: { width: '100%', paddingX: '1.25rem', paddingY: '1rem', border: '3px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 600, padding: '1rem 1.25rem', fontFamily: 'inherit' },
  select: { width: '100%', paddingX: '1.25rem', paddingY: '1rem', border: '3px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 600, background: '#ffffff', padding: '1rem 1.25rem', fontFamily: 'inherit' },
  button: { width: '100%', paddingY: '1.25rem', borderRadius: '12px', fontWeight: 900, color: '#ffffff', fontSize: '1.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px rgba(0,0,0,0.2)' },
  footer: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '3px solid #e5e7eb' },
  footerText: { color: '#374151', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', marginBottom: '1rem', margin: '0 0 1rem 0' },
  signInLink: { display: 'block', width: '100%', paddingY: '1.25rem', borderRadius: '12px', fontWeight: 900, color: '#1e3a8a', fontSize: '1.5rem', border: '3px solid #1e3a8a', textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' },
  passwordHint: { color: '#475569', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.35, margin: '0' },
  passwordActions: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' },
  smallButton: { background: '#e0f2fe', color: '#0c2340', border: '2px solid #0369a1', borderRadius: '10px', padding: '10px 14px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' },
  generatedNotice: { background: '#fef3c7', border: '2px solid #f59e0b', color: '#78350f', borderRadius: '10px', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.35 },
  bottomText: { color: '#ffffff', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, marginTop: '2rem', textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
};

export default function SignupForm() {
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    gender: '',
    userType: '',
    sailingExperience: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPasswordNotice, setGeneratedPasswordNotice] = useState('');
  const [passwordCopyStatus, setPasswordCopyStatus] = useState('');
  const [signupDebug, setSignupDebug] = useState(() => {
    try {
      return localStorage.getItem('signupDebug') || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [signupCompleteEmail, setSignupCompleteEmail] = useState(() => {
    try {
      const email = sessionStorage.getItem(SIGNUP_SUCCESS_EMAIL_KEY);
      const timestamp = Number(sessionStorage.getItem(SIGNUP_SUCCESS_AT_KEY) || 0);
      if (email && timestamp && Date.now() - timestamp < SIGNUP_SUCCESS_TTL_MS) {
        return email;
      }
      sessionStorage.removeItem(SIGNUP_SUCCESS_EMAIL_KEY);
      sessionStorage.removeItem(SIGNUP_SUCCESS_AT_KEY);
    } catch {
      // Browsers can block sessionStorage in private modes.
    }
    return '';
  });
  const showSignupDebug = searchParams.get('signupDebug') === '1';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const noteSignupStep = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugMessage = `${timestamp}: ${message}`;
    setSignupDebug(debugMessage);
    try {
      localStorage.setItem('signupDebug', debugMessage);
    } catch {
      // Some private browsing modes block localStorage.
    }
  };

  const showCheckEmailFor = (email) => {
    try {
      sessionStorage.setItem('signupEmail', email);
      sessionStorage.setItem(SIGNUP_SUCCESS_EMAIL_KEY, email);
      sessionStorage.setItem(SIGNUP_SUCCESS_AT_KEY, String(Date.now()));
    } catch {
      // Browsers can block sessionStorage in private modes.
    }
    setSignupCompleteEmail(email);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildUserProfile = (photoUrl) => ({
    full_name: formData.fullName,
    phone_number: phoneDigits(formData.phone),
    gender: formData.gender,
    user_type: formData.userType,
    sailing_experience: formData.sailingExperience,
    photo_url: photoUrl,
  });

  const uploadProfilePhoto = async () => {
    if (!photoFile) return null;

    noteSignupStep('Starting profile photo upload');
    setStatusMessage('Uploading profile photo...');

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, photoFile, { upsert: true });

    if (uploadError) throw uploadError;
    noteSignupStep('Profile photo uploaded');

    const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePassword = () => {
    const password = generateStrongPassword();

    setFormData((prev) => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
    setShowPassword(true);
    setGeneratedPasswordNotice('Generated password filled in below. Save it before creating your account.');
    setPasswordCopyStatus('');
  };

  const copyPassword = async () => {
    if (!formData.password) {
      setPasswordCopyStatus('Generate or enter a password first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopyStatus('Password copied. Save it somewhere safe.');
    } catch {
      setShowPassword(true);
      setPasswordCopyStatus('Copy was blocked. Password is visible below so you can save it.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    noteSignupStep('Form submit started');
    setError('');
    setStatusMessage('');

    const fail = (message) => {
      noteSignupStep(`Stopped: ${message}`);
      setError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!formData.fullName.trim()) {
      fail('Please enter your full name');
      return;
    }
    const normalizedPhone = phoneDigits(formData.phone);
    if (normalizedPhone.length !== 10) {
      fail('Please enter a valid 10-digit phone number');
      return;
    }
    if (!formData.gender) {
      fail('Please select your gender');
      return;
    }
    if (!photoFile) {
      fail('Profile photo is required');
      return;
    }
    if (!formData.email.trim()) {
      fail('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      fail('Please enter a valid email address');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      fail('Passwords do not match');
      return;
    }
    const passwordValidation = getPasswordValidationMessage(formData.password);
    if (passwordValidation) {
      fail(passwordValidation);
      return;
    }
    if (!formData.userType) {
      fail('Please select your account type');
      return;
    }
    if (!formData.sailingExperience) {
      fail('Please select your experience level');
      return;
    }
    const friendlyError = (err) => {
      const message = err?.message || '';
      if (message.toLowerCase().includes('email rate limit')) {
        return 'Supabase is temporarily blocking more confirmation emails because we sent too many while testing. Please wait a few minutes before trying again, or use a different test email.';
      }
      const passwordError = friendlyPasswordError(err);
      if (passwordError) return passwordError;
      return message || 'Failed to sign up. Please try again.';
    };

    try {
      setLoading(true);
      const normalizedEmail = formData.email.trim().toLowerCase();

      noteSignupStep('Checking account status');
      setStatusMessage('Checking account status...');
      const { data: accountStatus, error: accountStatusError } = await supabase.rpc('auth_account_status', {
        p_email: normalizedEmail,
      });

      if (accountStatusError) {
        throw accountStatusError;
      }

      if (accountStatus === 'unconfirmed') {
        showCheckEmailFor(normalizedEmail);
        return;
      }

      if (accountStatus === 'confirmed') {
        fail('An account with this email already exists. Please sign in, or use Forgot Password if you do not know the password.');
        return;
      }

      const photoUrl = await uploadProfilePhoto();

      noteSignupStep('Calling Supabase signup');
      setStatusMessage('Creating account and sending confirmation email...');

      await signUp(normalizedEmail, formData.password, buildUserProfile(photoUrl));

      // Ensure user is not auto-logged-in, so they MUST confirm email first.
      await supabase.auth.signOut().catch(() => undefined);
      noteSignupStep('Signup complete, showing check-email page');

      // Stash email in sessionStorage as fallback in case Safari drops
      // the React Router state on a soft refresh.
      try {
        sessionStorage.setItem('signupEmail', normalizedEmail);
        sessionStorage.setItem(SIGNUP_SUCCESS_EMAIL_KEY, normalizedEmail);
        sessionStorage.setItem(SIGNUP_SUCCESS_AT_KEY, String(Date.now()));
      } catch {
        // Browsers can block sessionStorage in private modes.
      }

      setSignupCompleteEmail(normalizedEmail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      noteSignupStep(`Error: ${err.message || 'Failed to sign up'}`);
      if (err?.code === 'email_exists') {
        const normalizedEmail = formData.email.trim().toLowerCase();
        const { data: accountStatus } = await supabase.rpc('auth_account_status', {
          p_email: normalizedEmail,
        });

        if (accountStatus === 'unconfirmed') {
          showCheckEmailFor(normalizedEmail);
          return;
        }

        if (accountStatus === 'confirmed') {
          fail('An account with this email already exists. Please sign in, or use Forgot Password if you do not know the password.');
          return;
        }
      }
      fail(friendlyError(err));
    } finally {
      setStatusMessage('');
      setLoading(false);
    }
  };

  if (signupCompleteEmail) {
    return (
      <div style={styles.container}>
        <div style={styles.innerContainer}>
          <div style={styles.header}>
            <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
            <h1 style={styles.title}>Check Your Email</h1>
            <p style={styles.subtitle}>One more step before you sail</p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Confirm your account</h2>
            <p style={{ color: '#1e3a8a', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              We sent a confirmation link to <strong>{signupCompleteEmail}</strong>.
            </p>
            <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              Click the link in that email to verify your account, then return here and sign in.
              Check spam or junk if you do not see it.
            </p>
            <Link to="/login" style={styles.signInLink}>Go to Sign In →</Link>
          </div>

          <p style={styles.bottomText}>Coconut Grove Sailing Club • Miami, FL</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>

        {/* Logo */}
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Set Sail</h1>
          <p style={styles.subtitle}>Find outings and crew • Connect with sailors</p>
        </div>

        {/* Form Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create Account</h2>

          {error && <div style={styles.errorBox}>{error}</div>}

          {statusMessage && (
            <div style={{background: '#dbeafe', border: '2px solid #2563eb', color: '#1e3a8a', fontSize: '1.125rem', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 800}}>
              {statusMessage}
            </div>
          )}

          {showSignupDebug && (
            <div style={{background: '#f8fafc', border: '2px solid #94a3b8', color: '#334155', fontSize: '0.95rem', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 700, lineHeight: 1.4}}>
              Signup status: {signupDebug || 'Ready. Tap Create Account after filling the form.'}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form} autoComplete="on" noValidate>
            <div style={styles.fieldGroup}>
              <label htmlFor="signup-full-name" style={styles.label}>Full Name *</label>
              <input
                id="signup-full-name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                required
                placeholder="Your full name"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-phone" style={styles.label}>Phone Number *</label>
              <input
                id="signup-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
                placeholder="305.555.1212"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-gender" style={styles.label}>Gender *</label>
              <select
                id="signup-gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                style={styles.select}
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-photo" style={styles.label}>Profile Photo *</label>
              <input
                id="signup-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                required
                style={{...styles.input, padding: '8px 12px', cursor: 'pointer'}}
              />
              {photoPreview && (
                <div style={{marginTop: '12px'}}>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #93c5fd'}}
                  />
                </div>
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-email" style={styles.label}>Email *</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                inputMode="email"
                required
                placeholder="your@email.com"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-password" style={styles.label}>Password *</label>
              <div style={styles.passwordActions}>
                <button
                  type="button"
                  onClick={generatePassword}
                  style={styles.smallButton}
                >
                  Generate Strong Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{...styles.smallButton, background: '#ffffff'}}
                >
                  {showPassword ? 'Hide Password' : 'Show Password'}
                </button>
                <button
                  type="button"
                  onClick={copyPassword}
                  style={{...styles.smallButton, background: '#ffffff'}}
                >
                  Copy Password
                </button>
              </div>
              <p style={styles.passwordHint}>
                At least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, a number, and a symbol.
              </p>
              {generatedPasswordNotice && (
                <div style={styles.generatedNotice}>
                  {generatedPasswordNotice}
                </div>
              )}
              {passwordCopyStatus && (
                <div style={{...styles.generatedNotice, background: '#dcfce7', borderColor: '#16a34a', color: '#166534'}}>
                  {passwordCopyStatus}
                </div>
              )}
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-confirm-password" style={styles.label}>Confirm Password *</label>
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                placeholder="Type it again"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-user-type" style={styles.label}>I am a... *</label>
              <select
                id="signup-user-type"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                required
                style={styles.select}
              >
                <option value="">Select account type</option>
                <option value="crew">Crew Member</option>
                <option value="owner">Boat Owner / Skipper</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="signup-sailing-experience" style={styles.label}>Experience Level *</label>
              <select
                id="signup-sailing-experience"
                name="sailingExperience"
                value={formData.sailingExperience}
                onChange={handleChange}
                required
                style={styles.select}
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              onClick={() => noteSignupStep('Create Account button clicked')}
              style={{
                ...styles.button,
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 15px 25px rgba(0,0,0,0.3)')}
              onMouseLeave={(e) => (e.target.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)')}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>Already have an account?</p>
            <Link
              to="/login"
              style={styles.signInLink}
              onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.target.style.background = '#ffffff'}
            >
              Sign In →
            </Link>
          </div>
        </div>

        <p style={styles.bottomText}>Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
