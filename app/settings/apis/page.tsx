import { redirect } from 'next/navigation'

export default function APIsSettingsPage() {
  redirect('/settings?tab=apis')
}
