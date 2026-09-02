/**
 * Login Page
 */
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Coffee, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/pos" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login berhasil!');
      navigate('/pos');
    } catch (error) {
      toast.error(error.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-noise opacity-50" />
      <div 
        className="absolute top-0 left-0 right-0 h-1/2"
        style={{
          background: 'linear-gradient(180deg, hsl(36 33% 95%) 0%, hsl(36 33% 98%) 100%)'
        }}
      />
      
      <Card className="w-full max-w-md relative shadow-soft">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-xl w-fit">
            <Coffee className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
            Masuk ke KedaiOps
          </CardTitle>
          <CardDescription>
            POS & Manajemen Stok berbasis Resep
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Masuk...</>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo: admin@kedaiops.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
