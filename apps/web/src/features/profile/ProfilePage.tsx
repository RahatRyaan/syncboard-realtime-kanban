import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Briefcase,
  MapPin,
  FileText,
  Camera,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { updateProfileApi, uploadAvatar } from '../auth/api';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';

const LIMITS = {
  name: 60,
  jobTitle: 200,
  bio: 300,
  location: 80,
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function initialsOf(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}

function ProfileField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  maxLength,
  placeholder,
  multiline,
  hint,
}: FieldProps) {
  const remaining = maxLength - value.length;
  const nearLimit = remaining <= 30;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-content-secondary flex items-center gap-1.5"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </label>
        <span
          className={`text-[11px] tabular-nums ${
            nearLimit ? 'text-amber-500' : 'text-content-faint'
          }`}
        >
          {remaining}
        </span>
      </div>

      {multiline ? (
        <textarea
          id={id}
          rows={3}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 bg-surface-sunken border border-line rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm resize-y"
        />
      ) : (
        <input
          id={id}
          type="text"
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 bg-surface-sunken border border-line rounded-xl text-content-primary placeholder-content-faint focus-ring transition-all text-sm"
        />
      )}

      {hint && <p className="mt-1 text-xs text-content-faint">{hint}</p>}
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setJobTitle(user.jobTitle || '');
    setLocation(user.location || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const isDirty =
    name !== (user?.name || '') ||
    jobTitle !== (user?.jobTitle || '') ||
    location !== (user?.location || '') ||
    bio !== (user?.bio || '') ||
    avatarUrl !== (user?.avatarUrl || '');

  const handleAvatarFile = async (file: File) => {
    setMessage(null);

    if (!AVATAR_TYPES.includes(file.type)) {
      setMessage({ kind: 'err', text: 'Choose a JPEG, PNG, or WebP image.' });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setMessage({ kind: 'err', text: 'Image must be 2 MB or smaller.' });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateProfileApi({ avatarUrl: url });
      setAvatarUrl(url);
      await refreshProfile();
      setMessage({ kind: 'ok', text: 'Profile picture updated.' });
    } catch (err: any) {
      setMessage({
        kind: 'err',
        text: err.message || 'Could not upload the image. Please try again.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setMessage(null);
    try {
      // The field is optional, so clearing it to an empty string is the
      // supported way to reset to initials.
      await updateProfileApi({ avatarUrl: '' });
      setAvatarUrl('');
      await refreshProfile();
      setMessage({ kind: 'ok', text: 'Profile picture removed.' });
    } catch (err: any) {
      setMessage({ kind: 'err', text: err.message || 'Could not remove the image.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (name.trim().length < 2) {
      setMessage({ kind: 'err', text: 'Name must be at least 2 characters.' });
      return;
    }

    setMessage(null);
    setIsSaving(true);
    try {
      await updateProfileApi({
        name: name.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        bio: bio.trim(),
      });
      await refreshProfile();
      setMessage({ kind: 'ok', text: 'Profile saved.' });
    } catch (err: any) {
      setMessage({ kind: 'err', text: err.message || 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-content-primary">
      <header className="border-b border-line bg-panel/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-content-muted hover:text-content-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to workspace
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Your profile</h1>
          <p className="text-sm text-content-muted">
            This information is shown to teammates across your workspaces.
          </p>
        </div>

        {message && (
          <div
            role={message.kind === 'err' ? 'alert' : 'status'}
            className={`p-3 border text-sm rounded-xl flex items-start gap-2 ${
              message.kind === 'err'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
            }`}
          >
            {message.kind === 'err' ? (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Avatar */}
        <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-content-primary">Profile picture</h2>

          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${user?.name || 'User'} profile picture`}
                  className="w-20 h-20 rounded-2xl object-cover border border-line"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 border border-line flex items-center justify-center text-white text-xl font-black"
                  aria-hidden="true"
                >
                  {initialsOf(name || user?.email || 'U')}
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 rounded-2xl bg-surface/70 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                id="avatar-input"
                type="file"
                accept={AVATAR_TYPES.join(',')}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarFile(file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  {avatarUrl ? 'Replace' : 'Upload'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3.5 py-2 bg-panel hover:bg-panel-hover text-content-secondary text-xs font-semibold rounded-xl border border-line transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-content-faint">
                JPEG, PNG, or WebP. Max 2 MB.
              </p>
            </div>
          </div>
        </section>

        {/* Details */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-content-primary">Details</h2>

            <ProfileField
              id="profile-name"
              label="Full name"
              icon={User}
              value={name}
              onChange={setName}
              maxLength={LIMITS.name}
              placeholder="Alex Smith"
            />

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 bg-surface-sunken border border-line rounded-xl text-content-faint text-sm cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-content-faint">
                Email is your sign-in identity and cannot be changed here.
              </p>
            </div>

            <ProfileField
              id="profile-title"
              label="Job title"
              icon={Briefcase}
              value={jobTitle}
              onChange={setJobTitle}
              maxLength={LIMITS.jobTitle}
              placeholder="Product Designer"
            />

            <ProfileField
              id="profile-location"
              label="Location"
              icon={MapPin}
              value={location}
              onChange={setLocation}
              maxLength={LIMITS.location}
              placeholder="Berlin, Germany"
            />

            <ProfileField
              id="profile-bio"
              label="Bio"
              icon={FileText}
              value={bio}
              onChange={setBio}
              maxLength={LIMITS.bio}
              placeholder="A short introduction about yourself"
              multiline
            />
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2.5 bg-panel hover:bg-panel-hover text-content-secondary text-sm font-semibold rounded-xl border border-line transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
