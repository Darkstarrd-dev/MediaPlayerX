import './App.css'
import AppShell from './components/AppShell'
import { useAppController } from './features/app/useAppController'
import { I18nProvider } from './i18n/I18nProvider'

function App() {
  const appShellProps = useAppController()
  return (
    <I18nProvider>
      <AppShell {...appShellProps} />
    </I18nProvider>
  )
}

export default App
