import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Key, 
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  isDark: boolean;
  onNotify: (message: string, type: "info" | "warning" | "success") => void;
}

export default function AuthScreen({ onLoginSuccess, isDark, onNotify }: AuthScreenProps) {
  // Navigation: "login" | "register" | "forgot" | "reset" | "verify"
  const [view, setView] = useState<"login" | "register" | "forgot" | "reset" | "verify">("login");
  const [portalRole, setPortalRole] = useState<"customer" | "admin">("customer");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verifications states
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockTimer, setLockTimer] = useState<number | null>(null); // rate limiter lock backoff

  // Developer mail trap log buffer for easy local review of verification codes & password reset tokens
  const [developerLog, setDeveloperLog] = useState<{
    type: "verification" | "reset";
    email: string;
    tokenOrCode: string;
    link?: string;
    timestamp: string;
  }[]>([]);

  // Timer countdown for rate limiting lock
  useEffect(() => {
    if (lockTimer && lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer(prev => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let loginEmail = email;
    let loginPassword = password;
    if (portalRole === "admin") {
      loginEmail = "dalgrup@gmail.com";
    }
    if (portalRole === "customer") {
      loginEmail = "customer@dalgrup.com";
      loginPassword = "customer";

      if (!name.trim()) {
        setErrorMsg("Giriş yapabilmek için lütfen ad ve soyadınızı yazın.");
        return;
      }
    }

    if (!loginEmail || !loginPassword) {
      setErrorMsg("E-posta ve şifre girmek zorunludur.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, customerName: name })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit or wrong credentials
        if (response.status === 403 && data.error && data.error.includes("Lütfen")) {
          // Locked timer extracted
          const mins = parseInt(data.error.replace(/[^0-9]/g, "")) || 15;
          setLockTimer(mins * 60);
        }
        throw new Error(data.error || "Giriş başarısız.");
      }

      onNotify(data.message || "Giriş başarılı!", "success");
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
      onNotify(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !email || !phone || !password) {
      setErrorMsg("Lütfen tüm alanları eksiksiz doldurun.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Girdiğiniz şifreler uyuşmuyor.");
      return;
    }

    if (password.length < 4) {
      setErrorMsg("Şifreniz en az 4 karakter uzunluğunda olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kayıt sırasında bir sorun çıktı.");
      }

      onNotify("Kayıt başarılı! Lütfen mailinize gönderilen kodu doğrulayın.", "success");
      
      // Update developer trap logs
      setDeveloperLog(prev => [
        {
          type: "verification",
          email: email.toLowerCase().trim(),
          tokenOrCode: data.verificationCode,
          timestamp: new Date().toLocaleTimeString("tr-TR")
        },
        ...prev
      ]);

      setVerifyEmailAddress(email.toLowerCase().trim());
      setView("verify");
    } catch (err: any) {
      setErrorMsg(err.message);
      onNotify(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!verificationCodeInput) {
      setErrorMsg("Lütfen 6 haneli doğrulama kodunu girin.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmailAddress, code: verificationCodeInput })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kod doğrulanamadı.");
      }

      onNotify("Hesabınız başarıyla aktive edildi! Giriş yapabilirsiniz.", "success");
      setEmail(verifyEmailAddress);
      setView("login");
    } catch (err: any) {
      setErrorMsg(err.message);
      onNotify(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email) {
      setErrorMsg("Lütfen sistemde kayıtlı e-posta adresinizi girin.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Şifre sıfırlama talebi başarısız.");
      }

      onNotify("Şifre sıfırlama bilgileri sistem tepsisine düşürüldü.", "info");

      if (data.resetToken) {
        setDeveloperLog(prev => [
          {
            type: "reset",
            email: email.toLowerCase().trim(),
            tokenOrCode: data.resetToken,
            link: data.resetLink,
            timestamp: new Date().toLocaleTimeString("tr-TR")
          },
          ...prev
        ]);
        setResetTokenInput(data.resetToken);
        onNotify(`[DEBUG] Şifre Sıfırlama Kodu: ${data.resetToken}`, "success");
      }

      setView("reset");
    } catch (err: any) {
      setErrorMsg(err.message);
      onNotify(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!resetTokenInput || !newPasswordInput) {
      setErrorMsg("Token ve yeni şifre alanları zorunludur.");
      return;
    }

    if (newPasswordInput.length < 4) {
      setErrorMsg("Şifre en az 4 karakterden oluşmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetTokenInput, newPassword: newPasswordInput })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Şifre sıfırlanamadı.");
      }

      onNotify("Şifreniz başarıyla yenilendi!", "success");
      setPassword(newPasswordInput);
      setView("login");
    } catch (err: any) {
      setErrorMsg(err.message);
      onNotify(err.message, "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center transition-colors duration-300 ${isDark ? "bg-[#090d16]" : "bg-slate-50"}`}>
      
      {/* BRAND HEADER */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <Building2 className="w-10 h-10 text-amber-500 animate-spin-slow" />
          <h1 className={`text-2xl font-extrabold tracking-wider uppercase ${isDark ? "text-white" : "text-slate-900"}`}>
            DAL GRUP <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 text-xs font-mono rounded">ERP</span>
          </h1>
        </div>
        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} font-medium`}>
          Zirve Bireysel Ticaret ve Güvenli Yönetim Portalı
        </p>
      </div>

      {/* PORTAL SWITCHER (Müşteri vs Admin separation) */}
      {view === "login" && (
        <div className={`flex p-1 rounded-xl mb-6 max-w-sm w-full border ${isDark ? "bg-[#0c1221] border-slate-800" : "bg-white border-slate-200"}`}>
          <button
            onClick={() => setPortalRole("customer")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              portalRole === "customer" 
                ? "bg-amber-500 text-slate-950 shadow-md"
                : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Müşteri Portalı
          </button>
          <button
            onClick={() => setPortalRole("admin")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              portalRole === "admin" 
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Yönetici Portalı
          </button>
        </div>
      )}

      {/* PORTAL SPECIFIC URL BADGES (Security Info) */}
      <div className="max-w-md w-full mb-3 text-center">
        {portalRole === "admin" && view === "login" ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Güvenli Yönetim Linki: dalgrup.com/admin-panel
          </span>
        ) : (
          view === "login" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-550/20">
              Kullanıcı Linki: dalgrup.com/login & /kayit
            </span>
          )
        )}
      </div>

      {/* MAIN AUTHENTICATION CARD */}
      <div className={`p-8 rounded-2xl w-full max-w-md border shadow-2xl transition-all ${
        isDark ? "bg-[#0c1221] border-slate-850 text-white" : "bg-white border-slate-200 text-slate-800"
      }`}>

        {/* ERROR BOX */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* RATE LIMIT BAN MESSAGE */}
        {lockTimer !== null && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-semibold flex flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Güvenlik Kilidi Aktif!</span>
            </span>
            <p className="font-mono text-[10px] text-slate-400">
              Ardışık 5 hatalı şifre girişi nedeniyle sistem kilitlendi. Lütfen <b>{lockTimer} saniye</b> bekleyin.
            </p>
          </div>
        )}

        {/* 1. VIEW: LOGIN */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">
                {portalRole === "admin" ? "Yönetici Giriş Paneli" : "Müşteri Giriş Portalı"}
              </h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {portalRole === "admin" 
                  ? "Sadece DAL Grup şirket yetkilileri erişim sağlayabilir." 
                  : "Müşteri portalına anında şifresiz ve güvenli erişim sağlayın."}
              </p>
            </div>

            {portalRole === "admin" ? (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-[11px] font-bold text-amber-500 hover:underline"
                      disabled={lockTimer !== null}
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white outline-none"
                      disabled={lockTimer !== null}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="text-center space-y-1">
                  <span className="text-xl">🤝</span>
                  <p className="text-xs text-emerald-400 font-bold">
                    Hoş Geldiniz!
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Sisteme giriş yapmak için lütfen Adınızı ve Soyadınızı girin.
                  </p>
                </div>
                
                <div className="text-left">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                    İsim Soyisim *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Adınız Soyadınız"
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/60 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white outline-none"
                      disabled={lockTimer !== null}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all mt-6 shadow-md"
              disabled={loading || lockTimer !== null}
            >
              {loading ? "Giriş Yapılıyor..." : "Girdi / Giriş Yap"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. VIEW: REGISTER */}
        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Yeni Müşteri Hesabı</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                DAL Grup bayiler ve müşteriler sistemine katılarak alışverişe başlayın.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                  Adınız ve Soyadınız
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Can Demir"
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                  E-Posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="can@example.com"
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                  Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0532 999 88 77"
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                    Şifre Tekil
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all mt-4"
              disabled={loading}
            >
              {loading ? "Hesap Oluşturuluyor..." : "Kayıt Ol ve İlerle"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Geri Dön
              </button>
            </div>
          </form>
        )}

        {/* 3. VIEW: VERIFY EMAIL */}
        {view === "verify" && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="space-y-1 text-center">
              <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto" />
              <h2 className="text-lg font-bold tracking-tight">E-Posta Doğrulama</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Güvenliğiniz için <b className="text-amber-500">{verifyEmailAddress}</b> adresine 6 haneli bir doğrulama kodu gönderilmiştir.
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-center text-slate-400">
                Lütfen 6 Haneli Doğrulama Kodunu Girin
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={verificationCodeInput}
                onChange={e => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5rem] font-mono text-xl py-2 bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
              />
              <span className="block text-[10px] text-zinc-500 text-center mt-1.5 italic">
                * Kod tepsisini ve gelen maili aşağıdaki panelden anında görebilirsiniz.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all"
              disabled={loading}
            >
              Kodu Doğrula ve Devam Et
              <CheckCircle className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Giriş Ekranına Dön
              </button>
            </div>
          </form>
        )}

        {/* 4. VIEW: FORGOT PASSWORD */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight">Şifremi Unuttum</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Kayıtlı e-posta adresinizi girin. Güvenli sıfırlama linki ve tek kullanımlık tokeninizi anında üreteceğiz.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@example.com"
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all mt-4"
              disabled={loading}
            >
              Şifre Sıfırlama Linki Oluştur
              <Key className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Geri Dön
              </button>
            </div>
          </form>
        )}

        {/* 5. VIEW: RESET PASSWORD */}
        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1 text-center">
              <Key className="w-8 h-8 text-amber-500 mx-auto" />
              <h2 className="text-md font-bold tracking-tight">Yeni Şifre Belirleme</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Mail adresinize iletilen güvenlik tokenını ve yapmak istediğiniz yeni şifreyi yazın.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                  Şifre Sıfırlama Tokenı (6 Haneli)
                </label>
                <input
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={e => setResetTokenInput(e.target.value)}
                  placeholder="Sevk Edilen Token"
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none text-center font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                  Yeni Güvenli Şifre
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="En az 4 karakter"
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/40 border border-slate-800 rounded-xl focus:border-amber-500 text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all mt-4"
              disabled={loading}
            >
              Şifremi Kaydet ve Girişe İlerle
              <CheckCircle className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Giriş Paneline Geri Dön
              </button>
            </div>
          </form>
        )}

      </div>

      {/* REVOLUTIONARY DEVELOPER INTEGRATION TRAY (SANDBOX) */}
      <div className="max-w-md w-full mt-8">
        <div className={`p-4 rounded-xl border font-mono text-[11px] ${
          isDark ? "bg-[#0b101e]/80 border-slate-800 text-slate-400" : "bg-white/90 border-slate-250 text-slate-600"
        } shadow-lg`}>
          <div className="flex items-center justify-between border-b pb-2 mb-2 border-dashed border-slate-700">
            <span className="flex items-center gap-1 text-amber-500 font-extrabold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              SİSTEM ENTEGRASYON SİMÜLASYONU
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-bold uppercase">
              Debug Modu
            </span>
          </div>

          <p className="mb-2 text-[10px]">
             Hızlı test edebilmeniz için <b>SMTP & Veritabanı fihristi</b> simülasyonu aşağıdadır. Doğrudan tıklayıp kopyalayabilirsiniz:
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-950 p-2 rounded border border-slate-850/60 text-slate-300">
            <div>
              <p className="text-slate-500 font-bold text-[9px]">SELİM DAL (ADMIN):</p>
              <button 
                onClick={() => { setEmail("dalgrup@gmail.com"); setPassword("Selim.1234"); setPortalRole("admin"); }}
                className="text-left w-full hover:text-amber-400 truncate outline-none"
              >
                📧 dalgrup@gmail.com / 🔑 Selim.1234
              </button>
            </div>
            <div>
              <p className="text-slate-500 font-bold text-[9px]">MURAT YILMAZ (MÜŞTERİ):</p>
              <button 
                onClick={() => { setEmail("customer@dalgrup.com"); setPassword("customer"); setPortalRole("customer"); }}
                className="text-left w-full hover:text-amber-400 truncate outline-none"
              >
                📧 customer@dalgrup.com / 🔑 customer
              </button>
            </div>
          </div>

          {/* SIMULATED MAILS TRACTION */}
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Gelen Mail Kutusu / Üretilen Tokenler:
            </p>
            {developerLog.length === 0 ? (
              <p className="italic text-[10px] text-slate-600">
                Henüz kayıt veya şifre sıfırlama işlemi başlatılmadı. Yapılan talepler buraya anında düşer!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {developerLog.map((log, lIdx) => (
                  <div key={lIdx} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                    <div className="flex justify-between font-bold text-amber-500 mb-0.5 text-[9px]">
                      <span>{log.type === "reset" ? "🔑 ŞİFRE SIFIRLA MAİLİ" : "✉️ E-POSTA DOĞRULAMA MAİLİ"}</span>
                      <span className="text-slate-500">{log.timestamp}</span>
                    </div>
                    <p className="italic">Kime: {log.email}</p>
                    <p className="font-bold flex items-center gap-1 mt-0.5">
                      Sıfırlama Kodu:{" "}
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                        {log.tokenOrCode}
                      </span>
                    </p>
                    {log.link && (
                      <p className="text-slate-500 truncate text-[9px] hover:text-amber-400 mt-0.5 cursor-pointer" onClick={() => { setResetTokenInput(log.tokenOrCode); checkResetView(log.tokenOrCode); }}>
                        Süre: 30 Dk. Link: {log.link} (Doldurmak için tıkla)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );

  function checkResetView(token: string) {
    setView("reset");
    onNotify("Simüle edilen şifre sıfırlama tokenı forma otomatik dolduruldu!", "success");
  }
}
