import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './AppContext'
import { Shell } from './Shell'
import { TestPage } from '../features/test/TestPage'
import { PracticePage } from '../features/practice/PracticePage'
import { PracticeRunPage } from '../features/practice/PracticeRunPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<TestPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="practice/:id" element={<PracticeRunPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
