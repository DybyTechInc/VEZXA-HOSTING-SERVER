import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Server, 
  Coins, 
  Users, 
  Shield, 
  Terminal, 
  Plus, 
  Trash2, 
  ChevronRight, 
  LogOut,
  ExternalLink,
  Cpu,
  HardDrive,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  MessageSquare,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
  Activity,
  Calendar,
} from 'lucide-react';
import { PTERO_CONFIG } from './constants';

type Mode = 'user' | 'dev';
type Language = 'fr' | 'en';

interface User {
  id: string;
  email: string;
  coins: number;
  mode: Mode | null;
  referrals: number;
  referral_code: string;
  ptero_username: string;
  is_admin: number;
}

interface ServerData {
  id: number;
  name: string;
  type: string;
  ptero_identifier: string;
  expires_at: string;
  status?: {
    state: string;
    cpu: number;
    memory: number;
  };
}

const TEXTS = {
  fr: {
    welcome: "Bienvenue sur FSP Ptero",
    select_lang: "Choisissez votre langue",
    join_required: "Rejoignez nos réseaux pour continuer",
    verify: "Vérifier",
    select_mode: "Choisissez votre mode",
    mode_user_desc: "Gagnez des coins et achetez des serveurs permanents.",
    mode_dev_desc: "Serveurs gratuits illimités en échange de publicité.",
    dashboard: "Tableau de bord",
    servers: "Mes Serveurs",
    shop: "Boutique",
    referral: "Parrainage",
    support: "Support",
    buy: "Acheter",
    delete: "Supprimer",
    coins: "Coins",
    cpu: "CPU",
    ram: "RAM",
    disk: "Disque",
    expires: "Expire le",
    copy_link: "Copier le lien",
    referral_link: "Votre lien de parrainage",
    referral_stats: "Statistiques de parrainage",
    total_referrals: "Total parrainés",
    coins_earned: "Coins gagnés",
    create_server: "Créer un serveur",
    server_name: "Nom du serveur",
    confirm_delete: "Êtes-vous sûr de vouloir supprimer ce serveur ?",
    not_enough_coins: "Pas assez de coins",
    success_buy: "Serveur acheté avec succès !",
    dev_rules: "Règles Développeur",
    dev_rules_desc: "Vous devez inclure nos liens dans votre bot. Nous vérifions automatiquement.",
    accept_rules: "J'accepte les règles",
    login_title: "Connexion",
    register_title: "Créer un compte",
    email_placeholder: "Adresse Email",
    password_placeholder: "Mot de passe",
    auth_button_login: "Se connecter",
    auth_button_register: "S'inscrire",
    no_account: "Pas encore de compte ?",
    have_account: "Déjà un compte ?",
    forgot_password: "Mot de passe oublié ?",
    auth_subtitle: "Accédez à vos serveurs Pterodactyl gratuits.",
  },
  en: {
    welcome: "Welcome to FSP Ptero",
    select_lang: "Select your language",
    join_required: "Join our networks to continue",
    verify: "Verify",
    select_mode: "Select your mode",
    mode_user_desc: "Earn coins and buy permanent servers.",
    mode_dev_desc: "Unlimited free servers in exchange for advertising.",
    dashboard: "Dashboard",
    servers: "My Servers",
    shop: "Shop",
    referral: "Referral",
    support: "Support",
    buy: "Buy",
    delete: "Delete",
    coins: "Coins",
    cpu: "CPU",
    ram: "RAM",
    disk: "Disk",
    expires: "Expires on",
    copy_link: "Copy Link",
    referral_link: "Your Referral Link",
    referral_stats: "Referral Statistics",
    total_referrals: "Total Referrals",
    coins_earned: "Coins Earned",
    create_server: "Create Server",
    server_name: "Server Name",
    confirm_delete: "Are you sure you want to delete this server?",
    not_enough_coins: "Not enough coins",
    success_buy: "Server purchased successfully!",
    dev_rules: "Developer Rules",
    dev_rules_desc: "You must include our links in your bot. We check automatically.",
    accept_rules: "I accept the rules",
    login_title: "Login",
    register_title: "Create Account",
    email_placeholder: "Email Address",
    password_placeholder: "Password",
    auth_button_login: "Sign In",
    auth_button_register: "Sign Up",
    no_account: "Don't have an account?",
    have_account: "Already have an account?",
    forgot_password: "Forgot password?",
    auth_subtitle: "Access your free Pterodactyl servers.",
  }
};

