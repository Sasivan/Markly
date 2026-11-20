import { createSignal, onMount } from 'solid-js'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherInput from '../dither-kit/solid/DitherInput'
import { db } from '../data/db'
import type { ProfilePreferences } from '../domain/types'

export default function Profile() {
  const [displayName, setDisplayName] = createSignal('Archive Explorer')
  const [theme, setTheme] = createSignal<'dark' | 'light'>('dark')
  const [motion, setMotion] = createSignal<'standard' | 'reduced'>('standard')
  const [density, setDensity] = createSignal<'comfortable' | 'compact'>('comfortable')
  const [avatarSeed, setAvatarSeed] = createSignal(42)
  const [saved, setSaved] = createSignal(false)

  onMount(async () => {
    const prefs = await db.getPreferences()
    setDisplayName(prefs.displayName)
    setTheme(prefs.theme)
    setMotion(prefs.motionPreference)
    setDensity(prefs.densityPreference)
    setAvatarSeed(prefs.avatarSeed)
  })

  const handleSave = async () => {
    const updated: ProfilePreferences = {
      displayName: displayName(),
      theme: theme(),
      motionPreference: motion(),
      densityPreference: density(),
      avatarSeed: avatarSeed(),
      updatedAt: new Date().toISOString(),
    }
    await db.savePreferences(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div class="p-6 max-w-3xl mx-auto space-y-8">
      <div class="pb-4 border-b border-border">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Profile & Workspace Preferences</h1>
        <p class="text-xs text-muted-foreground font-mono">
          Local user preferences stored entirely in browser storage
        </p>
      </div>

      <div class="p-6 rounded-xl border border-border bg-card space-y-6 shadow-sm">
        {/* User Identity */}
        <div class="flex items-center gap-4 pb-4 border-b border-border/50">
          <div class="size-14 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center font-bold text-lg text-accent font-mono">
            {displayName().slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div class="font-semibold text-base text-foreground">{displayName()}</div>
            <div class="text-xs text-muted-foreground font-mono">Local Archive Identity • Seed #{avatarSeed()}</div>
          </div>
        </div>

        {/* Form Fields */}
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-medium text-foreground">Display Name</label>
            <DitherInput
              value={displayName()}
              onInput={(e) => setDisplayName(e.currentTarget.value)}
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">Theme Mode</label>
              <select
                value={theme()}
                onChange={(e) => setTheme(e.currentTarget.value as any)}
                class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="dark">Dark (Dither Near-Black)</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">Motion Preference</label>
              <select
                value={motion()}
                onChange={(e) => setMotion(e.currentTarget.value as any)}
                class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="standard">Standard Motion</option>
                <option value="reduced">Reduced Motion (prefers-reduced-motion)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">UI Density</label>
              <select
                value={density()}
                onChange={(e) => setDensity(e.currentTarget.value as any)}
                class="w-full h-10 px-3 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-foreground">Avatar Seed</label>
              <DitherInput
                type="number"
                value={String(avatarSeed())}
                onInput={(e) => setAvatarSeed(Number(e.currentTarget.value) || 42)}
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-border/50">
          <div class="text-xs text-accent font-mono">{saved() ? 'Preferences saved ✓' : ''}</div>
          <DitherButton variant="gradient" onClick={handleSave}>
            Save Preferences
          </DitherButton>
        </div>
      </div>
    </div>
  )
}
