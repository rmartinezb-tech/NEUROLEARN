import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { createPageUrl } from "@/utils";

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