export default function App() {
  const [lang, setLang] = useState<Language | null>(null);
  const [step, setStep] = useState<'lang' | 'join' | 'login' | 'mode' | 'dashboard'>('lang');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [servers, setServers] = useState<ServerData[]>([]);
  const [activeTab, setActiveTab] = useState<'servers' | 'shop' | 'referral' | 'support' | 'admin'>('servers');
  const [loading, setLoading] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const t = lang ? TEXTS[lang] : TEXTS.en;

  useEffect(() => {
    if (user) {
      fetchServers();
      if (user.is_admin && activeTab === 'admin') {
        fetchAdminData();
      }
    }
  }, [user, activeTab]);

  const fetchAdminData = async () => {
    const token = localStorage.getItem('fsp_token');
    if (!token) return;
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const stats = await statsRes.json();
      const users = await usersRes.json();
      setAdminStats(stats);
      setAdminUsers(users);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminUpdateCoins = async (userId: string) => {
    const coins = prompt('Enter new coin balance:');
    if (coins === null) return;
    const token = localStorage.getItem('fsp_token');
    try {
      await fetch(`/api/admin/users/${userId}/coins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coins: parseInt(coins) }),
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminToggleBan = async (userId: string, currentBanned: number) => {
    const token = localStorage.getItem('fsp_token');
    try {
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ banned: !currentBanned }),
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchServers = async () => {
    const token = localStorage.getItem('fsp_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/user/servers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setServers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('fsp_token');
    if (token) {
      fetchProfile(token);
    }
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setStep(data.mode ? 'dashboard' : 'mode');
      } else {
        localStorage.removeItem('fsp_token');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('fsp_referrer_code', ref);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body: any = { email, password };
    if (authMode === 'register') {
      body.referrerCode = localStorage.getItem('fsp_referrer_code');
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('fsp_token', data.token);
        setStep(data.user.mode ? 'dashboard' : 'mode');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetMode = async (mode: Mode) => {
    const token = localStorage.getItem('fsp_token');
    if (!token) return;
    try {
      await fetch('/api/user/mode', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mode }),
      });
      setUser(prev => prev ? { ...prev, mode } : null);
      setStep('dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuyServer = async (type: string) => {
    const token = localStorage.getItem('fsp_token');
    if (!token || !user) return;
    const name = prompt(t.server_name);
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch('/api/servers/buy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serverName: name, type }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: t.success_buy });
        fetchServers();
        setUser({ ...user, coins: user.coins - PTERO_CONFIG.SERVER_TYPES[type].coins });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    const token = localStorage.getItem('fsp_token');
    if (!token || !confirm(t.confirm_delete)) return;
    try {
      await fetch(`/api/servers/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchServers();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePowerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    const token = localStorage.getItem('fsp_token');
    if (!token) return;
    
    try {
      const res = await fetch(`/api/servers/${serverId}/power`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action }),
      });
      
      if (res.ok) {
        // Refresh status after a short delay
        setTimeout(fetchServers, 1000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    localStorage.removeItem('fsp_token');
    setUser(null);
    setStep('lang');
  };

  const renderStep = () => {
    switch (step) {
      case 'lang':
        return (
          <div className="flex flex-col items-center space-y-8">
            <Globe className="w-16 h-16 text-emerald-500 animate-pulse" />
            <h1 className="text-4xl font-bold tracking-tight text-white">{TEXTS.en.select_lang}</h1>
            <div className="flex gap-4">
              <button onClick={() => { setLang('fr'); setStep('login'); }} className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-all border border-white/10 text-xl">Français</button>
              <button onClick={() => { setLang('en'); setStep('login'); }} className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-all border border-white/10 text-xl">English</button>
            </div>
          </div>
        );
      case 'login':
        return (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
            {/* Left Side: Visual/Branding */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 to-emerald-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/server/1200/800')] opacity-20 mix-blend-overlay grayscale" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="text-2xl font-black text-white tracking-tighter">FSP PTERO</span>
                </div>
                <h2 className="text-5xl font-black text-white leading-tight mb-6">
                  {authMode === 'login' ? 'Welcome Back.' : 'Start Your Journey.'}
                </h2>
                <p className="text-white/70 text-lg max-w-sm">
                  {t.auth_subtitle}
                </p>
              </div>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-10 h-10 rounded-full border-2 border-indigo-600" referrerPolicy="no-referrer" />
                  ))}
                </div>
                <p className="text-white/60 text-sm font-medium">Joined by 2,000+ developers</p>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="p-8 lg:p-16 flex flex-col justify-center">
              <div className="mb-10">
                <h1 className="text-3xl font-black text-white mb-2">
                  {authMode === 'login' ? t.login_title : t.register_title}
                </h1>
                <p className="text-zinc-500 font-medium">
                  {authMode === 'login' ? t.no_account : t.have_account}{' '}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors"
                  >
                    {authMode === 'login' ? t.auth_button_register : t.auth_button_login}
                  </button>
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">{t.email_placeholder}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">{t.password_placeholder}</label>
                    {authMode === 'login' && (
                      <button type="button" className="text-[10px] uppercase font-black text-emerald-500 hover:text-emerald-400 tracking-widest transition-colors">
                        {t.forgot_password}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                  </motion.div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {authMode === 'login' ? t.auth_button_login : t.auth_button_register}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center gap-4">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Or continue with</p>
                <div className="flex gap-4 w-full">
                  <button className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all">
                    <img src="https://www.svgrepo.com/show/303108/google-icon-logo.svg" className="w-5 h-5" alt="Google" />
                    <span className="text-white text-sm font-bold">Google</span>
                  </button>
                  <button className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all">
                    <img src="https://www.svgrepo.com/show/341847/github-logo.svg" className="w-5 h-5 invert" alt="GitHub" />
                    <span className="text-white text-sm font-bold">GitHub</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'mode':
        return (
          <div className="flex flex-col items-center space-y-8 max-w-2xl">
            <Terminal className="w-16 h-16 text-amber-500" />
            <h1 className="text-3xl font-bold text-white">{t.select_mode}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div onClick={() => handleSetMode('user')} className="p-8 bg-zinc-800 border border-white/5 rounded-2xl hover:border-emerald-500/50 cursor-pointer transition-all group">
                <Users className="w-10 h-10 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">USER</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{t.mode_user_desc}</p>
              </div>
              <div onClick={() => handleSetMode('dev')} className="p-8 bg-zinc-800 border border-white/5 rounded-2xl hover:border-amber-500/50 cursor-pointer transition-all group">
                <Terminal className="w-10 h-10 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-white mb-2">DEVELOPER</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{t.mode_dev_desc}</p>
              </div>
            </div>
          </div>
        );
      case 'dashboard':
        return (
          <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-64 space-y-2">
              <div className="p-6 bg-zinc-800 rounded-2xl border border-white/5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Account</p>
                    <p className="text-white font-medium truncate w-32">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-white font-bold">{user?.coins}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Coins</span>
                </div>
              </div>

              <nav className="space-y-1">
                <button onClick={() => setActiveTab('servers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'servers' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                  <Server className="w-5 h-5" />
                  <span className="font-medium">{t.servers}</span>
                </button>
                <button onClick={() => setActiveTab('shop')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'shop' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">{t.shop}</span>
                </button>
                <button onClick={() => setActiveTab('referral')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'referral' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{t.referral}</span>
                </button>
                <button onClick={() => setActiveTab('support')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'support' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">{t.support}</span>
                </button>
                {user?.is_admin === 1 && (
                  <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Admin Panel</span>
                  </button>
                )}
              </nav>

              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 transition-all mt-8">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="font-medium">{message.text}</p>
                </motion.div>
              )}

              {activeTab === 'servers' && (
                <div className="grid grid-cols-1 gap-4">
                  {servers.length === 0 ? (
                    <div className="p-12 bg-zinc-800/50 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                      <Server className="w-12 h-12 text-zinc-600 mb-4" />
                      <p className="text-zinc-400 font-medium">No servers found. Visit the shop to get one!</p>
                    </div>
                  ) : (
                    servers.map((s) => (
                      <div key={s.id} className="p-6 bg-zinc-800 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.status?.state === 'running' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-700 text-zinc-400'}`}>
                              <Server className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white">{s.name}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{s.type}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{s.ptero_identifier}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-2xl">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                <Activity className="w-3 h-3" />
                                <span>Status</span>
                              </div>
                              <p className={`text-sm font-black uppercase ${s.status?.state === 'running' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                {s.status?.state || 'Offline'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                <Cpu className="w-3 h-3" />
                                <span>CPU</span>
                              </div>
                              <p className="text-sm text-white font-mono font-bold">{(s.status?.cpu || 0).toFixed(1)}%</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                <Database className="w-3 h-3" />
                                <span>RAM</span>
                              </div>
                              <p className="text-sm text-white font-mono font-bold">{(s.status?.memory ? s.status.memory / 1024 / 1024 : 0).toFixed(0)}MB</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                <Calendar className="w-3 h-3" />
                                <span>Expires</span>
                              </div>
                              <p className="text-sm text-white font-bold">{new Date(s.expires_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-white/5">
                              <button 
                                onClick={() => handlePowerAction(s.id, 'start')}
                                disabled={s.status?.state === 'running'}
                                className="p-2.5 text-zinc-500 hover:text-emerald-500 disabled:opacity-30 transition-all"
                                title="Start"
                              >
                                <Play className="w-5 h-5 fill-current" />
                              </button>
                              <button 
                                onClick={() => handlePowerAction(s.id, 'restart')}
                                className="p-2.5 text-zinc-500 hover:text-amber-500 transition-all"
                                title="Restart"
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handlePowerAction(s.id, 'stop')}
                                disabled={s.status?.state === 'offline'}
                                className="p-2.5 text-zinc-500 hover:text-red-500 disabled:opacity-30 transition-all"
                                title="Stop"
                              >
                                <Square className="w-5 h-5 fill-current" />
                              </button>
                            </div>
                            <button 
                              onClick={() => window.open(`${PTERO_CONFIG.PANEL_URL}/server/${s.ptero_identifier}`, '_blank')}
                              className="p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl border border-white/5 transition-all"
                              title="Console"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteServer(s.id)}
                              className="p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'shop' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(PTERO_CONFIG.SERVER_TYPES).map(([key, config]) => (
                    <div key={key} className="p-6 bg-zinc-800 rounded-2xl border border-white/5 flex flex-col h-full">
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-1">{config.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-emerald-500">{config.coins}</span>
                          <span className="text-xs text-zinc-500 uppercase font-bold">Coins</span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-8 flex-1">
                        <div className="flex items-center gap-3 text-sm text-zinc-400">
                          <Cpu className="w-4 h-4 text-zinc-600" />
                          <span>{config.cpu}% CPU</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-400">
                          <Database className="w-4 h-4 text-zinc-600" />
                          <span>{config.memory}MB RAM</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-400">
                          <HardDrive className="w-4 h-4 text-zinc-600" />
                          <span>{config.disk}MB Disk</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleBuyServer(key)}
                        disabled={loading || (user?.coins || 0) < config.coins}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                      >
                        {t.buy}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'referral' && (
                <div className="space-y-6">
                  <div className="p-8 bg-zinc-800 rounded-3xl border border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6">{t.referral_link}</h3>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={`${window.location.origin}?ref=${user?.referral_code}`}
                        className="flex-1 p-4 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 text-sm font-mono"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.referral_code}`);
                          setMessage({ type: 'success', text: 'Copied!' });
                        }}
                        className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-900 rounded-2xl">
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t.total_referrals}</p>
                        <p className="text-2xl font-black text-white">{user?.referrals}</p>
                      </div>
                      <div className="p-4 bg-zinc-900 rounded-2xl">
                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{t.coins_earned}</p>
                        <p className="text-2xl font-black text-amber-500">{user?.referrals ? user.referrals * PTERO_CONFIG.COINS_PER_REFERRAL : 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-zinc-800 rounded-3xl border border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6">Milestones</h3>
                    <div className="space-y-4">
                      {Object.entries(PTERO_CONFIG.MILESTONE_REWARDS).map(([count, bonus]) => (
                        <div key={count} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${Number(user?.referrals) >= Number(count) ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                              {count}
                            </div>
                            <span className="text-white font-medium">{count} Referrals</span>
                          </div>
                          <span className="text-amber-500 font-bold">+{bonus} Coins</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'support' && (
                <div className="p-12 bg-zinc-800 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                  <MessageSquare className="w-16 h-16 text-emerald-500 mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">Need Help?</h3>
                  <p className="text-zinc-400 mb-8 max-w-md">Our support team is available to help you with any issues or questions.</p>
                  <div className="px-8 py-4 bg-zinc-900 border border-white/5 text-white rounded-2xl font-bold text-lg transition-all flex flex-col items-center gap-1">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Support Email</span>
                    <span>support@fspptero.com</span>
                  </div>
                </div>
              )}

              {activeTab === 'admin' && user?.is_admin === 1 && (
                <div className="space-y-6">
                  {/* Admin Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Total Users', value: adminStats?.users, icon: Users, color: 'text-emerald-500' },
                      { label: 'Servers', value: adminStats?.servers, icon: Server, color: 'text-indigo-500' },
                      { label: 'Total Coins', value: adminStats?.coins, icon: Coins, color: 'text-amber-500' },
                      { label: 'Developers', value: adminStats?.devs, icon: Terminal, color: 'text-blue-500' },
                      { label: 'Regular Users', value: adminStats?.userCount, icon: Users, color: 'text-zinc-400' },
                      { label: 'Banned', value: adminStats?.banned, icon: Shield, color: 'text-red-500' },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 bg-zinc-800 rounded-2xl border border-white/5">
                        <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{stat.label}</p>
                        <p className="text-xl font-black text-white">{stat.value ?? '...'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Users Table */}
                  <div className="bg-zinc-800 rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <h3 className="text-xl font-bold text-white">User Management</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase font-bold">
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Coins</th>
                            <th className="px-6 py-4">Mode</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminUsers.map((u) => (
                            <tr key={u.id} className="text-sm hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-white font-medium">{u.email}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">{u.id}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Coins className="w-3 h-3 text-amber-500" />
                                  <span className="text-white font-bold">{u.coins}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.mode === 'dev' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-700 text-zinc-400'}`}>
                                  {u.mode || 'None'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {u.is_banned === 1 ? (
                                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase">Banned</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase">Active</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleAdminUpdateCoins(u.id)} className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-all" title="Edit Coins">
                                    <Coins className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleAdminToggleBan(u.id, u.is_banned)} className={`p-2 rounded-lg transition-all ${u.is_banned === 1 ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`} title={u.is_banned === 1 ? 'Unban' : 'Ban'}>
                                    <Shield className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step + activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5 text-center">
        <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase">
          &copy; 2024 FSP PTERO &bull; Powered by Pterodactyl
        </p>
      </footer>
    </div>
  );
}
