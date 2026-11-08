
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail,
    Send,
    ShieldCheck,
    Eye,
    EyeOff,
    CheckCircle2,
    Circle
} from 'lucide-react';

import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Auth() {
    const [mode, setMode] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore(s => s.login);
    const setup = useAuthStore(s => s.setup);

    // Password validation rules
    const passwordRules = [
        {
            label: 'At least 10 characters',
            valid: password.length >= 10
        },
        {
            label: 'At least one uppercase letter (A-Z)',
            valid: /[A-Z]/.test(password)
        },
        {
            label: 'At least one lowercase letter (a-z)',
            valid: /[a-z]/.test(password)
        },
        {
            label: 'At least one number (0-9)',
            valid: /[0-9]/.test(password)
        },
        {
            label: 'At least one special character (!@#$)',
            valid: /[^A-Za-z0-9\s]/.test(password)
        }
    ];

    const passwordValid = passwordRules.every(rule => rule.valid);

    async function submit(e) {
        e.preventDefault();
        setError('');

        // Enforce strong password only during initial setup
        if (mode === 'setup' && !passwordValid) {
            setError('Please satisfy all password requirements.');
            return;
        }

        setBusy(true);

        try {
            if (mode === 'setup') {
                await setup(name, email, password);
                setPassword('');
                setShowPassword(false);
                setMode('login');
                setError('Admin account created. Sign in now.');
            } else {
                await login(email, password);
                navigate('/');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="auth-page">

            {/* Left branding section */}
            <section className="auth-art">
                <div className="brand brand-light">
                    <span className="brand-icon">
                        <Send />
                    </span>
                    MailFlow
                </div>

                <div className="art-copy">
                    <span className="pill light-pill">
                        BULK EMAIL, SIMPLIFIED
                    </span>

                    <h1>
                        Meaningful emails.
                        <br />
                        <em>At scale.</em>
                    </h1>

                    <p>
                        Create campaigns, reach your audience, and understand
                        every send — all from one calm workspace.
                    </p>

                    <div className="art-points">
                        <span>
                            <ShieldCheck />
                            Secure admin workspace
                        </span>

                        <span>
                            <Mail />
                            Individual recipient delivery logs
                        </span>
                    </div>
                </div>

                <div className="art-footer">
                    A smarter way to manage your email campaigns.
                </div>
            </section>

            {/* Authentication section */}
            <section className="auth-panel">
                <form className="auth-card" onSubmit={submit}>

                    <div className="auth-mark">
                        <Mail />
                    </div>

                    <span className="eyebrow">
                        WELCOME TO MAILFLOW
                    </span>

                    <h2>
                        {mode === 'login'
                            ? 'Welcome back'
                            : 'Create your admin account'}
                    </h2>

                    <p className="muted">
                        {mode === 'login'
                            ? 'Sign in to manage your email campaigns.'
                            : 'Initial setup is available only before the first admin is created.'}
                    </p>

                    {/* Full name */}
                    {mode === 'setup' && (
                        <label>
                            Full name

                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                autoComplete="name"
                            />
                        </label>
                    )}

                    {/* Email */}
                    <label>
                        Email address

                        <input
                            required
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            autoComplete="email"
                        />
                    </label>

                    {/* Password */}
                    <label>
                        Password

                        <div
                            style={{
                                position: 'relative',
                                width: '100%'
                            }}
                        >
                            <input
                                required
                                minLength={mode === 'setup' ? 10 : 1}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={
                                    mode === 'setup'
                                        ? 'Create a strong password'
                                        : 'Your password'
                                }
                                autoComplete={
                                    mode === 'setup'
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                style={{
                                    paddingRight: '45px'
                                }}
                            />

                            {/* Show / Hide password */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={
                                    showPassword ? 'Hide password' : 'Show password'
                                }
                                aria-pressed={showPassword}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#85849a',
                                    padding: '4px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword
                                    ? <EyeOff size={19} />
                                    : <Eye size={19} />}
                            </button>
                        </div>
                    </label>

                    {/* Live password requirements */}
                    {mode === 'setup' && (
                        <div
                            style={{
                                background: '#faf9ff',
                                border: '1px solid #ece7fa',
                                borderRadius: '9px',
                                padding: '13px',
                                marginTop: '-7px',
                                display: 'grid',
                                gap: '10px'
                            }}
                        >
                            <strong
                                style={{
                                    fontSize: '11px',
                                    color: '#39354d'
                                }}
                            >
                                Password requirements
                            </strong>

                            {passwordRules.map((rule, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '9px',
                                        fontSize: '11px',
                                        color: rule.valid ? '#159b70' : '#85849a'
                                    }}
                                >
                                    {rule.valid
                                        ? <CheckCircle2 size={15} />
                                        : <Circle size={15} />}

                                    <span>{rule.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error / success message */}
                    {error && (
                        <div
                            className="notice"
                            role="status"
                            aria-live="polite"
                        >
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className="btn primary full"
                        disabled={
                            busy ||
                            (mode === 'setup' && !passwordValid)
                        }
                    >
                        {busy
                            ? 'Please wait…'
                            : mode === 'login'
                                ? 'Sign in'
                                : 'Create admin account'}
                    </button>

                    {/* Initial setup check */}
                    {mode === 'login' ? (
                        <button
                            type="button"
                            className="text-button"
                            onClick={async () => {
                                setError('');

                                try {
                                    const { data } = await api.get('/auth/setup-status');

                                    setMode(
                                        data.setupRequired ? 'setup' : 'login'
                                    );

                                    if (!data.setupRequired) {
                                        setError('An admin account already exists.');
                                    }
                                } catch (e) {
                                    setError(e.message);
                                }
                            }}
                        >
                            First time? Check initial setup
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="text-button"
                            onClick={() => {
                                setMode('login');
                                setPassword('');
                                setShowPassword(false);
                                setError('');
                            }}
                        >
                            Back to sign in
                        </button>
                    )}

                </form>

                <small className="auth-legal">
                    Protected access · Your credentials stay private
                </small>
            </section>
        </div>
    );
}
