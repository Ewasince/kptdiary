import { useSyncExternalStore } from 'react';
import { Layout } from './components/Layout';
import { UpdateToast } from './components/UpdateToast';
import { ErrorBoundary } from './ErrorBoundary';
import { useRoute } from './router';
import { EntryEditor } from './screens/EntryEditor';
import { EntryList } from './screens/EntryList';
import { ExportScreen } from './screens/ExportScreen';
import { getSnapshot, subscribe } from './swState';
import { DiaryProvider } from './useDiary';

function Screen() {
  const route = useRoute();
  return (
    <Layout route={route}>
      {route.name === 'list' && <EntryList />}
      {route.name === 'entry' && <EntryEditor key={route.id} id={route.id} />}
      {route.name === 'export' && <ExportScreen />}
    </Layout>
  );
}

export default function App() {
  const sw = useSyncExternalStore(subscribe, getSnapshot);
  return (
    <DiaryProvider>
      {/* The update toast stays outside: a new version may be the fix for the error. */}
      <ErrorBoundary>
        <Screen />
      </ErrorBoundary>
      <UpdateToast needRefresh={sw.needRefresh} onUpdate={sw.update} />
    </DiaryProvider>
  );
}
