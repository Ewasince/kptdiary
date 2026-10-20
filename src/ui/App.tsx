import { Layout } from './components/Layout';
import { useRoute } from './router';
import { EntryEditor } from './screens/EntryEditor';
import { EntryList } from './screens/EntryList';
import { ExportScreen } from './screens/ExportScreen';
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
  return (
    <DiaryProvider>
      <Screen />
    </DiaryProvider>
  );
}
