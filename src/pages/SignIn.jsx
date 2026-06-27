import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createPageUrl } from "@/utils";

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
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
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/landing" className="text-5xl inline-block animate-float mb-4">🧠</Link>
          <h1 className="text-3xl font-space font-bold">Bienvenido de vuelta</h1>
          <p className="text-muted-foreground mt-1">Ingresa a tu cuenta de NeuroLearn</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <Button onClick={handleGoogle} variant="outline" className="w-full mb-4 py-5 rounded-xl" disabled={loading}>
            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-2" />
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 rounded-xl" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full py-5 rounded-xl" disabled={loading}>
              {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><LogIn className="mr-2 h-4 w-4" />Iniciar sesión</>}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta? <Link to="/register" className="text-primary hover:underline font-medium">Regístrate</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
