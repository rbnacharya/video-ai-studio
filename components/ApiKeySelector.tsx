import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2 } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  const checkKey = async () => {
    try {
      setChecking(true);
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) {
          onKeySelected();
        }
      } else {
        // Fallback for dev environments without the specific wrapper
        console.warn("window.aistudio not found");
      }
    } catch (e) {
      console.error("Error checking API key", e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (!aistudio) return;
    try {
      await aistudio.openSelectKey();
      await checkKey();
      onKeySelected();
    } catch (e) {
      console.error("Selection failed", e);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm p-4">
      <div className="bg-white border border-zinc-200 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <Key className="w-8 h-8 text-rose-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Kroma Studio Access</h2>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          To generate cinematic videos with Veo 3.1, you need to connect a paid Google Cloud Project API key.
        </p>

        <button
          onClick={handleSelectKey}
          className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 mb-6"
        >
          Select API Key
        </button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-rose-600 flex items-center justify-center gap-1.5 transition-colors font-medium"
        >
          Learn about billing <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ApiKeySelector;