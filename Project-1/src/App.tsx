import { onMount } from 'solid-js'
import { Router, Route, type RouteSectionProps } from '@solidjs/router'
import AppShell from './components/layout/AppShell'
import Home from './pages/Home'
import Library from './pages/Library'
import Favorites from './pages/Favorites'
import Recent from './pages/Recent'
import Stash from './pages/Stash'
import FolderView from './pages/FolderView'
import Analytics from './pages/Analytics'
import Trash from './pages/Trash'
import Feedback from './pages/Feedback'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Lab from './pages/Lab'
import NotFound from './pages/NotFound'
import { db } from './data/db'

export default function App() {
  onMount(async () => {
    const seeded = await db.seedIfEmpty()
    if (seeded) {
      window.dispatchEvent(new CustomEvent('markly:data-changed'))
    }
  })

  return (
    <Router root={(props: RouteSectionProps) => <AppShell>{props.children}</AppShell>}>
      <Route path="/" component={Home} />
      <Route path="/library" component={Library} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/recent" component={Recent} />
      <Route path="/stash" component={Stash} />
      <Route path="/folders/:folderId" component={FolderView} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/trash" component={Trash} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/lab" component={Lab} />
      <Route path="*404" component={NotFound} />
    </Router>
  )
}
