import './App.css'
import AppShell from './components/AppShell'
import { useAppController } from './features/app/useAppController'

function App() {
  const appShellProps = useAppController()
  return <AppShell {...appShellProps} />
}

export default App
