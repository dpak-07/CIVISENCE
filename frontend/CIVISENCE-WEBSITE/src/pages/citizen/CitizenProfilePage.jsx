import { Save } from "lucide-react";
import { useState } from "react";
import GlassCard from "../../components/common/GlassCard";
import { citizenProfileSeed } from "../../services/mockData";

function CitizenProfilePage() {
  const [profile, setProfile] = useState(citizenProfileSeed);
  const [saved, setSaved] = useState(false);

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, photo: previewUrl }));
    setSaved(false);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setSaved(true);
  };

  return (
    <div className="max-w-4xl">
      <GlassCard hover={false}>
        <h3 className="text-xl font-semibold">Citizen profile</h3>
        <p className="mt-1 text-sm text-slate-300">Update your details and profile photo.</p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <img
              src={profile.photo}
              alt="Profile"
              className="h-48 w-full rounded-2xl border border-white/15 object-cover"
            />
            <label className="block rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-sm">
              Upload Photo
              <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
            </label>
          </div>

          <div className="grid gap-3">
            <input
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Full name"
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2"
            />
            <input
              type="email"
              value={profile.email}
              onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2"
            />
            <input
              value={profile.phone}
              onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Phone"
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2"
            />
            <input
              value={profile.ward}
              onChange={(event) => setProfile((prev) => ({ ...prev, ward: event.target.value }))}
              placeholder="Ward"
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2"
            />
            <textarea
              value={profile.address}
              onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
              rows={3}
              placeholder="Address"
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 font-semibold text-slate-950"
            >
              <Save className="h-4 w-4" />
              Save Profile
            </button>

            {saved ? <p className="text-sm text-emerald-200">Profile updated successfully.</p> : null}
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

export default CitizenProfilePage;
