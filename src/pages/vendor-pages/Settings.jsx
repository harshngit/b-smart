import { useState } from "react";
import { useSelector } from "react-redux";
import { Lock, ShieldCheck, UserPlus, UserCog, Mail, MessageSquare, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const Toggle = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-pink-600 transition-colors" />
    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-5" />
  </label>
);

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 placeholder-gray-400 dark:placeholder-gray-600 transition-all"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

export default function Settings() {
  const { userObject } = useSelector((state) => state.auth);
  const userId = userObject?._id || userObject?.id;

  // ── Password state ──────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  // ── Other state ─────────────────────────────────────────────────────────────
  const [twoFA, setTwoFA] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [subUserEmail, setSubUserEmail] = useState("");
  const [role, setRole] = useState("viewer");

  const handleChangePassword = async () => {
    setPwdError(""); setPwdSuccess("");

    // Client-side validation
    if (!passwords.current.trim()) { setPwdError("Current password is required."); return; }
    if (!passwords.newPass.trim()) { setPwdError("New password is required."); return; }
    if (passwords.newPass.length < 6) { setPwdError("New password must be at least 6 characters."); return; }
    if (passwords.newPass !== passwords.confirm) { setPwdError("New passwords do not match."); return; }

    setPwdLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://api.bebsmart.in/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.newPass,
          user_id: userId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPwdSuccess("Password updated successfully!");
        setPasswords({ current: "", newPass: "", confirm: "" });
        setTimeout(() => setPwdSuccess(""), 4000);
      } else {
        setPwdError(data?.message || data?.error || "Failed to update password. Please try again.");
      }
    } catch {
      setPwdError("Network error. Please check your connection and try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-red-500 to-pink-600">
              Settings
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage account security, permissions, and communications.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
            </div>

            {/* Feedback banners */}
            {pwdSuccess && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-semibold mb-4">
                <CheckCircle2 size={15} /> {pwdSuccess}
              </div>
            )}
            {pwdError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-semibold mb-4">
                <AlertCircle size={15} /> {pwdError}
              </div>
            )}

            <div className="space-y-3">
              <PasswordInput
                value={passwords.current}
                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Current Password"
              />
              <PasswordInput
                value={passwords.newPass}
                onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                placeholder="New Password"
              />
              <PasswordInput
                value={passwords.confirm}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Confirm New Password"
              />

              {/* Strength hint */}
              {passwords.newPass && (
                <div className="flex items-center gap-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                      passwords.newPass.length >= i * 3
                        ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {passwords.newPass.length < 4 ? 'Weak' : passwords.newPass.length < 7 ? 'Fair' : passwords.newPass.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={pwdLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pwdLoading ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : "Update Password"}
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Enable 2FA</div>
                <div className="text-sm text-gray-500">Add an extra layer of security to your account.</div>
              </div>
              <Toggle checked={twoFA} onChange={e => setTwoFA(e.target.checked)} />
            </div>
            <div className="mt-3 text-xs text-gray-500">Use an authenticator app to complete setup.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Sub Users */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Sub Users</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={subUserEmail}
                onChange={e => setSubUserEmail(e.target.value)}
                placeholder="user@company.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 placeholder-gray-400 dark:placeholder-gray-600"
              />
              <button className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 font-bold text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Invite
              </button>
            </div>
            <div className="mt-5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assign Role</div>
              <div className="grid grid-cols-3 gap-3">
                {["Viewer", "Editor", "Admin"].map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r.toLowerCase())}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${role === r.toLowerCase() ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" : "border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Communication Preferences */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <UserCog className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Communication Preferences</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">Email Alerts</div>
                    <div className="text-xs text-gray-500">Receive updates and campaign notifications.</div>
                  </div>
                </div>
                <Toggle checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">SMS Alerts</div>
                    <div className="text-xs text-gray-500">Get important notifications on your phone.</div>
                  </div>
                </div>
                <Toggle checked={smsAlerts} onChange={e => setSmsAlerts(e.target.checked)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}