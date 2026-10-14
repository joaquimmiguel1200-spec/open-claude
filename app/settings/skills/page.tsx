import { redirect } from 'next/navigation'

export default function SkillsSettingsPage() {
  redirect('/settings?tab=skills')
}
