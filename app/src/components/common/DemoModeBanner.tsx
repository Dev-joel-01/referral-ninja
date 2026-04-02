import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function DemoModeBanner() {
  const [isConfigured, setIsConfigured] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Check if Supabase is properly configured
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        // If we get a 404 or connection error, Supabase is not configured
        if (error && (error.message.includes('connection') || error.code === '404')) {
          setIsConfigured(false);
        }
      } catch {
        setIsConfigured(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSupabase();
  }, []);

  if (isChecking || isConfigured) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm border-b border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-900" />
            <div>
              <p className="text-yellow-900 font-medium text-sm">
                Demo Mode: Supabase not configured
              </p>
              <p className="text-yellow-800 text-xs">
                Some features may not work. Follow the setup guide to enable full functionality.
              </p>
            </div>
          </div>
          <a
            href="/SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-900 text-yellow-100 rounded-lg text-sm font-medium hover:bg-yellow-800 transition-colors"
          >
            Setup Guide
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
