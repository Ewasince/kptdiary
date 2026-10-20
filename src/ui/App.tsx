import { Layout } from './components/Layout';
import { useRoute } from './router';
import { EntryList } from './screens/EntryList';
import { DiaryProvider } from './useDiary';

function Screen() {
  const route = useRoute();
  return (
    <Layout route={route}>
      {route.name === 'list' && <EntryList />}
      {/* Placeholders until the editor (Task 11) and export (Task 12) screens land. */}
      {route.name === 'entry' && <p>Запись</p>}
      {route.name === 'export' && <p>Экспорт</p>}
    </Layout>
  );
}

export default function App() {
  return (
    <DiaryProvider>
      <Screen />
    </DiaryProvider>
  );
}
