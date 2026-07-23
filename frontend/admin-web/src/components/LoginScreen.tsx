import { useState, useRef } from "react";
import { Lock, Shield, ArrowLeft, Scan } from "lucide-react";
import type { FaceChallenge, Session, TwoFactorChallenge } from "../api";
import { verify2faLogin, faceLogin } from "../api";
import { roles } from "../data/mockData";
import { NovaraLogo } from "./NovaraLogo";

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onSession: (session: Session) => void;
  onForgotPassword?: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToSignUp?: () => void;
  twoFactorChallenge?: TwoFactorChallenge | null;
  onClearChallenge?: () => void;
  on2faResult?: (result: Session | FaceChallenge) => void;
}

export function LoginScreen({ loading, error, onLogin, onSession, onForgotPassword, onSwitchToRegister, onSwitchToSignUp, twoFactorChallenge: externalChallenge, onClearChallenge, on2faResult }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorVerifying, setTwoFactorVerifying] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveChallenge = externalChallenge ?? null;

  const handleDemoLogin = (roleKey: string) => {
    const role = roles.find(r => r.key === roleKey);
    onSession({
      token: "demo-token",
      refreshToken: "demo-refresh-token",
      user: {
        email: role?.email ?? `${roleKey}@demo.local`,
        full_name: role?.label ?? roleKey,
        role: role?.label ?? roleKey,
        role_key: roleKey,
        school: "Nova Demonstration School"
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    onClearChallenge?.();
    void onLogin(email, password);
  };

  // The parent will pass back 2FA challenge via error or we handle it here
  // Actually we need a different approach: login function returns Session | TwoFactorChallenge
  // But the current onLogin is async void. Let me use a modified approach.

  const handle2faVerify = async () => {
    if (!effectiveChallenge) return;
    setTwoFactorVerifying(true);
    setTwoFactorError(null);
    try {
      const result = await verify2faLogin(effectiveChallenge.temp_token, twoFactorCode);
      if (on2faResult) {
        on2faResult(result);
      } else if (!("requires_face" in result)) {
        onSession(result);
      }
    } catch (err: any) {
      setTwoFactorError(err.message);
    } finally {
      setTwoFactorVerifying(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!email) {
      setFaceError("Enter your email first, then click Face Login.");
      return;
    }
    setFaceLoading(true);
    setFaceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
      await new Promise(r => setTimeout(r, 800));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      const result = await faceLogin(email, imageData);
      onSession(result);
    } catch (err: any) {
      setFaceError(err.message || "Face login failed. Make sure your face is registered.");
    } finally {
      setFaceLoading(false);
    }
  };

  // If 2FA challenge is active, show code entry
  if (effectiveChallenge) {
    return (
      <main className="login-screen">
        <div className="login-background-orb login-orb-1" />
        <div className="login-background-orb login-orb-2" />
        <section className="login-panel">
          <div className="login-brand">
            <NovaraLogo size={40} />
            <div>
              <p>Two-Factor Authentication</p>
              <h1>Enter Verification Code</h1>
            </div>
          </div>
          <div className="login-card">
            <div className="login-card-title">
              <Shield size={22} />
              <div>
                <p>Authenticator app required</p>
                <h2>Enter the 6-digit code</h2>
              </div>
            </div>
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <input
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                placeholder="000000"
                style={{
                  width:180,height:56,textAlign:"center",fontSize:"1.5rem",fontWeight:800,
                  letterSpacing:8,border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,
                  background:"rgba(255,255,255,0.05)",color:"#f1f5f9"
                }}
                maxLength={6}
                autoFocus
              />
            </div>
            {twoFactorError && <div className="login-error"><span className="error-icon">⚠</span>{twoFactorError}</div>}
            <div className="login-actions" style={{gridTemplateColumns:"1fr 1fr"}}>
              <button type="button" className="secondary-button" onClick={() => onClearChallenge?.()}>
                <ArrowLeft size={16}/> Back
              </button>
              <button type="button" className="primary-button gradient-button" onClick={handle2faVerify} disabled={twoFactorVerifying || twoFactorCode.length !== 6}>
                {twoFactorVerifying ? <span className="button-with-spinner"><span className="spinner" /> Verifying...</span> : "Verify"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <div className="login-background-orb login-orb-1" />
      <div className="login-background-orb login-orb-2" />
      <section className="login-panel">
        <div className="login-brand">
          <NovaraLogo size={40} />
          <div>
            <p>Smart School Management</p>
            <h1>Welcome back</h1>
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-title">
            <Lock size={22} />
            <div>
              <p>Secure workspace</p>
              <h2>Sign in to your account</h2>
            </div>
          </div>

          <div className="login-form-fields">
            <label className="form-field">
              <span className="field-label">Email Address</span>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.com" className="field-input" />
            </label>
            <label className="form-field">
              <span className="field-label">Password</span>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" className="field-input" />
            </label>
            {onForgotPassword && (
              <button type="button" className="forgot-password-link" onClick={onForgotPassword}>Forgot Password?</button>
            )}
          </div>

          {error && <div className="login-error"><span className="error-icon">⚠</span>{error}</div>}
          {faceError && <div className="login-error"><span className="error-icon">⚠</span>{faceError}</div>}

          <div className="login-actions" style={{gridTemplateColumns:"1fr 1fr"}}>
            <button type="button" className={`secondary-button ${showDemo ? 'active' : ''}`} onClick={() => setShowDemo(!showDemo)}>
              {showDemo ? "Hide" : "Show"} Demo
            </button>
            <button type="submit" className="primary-button gradient-button" disabled={loading}>
              {loading ? <span className="button-with-spinner"><span className="spinner" /> Signing in...</span> : "Sign In"}
            </button>
          </div>

          <button type="button" className="secondary-button" style={{width:"100%",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={handleFaceLogin} disabled={faceLoading || loading}>
            {faceLoading ? <span className="button-with-spinner"><span className="spinner" /> Scanning face...</span> : <><Scan size={16} /> Login with Face</>}
          </button>
        </form>

        <div className="login-help" style={{display:"grid",gap:8}}>
          <div style={{display:"flex",gap:8}}>
            {onSwitchToRegister && (
              <button type="button" className="secondary-button" style={{flex:1}} onClick={onSwitchToRegister}>
                Register School
              </button>
            )}
            {onSwitchToSignUp && (
              <button type="button" className="secondary-button" style={{flex:1}} onClick={onSwitchToSignUp}>
                Activate Account
              </button>
            )}
          </div>
          {onForgotPassword && (
            <button type="button" className="secondary-button" style={{width:"100%"}} onClick={onForgotPassword}>
              Forgot Password?
            </button>
          )}
        </div>

        {showDemo ? (
          <div className="login-help">
            <p>Or select a role to view a demo of its workspace:</p>
            <div className="demo-roles">
              {roles.filter(r => r.key !== "super-admin" && r.key !== "admin").map((role) => (
                <button key={role.key} type="button" className="secondary-button" onClick={() => handleDemoLogin(role.key)}>
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
