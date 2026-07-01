import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (res?.access_token) base44.auth.setToken(res.access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", '/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/landing" className="text-5xl inline-block animate-float mb-4">🧠</Link>
          <h1 className="text-3xl font-space font-bold">Únete a NeuroLearn</h1>
          <p className="text-muted-foreground mt-1">Crea tu cuenta y comienza a estudiar</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {!otpSent ? (
            <>
              <Button type="button" variant="outline" className="w-full py-5 rounded-xl gap-3 mb-5" onClick={handleGoogle}>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Registrarse con Google
              </Button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o con email</span></div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tu@email.com" className="pl-10 rounded-xl" required />
                  </div>
                </div>
                <div>
                  <Label>Contraseña</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres" className="pl-10 pr-10 rounded-xl" required />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmar contraseña</Label>
                  <div className="relative mt-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" placeholder="Repite la contraseña" className="pl-10 rounded-xl" required />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full py-5 rounded-xl" disabled={loading}>
                  {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" />Crear cuenta</>}
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-center text-sm text-muted-foreground mb-4">Te enviamos un código de verificación a <strong>{email}</strong></p>
              <div>
                <Label>Código de verificación</Label>
                <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Ingresa el código" className="text-center text-lg tracking-widest rounded-xl mt-1" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full py-5 rounded-xl" disabled={loading}>
                {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Verificar"}
              </Button>
              <button type="button" onClick={() => base44.auth.resendOtp(email)} className="text-sm text-primary hover:underline w-full text-center">
                Reenviar código
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/sign-in" className="text-primary hover:underline font-medium">Inicia sesión</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
