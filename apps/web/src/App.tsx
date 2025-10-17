import { useState, useEffect } from 'react';
import { supabase } from './api/supabase';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🎓 kplan - Tweet Learning Path Tool</h1>
      <p>Organize tweets into learning paths using the Feynman technique</p>

      {!session ? (
        <div style={{ marginTop: '2rem' }}>
          <h2>Welcome!</h2>
          <p>Sign in to start organizing your learning journey.</p>
          <button
            onClick={handleSignIn}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Sign in with GitHub
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <h2>Welcome back, {session.user.email}!</h2>
          <p>User ID: {session.user.id}</p>
          
          <div style={{ marginTop: '2rem' }}>
            <h3>🚀 Next Steps:</h3>
            <ul>
              <li>The API is ready at: {import.meta.env.VITE_API_URL}</li>
              <li>Start creating tweets and organizing them into learning paths</li>
              <li>Use the Feynman technique to learn concepts systematically</li>
            </ul>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      <div style={{ marginTop: '3rem', padding: '1rem', background: '#f5f5f5', borderRadius: '0.5rem' }}>
        <h3>📚 Features</h3>
        <ul>
          <li>Analyze tweets with AI-powered summaries</li>
          <li>Tag tweets as "learn" or "repurpose"</li>
          <li>Organize into learning paths with labels</li>
          <li>Use Feynman technique: Explain, Identify gaps, Simplify</li>
          <li>Get AI suggestions for knowledge gaps</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
