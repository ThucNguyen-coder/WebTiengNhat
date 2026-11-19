import App from './App';
import ChatWidget from './components/ChatWidget';
import { ProgressProvider } from './lib/store';
import { AuthProvider } from './lib/auth';

export default function Root() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <App />
        <ChatWidget />
      </ProgressProvider>
    </AuthProvider>
  );
}
