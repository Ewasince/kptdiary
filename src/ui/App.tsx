import { Layout } from './components/Layout';
import { useRoute } from './router';
import { EntryEditor } from './screens/EntryEditor';
import { EntryList } from './screens/EntryList';
import { DiaryProvider } from './useDiary';

function Screen() {
  const route = useRoute();
  return (
    <Layout route={route}>
      {route.name === 'list' && <EntryList />}
      {route.name === 'entry' && <EntryEditor key={route.id} id={route.id} />}
      {/* Placeholder until the export screen (Task 12) lands. */}
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
