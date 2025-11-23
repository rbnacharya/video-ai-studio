'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Aperture, Sparkles, User, Settings2, Video as VideoIcon, Plus, Trash2, Loader2, Folder, ArrowLeft, Calendar, Film, LogOut, Coins } from 'lucide-react';
import Timeline from './Timeline';
import Auth from './Auth';
import Pricing from './Pricing';
import { Project, Scene, UserProfile } from '../types';
import { generateScriptScenes, generateCharacterImage, generateVideoClip } from '../services/gemini';
import { subscribeToUserProfile, signOut, deductCredits } from '../services/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Credit Costs
const COSTS = {
  SCRIPT: 10,
  CHARACTER: 25,
  VIDEO: 150
};

const Studio: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  // Project Management State
  const [projects, setProjects] = useState<Project[]>(() => {
    // Check if window is defined for SSR safety
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kroma_studio_projects');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Auth Listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mock = localStorage.getItem('kroma_mock_user');
      if (mock) {
        setUser(JSON.parse(mock));
      }
    }

    try {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
      });
      return () => unsubscribe();
    } catch (e) {
      // Mock mode fallback
    }
  }, []);

  // Profile Listener
  useEffect(() => {
    if (user?.uid) {
      const unsub = subscribeToUserProfile(user.uid, (p) => setProfile(p));
      return () => unsub();
    } else {
      setProfile(null);
    }
  }, [user]);

  // Persist projects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kroma_studio_projects', JSON.stringify(projects));
    }
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const updateCurrentProject = (updates: Partial<Project>) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => 
      p.id === currentProjectId 
        ? { ...p, ...updates, lastModified: Date.now() } 
        : p
    ));
  };

  const createProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName,
      createdAt: Date.now(),
      lastModified: Date.now(),
      step: 'script',
      scriptPrompt: '',
      scenes: [],
      characterPrompt: '',
      characterImageBase64: null,
      aspectRatio: '16:9'
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setNewProjectName('');
    setShowNewProjectModal(false);
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) setCurrentProjectId(null);
    }
  };

  // --- GENERATION HANDLERS WITH CREDIT CHECKS ---

  const checkCredits = (cost: number) => {
    if (!profile) return false;
    if (profile.credits < cost) {
      setShowPricing(true);
      return false;
    }
    return true;
  };

  const handleGenerateScript = async () => {
    if (!currentProject || !currentProject.scriptPrompt || !user) return;
    
    if (!checkCredits(COSTS.SCRIPT)) return;

    setLoading(true);
    setError(null);
    try {
      await deductCredits(user.uid, COSTS.SCRIPT);
      const scenes = await generateScriptScenes(currentProject.scriptPrompt);
      updateCurrentProject({ scenes, step: 'character' });
    } catch (e: any) {
      setError(e.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!currentProject || !currentProject.characterPrompt || !user) return;
    
    if (!checkCredits(COSTS.CHARACTER)) return;

    setLoading(true);
    setError(null);
    try {
      await deductCredits(user.uid, COSTS.CHARACTER);
      const b64 = await generateCharacterImage(currentProject.characterPrompt);
      updateCurrentProject({ characterImageBase64: b64 });
    } catch (e: any) {
      setError(e.message || "Failed to generate character");
    } finally {
      setLoading(false);
    }
  };

  const confirmCharacter = () => {
    updateCurrentProject({ step: 'production' });
  };

  const generateSceneVideo = async (sceneId: string) => {
    if (!currentProject || !user) return;
    
    if (!checkCredits(COSTS.VIDEO)) return;

    const scene = currentProject.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Deduct first
    await deductCredits(user.uid, COSTS.VIDEO);

    // Update status to generating
    updateCurrentProject({
      scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'generating', error: undefined } : s)
    });

    try {
      // Use character image as start frame if available
      const videoUrl = await generateVideoClip(
        scene.description, 
        currentProject.characterImageBase64, 
        currentProject.aspectRatio
      );

      updateCurrentProject({
        scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'completed', videoUrl } : s)
      });
    } catch (e: any) {
      updateCurrentProject({
        scenes: currentProject.scenes.map(s => s.id === sceneId ? { ...s, status: 'error', error: e.message } : s)
      });
    }
  };

  const addScene = () => {
    if (!currentProject) return;
    const newScene: Scene = {
      id: crypto.randomUUID(),
      order: currentProject.scenes.length + 1,
      description: "A new scene description...",
      status: 'pending'
    };
    updateCurrentProject({ scenes: [...currentProject.scenes, newScene] });
  };

  const deleteScene = (id: string) => {
    if (!currentProject) return;
    updateCurrentProject({ scenes: currentProject.scenes.filter(s => s.id !== id) });
  };

  const handleDescriptionChange = (id: string, text: string) => {
    if (!currentProject) return;
    updateCurrentProject({
      scenes: currentProject.scenes.map(s => s.id === id ? { ...s, description: text } : s)
    });
  };

  // --- AUTH CHECK ---
  if (!user) {
    return <Auth />;
  }

  // --- DASHBOARD VIEW ---
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 p-8 overflow-y-auto">
        {showPricing && <Pricing userId={user.uid} onClose={() => setShowPricing(false)} />}
        
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 rotate-3 hover:rotate-6 transition-transform">
                <Aperture className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Kroma</h1>
                <p className="text-zinc-500 text-sm font-medium">AI Director Suite</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                onClick={() => setShowPricing(true)}
                className="cursor-pointer bg-white border border-rose-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Credits</div>
                   <div className="text-sm font-bold text-rose-900 leading-none">{profile?.credits || 0}</div>
                </div>
              </div>

              <div className="relative group">
                 <button className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {profile?.displayName?.[0] || 'U'}
                 </button>
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button onClick={signOut} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                       <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                 </div>
              </div>
            </div>
          </header>

          <div className="flex justify-between items-end mb-8">
            <h2 className="text-xl font-bold text-zinc-800">Your Productions</h2>
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" /> New Project
            </button>
          </div>

          {showNewProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm p-4">
              <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-bold mb-2 text-zinc-900">Create New Project</h2>
                <p className="text-zinc-500 mb-6 text-sm">Start a new video production journey.</p>
                
                <input
                  autoFocus
                  type="text"
                  placeholder="Project Name (e.g. My Sci-Fi Short)"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowNewProjectModal(false)}
                    className="px-5 py-2.5 text-zinc-500 hover:text-zinc-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createProject}
                    disabled={!newProjectName.trim()}
                    className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-24 border border-dashed border-zinc-200 rounded-3xl bg-white/50">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Folder className="w-10 h-10 text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No projects yet</h3>
                <p className="text-zinc-500 mb-8 max-w-xs mx-auto">Create your first video project to start generating scenes with Veo.</p>
                <button 
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-rose-600 hover:text-rose-700 font-semibold hover:underline"
                >
                  Create a Project
                </button>
              </div>
            ) : (
              projects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => setCurrentProjectId(project.id)}
                  className="group relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/50"
                >
                  <div className="aspect-video bg-zinc-100 relative overflow-hidden">
                    {project.characterImageBase64 ? (
                      <img 
                        src={`data:image/png;base64,${project.characterImageBase64}`}
                        alt="Project Thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                        <Aperture className="w-12 h-12 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    )}
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => deleteProject(e, project.id)}
                        className="p-2 bg-white/90 hover:bg-red-50 text-zinc-600 hover:text-red-600 rounded-full shadow-sm backdrop-blur-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-zinc-900 mb-1 truncate">{project.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {new Date(project.lastModified).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                         <Film className="w-3.5 h-3.5 text-zinc-400" />
                         {project.scenes.length} Scenes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                         project.step === 'production' ? 'bg-emerald-50 text-emerald-600' :
                         project.step === 'character' ? 'bg-rose-50 text-rose-600' :
                         'bg-zinc-100 text-zinc-500'
                       }`}>
                         {project.step}
                       </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden">
      {showPricing && <Pricing userId={user.uid} onClose={() => setShowPricing(false)} />}
      
      {/* Sidebar Navigation */}
      <aside className="w-18 md:w-20 border-r border-zinc-200 flex flex-col items-center py-6 bg-white z-20 shadow-sm">
        <button 
          onClick={() => setCurrentProjectId(null)}
          className="w-10 h-10 mb-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
          title="Back to Projects"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-rose-200">
          <Aperture className="w-5 h-5 text-white" />
        </div>
        
        <nav className="flex flex-col gap-8 w-full">
          <NavItem 
            active={currentProject.step === 'script'} 
            icon={<Layout size={20} />} 
            label="Script" 
            onClick={() => updateCurrentProject({ step: 'script' })} 
          />
          <NavItem 
            active={currentProject.step === 'character'} 
            icon={<User size={20} />} 
            label="Cast" 
            onClick={() => updateCurrentProject({ step: 'character' })} 
          />
          <NavItem 
            active={currentProject.step === 'production'} 
            icon={<VideoIcon size={20} />} 
            label="Studio" 
            onClick={() => updateCurrentProject({ step: 'production' })} 
          />
        </nav>

        <div className="mt-auto mb-4 flex flex-col items-center gap-4">
           <button 
             onClick={() => {
                updateCurrentProject({ aspectRatio: currentProject.aspectRatio === '16:9' ? '9:16' : '16:9' });
             }}
             className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200"
             title="Toggle Aspect Ratio"
           >
             <Settings2 size={20} />
             <span className="text-[9px] font-bold mt-0.5 font-mono">{currentProject.aspectRatio}</span>
           </button>

           <div onClick={() => setShowPricing(true)} className="cursor-pointer flex flex-col items-center group">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-xs font-bold border border-rose-100 group-hover:scale-105 transition-transform">
                {profile?.credits}
              </div>
              <span className="text-[9px] font-bold text-zinc-400 mt-1">CREDS</span>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-50">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
             <div className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project</div>
             <h1 className="text-lg font-bold text-zinc-900">{currentProject.name}</h1>
          </div>
          {loading && (
             <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 font-medium animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin" />
               Processing...
             </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 relative">
          
          {error && (
            <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* STEP 1: SCRIPT */}
          {currentProject.step === 'script' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900">The Script</h2>
                <p className="text-zinc-500 font-medium">Draft your vision. Cost: <span className="text-rose-600 font-bold">{COSTS.SCRIPT} Credits</span></p>
              </div>
              
              <div className="bg-white border border-zinc-200 rounded-3xl p-1 shadow-sm focus-within:ring-4 focus-within:ring-rose-100 focus-within:border-rose-300 transition-all">
                <textarea
                  className="w-full bg-transparent border-none text-lg p-6 focus:ring-0 min-h-[240px] resize-none placeholder-zinc-300 text-zinc-900 outline-none rounded-2xl"
                  placeholder="Describe your video concept in detail..."
                  value={currentProject.scriptPrompt}
                  onChange={(e) => updateCurrentProject({ scriptPrompt: e.target.value })}
                />
                <div className="flex justify-between items-center px-4 pb-3 pt-2 border-t border-zinc-50">
                   <div className="flex gap-2 pl-2">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${currentProject.aspectRatio === '16:9' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>16:9</span>
                     <span className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${currentProject.aspectRatio === '9:16' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>9:16</span>
                   </div>
                   <button
                    disabled={loading || !currentProject.scriptPrompt}
                    onClick={handleGenerateScript}
                    className="bg-rose-600 text-white hover:bg-rose-700 px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate ({COSTS.SCRIPT}c)
                  </button>
                </div>
              </div>

              {currentProject.scenes.length > 0 && (
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Scene Breakdown</h3>
                     <span className="text-xs text-zinc-400">{currentProject.scenes.length} Scenes</span>
                  </div>
                  <div className="space-y-3">
                    {currentProject.scenes.map((scene, idx) => (
                      <div key={scene.id} className="group flex gap-4 p-4 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xs text-zinc-500 font-bold font-mono">
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={scene.description}
                          onChange={(e) => handleDescriptionChange(scene.id, e.target.value)}
                          className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm text-zinc-700 placeholder-zinc-400 font-medium"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-6">
                    <button
                      onClick={() => updateCurrentProject({ step: 'character' })}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-zinc-200 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Next: Cast Character
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHARACTER */}
          {currentProject.step === 'character' && (
            <div className="max-w-5xl mx-auto h-full flex flex-col md:flex-row gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex-1 space-y-8">
                <div>
                   <h2 className="text-3xl font-bold mb-2 text-zinc-900">Star Casting</h2>
                   <p className="text-zinc-500 font-medium">Design a character consistency reference. Cost: <span className="text-rose-600 font-bold">{COSTS.CHARACTER} Credits</span></p>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Visual Prompt</label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      className="flex-1 bg-white border border-zinc-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-zinc-900 shadow-sm transition-all"
                      placeholder="e.g. A cyberpunk detective in a neon raincoat, cinematic lighting"
                      value={currentProject.characterPrompt}
                      onChange={(e) => updateCurrentProject({ characterPrompt: e.target.value })}
                    />
                    <button 
                      onClick={handleGenerateCharacter}
                      disabled={loading || !currentProject.characterPrompt}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" /> Generate ({COSTS.CHARACTER}c)
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Scene Context</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {currentProject.scenes.map((s, i) => (
                      <div key={s.id} className="text-sm text-zinc-600 flex gap-4 p-3 bg-zinc-50 rounded-xl">
                         <span className="text-zinc-400 font-bold font-mono">{i+1}</span>
                         <span>{s.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-96 flex flex-col gap-6">
                 <div className="aspect-square w-full bg-white border border-zinc-200 rounded-3xl p-2 shadow-lg">
                    <div className="w-full h-full bg-zinc-50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-100">
                        {currentProject.characterImageBase64 ? (
                        <>
                            <img 
                            src={`data:image/png;base64,${currentProject.characterImageBase64}`} 
                            alt="Character" 
                            className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
                                <div>
                                    <span className="text-white text-lg font-bold block">Lead Character</span>
                                    <span className="text-white/60 text-xs">Generated Reference</span>
                                </div>
                            </div>
                        </>
                        ) : (
                        <div className="text-center p-8 text-zinc-300">
                            <User className="w-16 h-16 mx-auto mb-4 opacity-40" />
                            <span className="text-sm font-medium">Character Preview</span>
                        </div>
                        )}
                    </div>
                 </div>
                 
                 <button 
                   onClick={confirmCharacter}
                   disabled={!currentProject.characterImageBase64}
                   className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-zinc-200 hover:shadow-xl hover:-translate-y-1"
                 >
                   Confirm Casting & Enter Studio
                 </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRODUCTION */}
          {currentProject.step === 'production' && (
            <div className="flex flex-col h-full gap-8 animate-in fade-in duration-500">
              
              {/* Scene Timeline */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6">
                   <div>
                       <h2 className="text-2xl font-bold text-zinc-900">Production Studio</h2>
                       <p className="text-zinc-500 text-sm">Cost per video: <span className="text-rose-600 font-bold">{COSTS.VIDEO} Credits</span></p>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={addScene} className="text-sm font-medium flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-zinc-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Scene
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-hidden bg-zinc-100 rounded-3xl border border-zinc-200 p-8 flex flex-col justify-center relative">
                   <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                   <div className="relative z-10">
                    {currentProject.scenes.length === 0 ? (
                        <div className="text-center text-zinc-400">
                        <p>No scenes in timeline.</p>
                        <button onClick={addScene} className="mt-2 text-rose-600 hover:underline">Add one</button>
                        </div>
                    ) : (
                        <Timeline 
                        scenes={currentProject.scenes} 
                        onGenerate={generateSceneVideo}
                        onDelete={deleteScene}
                        aspectRatio={currentProject.aspectRatio}
                        />
                    )}
                   </div>
                </div>
              </div>

              {/* Character Ref Footer */}
              <div className="h-28 bg-white border border-zinc-200 rounded-2xl p-3 flex gap-5 items-center shadow-sm mx-1">
                 <div className="aspect-square h-full rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0 relative border border-zinc-200">
                    {currentProject.characterImageBase64 ? (
                      <img 
                        src={`data:image/png;base64,${currentProject.characterImageBase64}`} 
                        className="w-full h-full object-cover" 
                        alt="Ref"
                      />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            <User className="w-6 h-6" />
                        </div>
                    )}
                 </div>
                 <div className="flex-1">
                   <h3 className="text-sm font-bold text-zinc-900">Reference Asset</h3>
                   <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                     Using this character reference ensures visual consistency across all generated video scenes.
                   </p>
                 </div>
                 <div className="h-full w-px bg-zinc-100 mx-2"></div>
                 <div className="pr-6 text-right">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Status</div>
                    <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                         <span className="text-sm font-medium text-zinc-700">Studio Active</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex flex-col items-center gap-1.5 py-3 px-2 border-l-2 transition-all duration-300 group ${
      active 
      ? 'border-rose-600 text-rose-600' 
      : 'border-transparent text-zinc-400 hover:text-zinc-900'
    }`}
  >
    <div className={`p-2.5 rounded-xl transition-all duration-300 ${active ? 'bg-rose-50 shadow-sm' : 'group-hover:bg-zinc-100'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-rose-600' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{label}</span>
  </button>
);

export default Studio;