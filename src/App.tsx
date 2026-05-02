import { useState, useCallback, useEffect } from 'react';
import { Twitter, Linkedin, Instagram, Sparkles, Loader2, RefreshCcw, Send, CheckCircle2, AlertCircle, Save, Calendar, Edit2, Check, Share2, BarChart2, Clock, FileText, Smile, Image as ImageIcon, Settings as SettingsIcon, X, ChevronDown } from 'lucide-react';
import { generateDrafts, generateImage, regenerateCaption, GeneratedDrafts, AppSettings } from './services/gemini';
import logo from './resources/OmniSocialLogo.png';

type Tone = 'professional' | 'witty' | 'urgent';

interface PlatformContent {
  post: string;
  imagePrompt: string;
  imageUrl?: string;
  loadingImage?: boolean;
  imageError?: string;
  loadingCaption?: boolean;
  useEmojis?: boolean;
}

export default function App() {
  const [idea, setIdea] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [hashtags, setHashtags] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [audience, setAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [content, setContent] = useState<Record<'twitter' | 'linkedin' | 'instagram', PlatformContent | null>>({
    twitter: null,
    linkedin: null,
    instagram: null
  });

  const [savedPosts, setSavedPosts] = useState<{platform: string, post: string, imageUrl?: string, scheduledAt?: string}[]>([]);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('omnisocial_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      model: 'gemini-3-flash-preview',
      apiKey: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('omnisocial_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const saved = localStorage.getItem('omnisocial_saved_posts');
    if (saved) {
      try {
        setSavedPosts(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const savePost = (postToSave: {platform: string, post: string, imageUrl?: string, scheduledAt?: string}) => {
    const newSaved = [...savedPosts, postToSave];
    setSavedPosts(newSaved);
    localStorage.setItem('omnisocial_saved_posts', JSON.stringify(newSaved));
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    
    setIsGeneratingDrafts(true);
    setDraftError(null);
    setContent({ twitter: null, linkedin: null, instagram: null });
    
    try {
      const drafts = await generateDrafts(idea, tone, hashtags, true, settings, audience, brandVoice);
      const applyLink = (text: string) => customLink.trim() ? `${text}\n\n${customLink.trim()}` : text;
      
      setContent({
        twitter: { ...drafts.twitter, post: applyLink(drafts.twitter.post), loadingImage: true, useEmojis: true },
        linkedin: { ...drafts.linkedin, post: applyLink(drafts.linkedin.post), loadingImage: true, useEmojis: true },
        instagram: { ...drafts.instagram, post: applyLink(drafts.instagram.post), loadingImage: true, useEmojis: true }
      });
      setIsGeneratingDrafts(false);

      // Fire off image generation in parallel
      generatePlatformImage('twitter', drafts.twitter.imagePrompt, '16:9');
      generatePlatformImage('linkedin', drafts.linkedin.imagePrompt, '4:3');
      generatePlatformImage('instagram', drafts.instagram.imagePrompt, '1:1');
      
    } catch (err: any) {
      setDraftError(err.message || 'Failed to generate drafts. Please try again.');
      setIsGeneratingDrafts(false);
    }
  };

  const generatePlatformImage = async (platform: 'twitter' | 'linkedin' | 'instagram', prompt: string, ratio: '16:9' | '4:3' | '1:1') => {
    try {
      const imageUrl = await generateImage(prompt, ratio, settings);
      setContent(prev => ({
        ...prev,
        [platform]: { ...prev[platform]!, imageUrl, loadingImage: false }
      }));
    } catch (err: any) {
      console.error(`Failed to generate image for ${platform}:`, err);
      setContent(prev => ({
        ...prev,
        [platform]: { ...prev[platform]!, imageError: 'Image gen failed', loadingImage: false }
      }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegenerateCaption = async (platform: 'twitter' | 'linkedin' | 'instagram', emojiOverride?: boolean) => {
    if (!content[platform]) return;
    const currentUseEmojis = emojiOverride !== undefined ? emojiOverride : (content[platform]!.useEmojis ?? true);
    
    setContent(p => ({
      ...p,
      [platform]: { ...p[platform]!, loadingCaption: true, useEmojis: currentUseEmojis }
    }));
    
    try {
      const draft = await regenerateCaption(idea, tone, platform, hashtags, currentUseEmojis, settings, audience, brandVoice);
      const applyLink = (text: string) => customLink.trim() ? `${text}\n\n${customLink.trim()}` : text;
      
      setContent(p => ({
        ...p,
        [platform]: { ...p[platform]!, post: applyLink(draft.post), imagePrompt: draft.imagePrompt, loadingCaption: false }
      }));
    } catch (err: any) {
      console.error(err);
      setContent(p => ({
        ...p,
        [platform]: { ...p[platform]!, loadingCaption: false }
      }));
    }
  };

  const handleRegenerateImage = async (platform: 'twitter' | 'linkedin' | 'instagram') => {
    if (!content[platform]) return;
    setContent(p => ({
      ...p,
      [platform]: { ...p[platform]!, loadingImage: true, imageError: undefined }
    }));
    const ratio = platform === 'twitter' ? '16:9' : platform === 'linkedin' ? '4:3' : '1:1';
    await generatePlatformImage(platform, content[platform]!.imagePrompt, ratio);
  };

  const getAnalytics = () => {
    const now = new Date();
    const scheduled = savedPosts.filter(p => p.scheduledAt && new Date(p.scheduledAt) > now).length;
    const published = savedPosts.filter(p => p.scheduledAt && new Date(p.scheduledAt) <= now).length;
    const drafts = savedPosts.filter(p => !p.scheduledAt).length;
    return { scheduled, published, drafts, total: savedPosts.length };
  };
  const stats = getAnalytics();

  return (
    <div className="min-h-screen bg-base-100 flex flex-col font-sans selection:bg-primary/20 selection:text-primary" data-theme="light">
      {/* Header */}
      <header className="navbar bg-base-100 text-base-content border-b border-base-200 sticky top-0 z-30 px-4 md:px-8 shadow-sm">
        <div className="flex-1">
          <img 
            src={logo} 
            alt="OmniSocial Logo" 
            className="h-10 md:h-20 w-auto cursor-pointer hover:scale-100 transition-transform" 
            onClick={() => window.location.reload()} 
          />
        </div>
        <div className="flex-none gap-4">
          <div className="hidden md:flex flex-col items-end opacity-60">
            <div className="text-[10px] font-bold uppercase tracking-wider">Model</div>
            <div className="text-xs font-medium">{settings.model}</div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="btn btn-ghost btn-circle"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-0 overflow-hidden">
            <div className="bg-base-200 p-6 flex items-center justify-between border-b border-base-300">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Application Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="btn btn-sm btn-ghost btn-square"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs uppercase text-base-content/60">Gemini AI Model</span>
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  <option value="gemini-3-flash-preview">Gemini Flash (Default)</option>
                  <option value="gemini-3.1-pro-preview">Gemini Pro (Smartest)</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Fastest)</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50 italic">Flash is recommended for most task.</span>
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs uppercase text-base-content/60">Custom API Key (Optional)</span>
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                  placeholder="Paste your Gemini API key..."
                  className="input input-bordered w-full font-mono"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50 italic">Leave blank to use the system default key.</span>
                </label>
              </div>

              <div className="modal-action mt-0 flex flex-col">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="btn btn-primary w-full"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
        </div>
      )}

      {/* Main Control Panel */}
      <div className="bg-base-100 border-b border-base-300 py-8 px-4 md:px-8 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 w-full form-control">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-xs uppercase text-base-content/60">What's the idea?</span>
              </label>
              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. We just launched a new feature that lets users export data to CSV."
                className="input input-bordered w-full h-12 focus:input-primary shadow-sm"
                onKeyDown={(e) => e.key === 'Enter' && !isGeneratingDrafts && handleGenerate()}
              />
            </div>
            <div className="w-full lg:w-72">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-xs uppercase text-base-content/60">Desired Tone</span>
              </label>
              <div className="join w-full">
                {(['professional', 'witty', 'urgent'] as Tone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`join-item flex-1 btn btn-sm h-12 transition-all ${
                      tone === t 
                        ? 'btn-primary' 
                        : 'btn-ghost bg-base-200'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!idea.trim() || isGeneratingDrafts}
              className="btn btn-primary w-full lg:w-auto px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all transform active:scale-95"
            >
              {isGeneratingDrafts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {isGeneratingDrafts ? 'Generating' : 'Generate All'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-base-200 rounded-2xl shadow-inner border border-base-300">
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-[10px] uppercase text-base-content/50">Target Audience</span>
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="CEO, Creators..."
                className="input input-bordered input-sm h-10 w-full"
              />
            </div>
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-[10px] uppercase text-base-content/50">Brand Voice</span>
              </label>
              <input
                type="text"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="Bold, Sarcastic..."
                className="input input-bordered input-sm h-10 w-full"
              />
            </div>
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-[10px] uppercase text-base-content/50">Hashtags (Insta)</span>
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#startup #tech"
                className="input input-bordered input-sm h-10 w-full"
              />
            </div>
            <div className="form-control">
              <label className="label pt-0">
                <span className="label-text-alt font-bold text-[10px] uppercase text-base-content/50">Custom Link</span>
              </label>
              <input
                type="text"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="https://..."
                className="input input-bordered input-sm h-10 w-full"
              />
            </div>
          </div>
        </div>
        {draftError && (
          <div className="max-w-7xl mx-auto mt-6 alert alert-error shadow-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{draftError}</span>
          </div>
        )}
      </div>

      {/* Generated Outputs Grid */}
      <main className="flex-1 p-6 flex flex-col">
        {!content.twitter && !isGeneratingDrafts ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="card bg-base-100 shadow-xl border border-base-300 max-w-lg w-full">
              <div className="card-body items-center text-center py-16">
                <div className="bg-base-200 p-6 rounded-full mb-6">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <h2 className="card-title text-2xl font-black italic">Waiting for inspiration</h2>
                <p className="opacity-60 text-sm leading-relaxed mt-2">
                  Enter your idea above and we'll automatically craft platform-specific posts and imagery using Google's most powerful AI models.
                </p>
                <div className="card-actions mt-8">
                  <div className="badge badge-outline gap-2 p-3 font-bold text-[10px] uppercase">
                    <Twitter className="w-3 h-3" strokeWidth={3} /> Twitter
                  </div>
                  <div className="badge badge-outline gap-2 p-3 font-bold text-[10px] uppercase">
                    <Linkedin className="w-3 h-3" strokeWidth={3} /> LinkedIn
                  </div>
                  <div className="badge badge-outline gap-2 p-3 font-bold text-[10px] uppercase">
                    <Instagram className="w-3 h-3" strokeWidth={3} /> Instagram
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full max-w-7xl mx-auto w-full">
            {/* Twitter */}
            {(isGeneratingDrafts || content.twitter) && (
              <PostCard 
                platform="twitter" 
                title="Twitter Short & Punchy"
                icon={Twitter} 
                content={content.twitter} 
                isLoadingDraft={isGeneratingDrafts}
                onContentChange={(val) => setContent(p => ({ ...p, twitter: { ...p.twitter!, post: val } }))}
                onSave={(scheduledAt) => content.twitter && savePost({ platform: 'twitter', post: content.twitter.post, imageUrl: content.twitter.imageUrl, scheduledAt })}
                onCopy={() => copyToClipboard(content.twitter!.post)}
                onRegenerateCaption={(useEmojis) => handleRegenerateCaption('twitter', useEmojis)}
                onRegenerateImage={() => handleRegenerateImage('twitter')}
                aspectRatio="aspect-video"
                aspectText="16:9 ASPECT"
              />
            )}
            
            {/* LinkedIn */}
            {(isGeneratingDrafts || content.linkedin) && (
              <PostCard 
                platform="linkedin"
                title="LinkedIn Long-form"
                icon={Linkedin} 
                content={content.linkedin} 
                isLoadingDraft={isGeneratingDrafts}
                onContentChange={(val) => setContent(p => ({ ...p, linkedin: { ...p.linkedin!, post: val } }))}
                onSave={(scheduledAt) => content.linkedin && savePost({ platform: 'linkedin', post: content.linkedin.post, imageUrl: content.linkedin.imageUrl, scheduledAt })}
                onCopy={() => copyToClipboard(content.linkedin!.post)}
                onRegenerateCaption={(useEmojis) => handleRegenerateCaption('linkedin', useEmojis)}
                onRegenerateImage={() => handleRegenerateImage('linkedin')}
                aspectRatio="aspect-[4/3]"
                aspectText="4:3 ASPECT"
              />
            )}
            
            {/* Instagram */}
            {(isGeneratingDrafts || content.instagram) && (
              <PostCard 
                platform="instagram"
                title="Instagram Visual"
                icon={Instagram} 
                content={content.instagram} 
                isLoadingDraft={isGeneratingDrafts}
                onContentChange={(val) => setContent(p => ({ ...p, instagram: { ...p.instagram!, post: val } }))}
                onSave={(scheduledAt) => content.instagram && savePost({ platform: 'instagram', post: content.instagram.post, imageUrl: content.instagram.imageUrl, scheduledAt })}
                onCopy={() => copyToClipboard(content.instagram!.post)}
                onRegenerateCaption={(useEmojis) => handleRegenerateCaption('instagram', useEmojis)}
                onRegenerateImage={() => handleRegenerateImage('instagram')}
                aspectRatio="aspect-square"
                aspectText="1:1 ASPECT"
              />
            )}
          </div>
        )}

        {savedPosts.length > 0 && (
          <div className="max-w-7xl mx-auto w-full mt-12 mb-8">
            {/* Analytics Section */}
            <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100 w-full mb-8 border border-base-300">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <BarChart2 className="w-8 h-8" />
                </div>
                <div className="stat-title font-bold uppercase text-[10px]">Total Posts</div>
                <div className="stat-value text-primary">{stats.total}</div>
                <div className="stat-desc">Across all platforms</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="stat-title font-bold uppercase text-[10px]">Scheduled</div>
                <div className="stat-value text-secondary">{stats.scheduled}</div>
                <div className="stat-desc">Waiting to publish</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-accent">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="stat-title font-bold uppercase text-[10px]">Drafts</div>
                <div className="stat-value text-accent">{stats.drafts}</div>
                <div className="stat-desc">Saved as local drafts</div>
              </div>
            </div>

            <div className="bg-base-100 p-8 rounded-3xl border border-base-300 shadow-sm">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <div className="w-2 h-8 bg-primary rounded-full"></div>
                Library
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPosts.map((sp, i) => {
                  const isPublished = sp.scheduledAt && new Date(sp.scheduledAt) <= new Date();
                  return (
                    <div key={i} className="card bg-base-200 shadow-sm hover:shadow-md transition-all border border-base-300 group">
                      <div className="card-body p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-8">
                                 {sp.platform === 'twitter' && <Twitter className="w-4 h-4" />}
                                 {sp.platform === 'linkedin' && <Linkedin className="w-4 h-4" />}
                                 {sp.platform === 'instagram' && <Instagram className="w-4 h-4" />}
                              </div>
                            </div>
                            <span className="text-xs font-bold uppercase opacity-60">{sp.platform}</span>
                          </div>
                          {sp.scheduledAt ? (
                            <div className={`badge badge-sm font-bold ${isPublished ? 'badge-success' : 'badge-info'}`}>
                              {isPublished ? 'Published' : 'Scheduled'}
                            </div>
                          ) : (
                            <div className="badge badge-sm badge-ghost font-bold">Draft</div>
                          )}
                        </div>
                        <p className="text-sm line-clamp-3 mb-4 opacity-80 italic italic leading-relaxed">"{sp.post}"</p>
                        {sp.imageUrl && (
                           <figure className="rounded-xl overflow-hidden border border-base-300">
                             <img src={sp.imageUrl} className="w-full h-48 object-cover" alt="Saved Content Media" />
                           </figure>
                        )}
                        {sp.scheduledAt && !isPublished && (
                          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold opacity-50 uppercase">
                            <Calendar className="w-3 h-3" />
                            {new Date(sp.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const platformStyles: Record<string, { iconBg: string; border: string; }> = {
  linkedin: { iconBg: 'bg-[#0077b5]', border: 'border-[#0077b5]' },
  twitter: { iconBg: 'bg-black', border: 'border-black' },
  instagram: { iconBg: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', border: 'border-pink-500' }
};

function PostCard({ 
  platform,
  title,
  icon: Icon, 
  content, 
  isLoadingDraft, 
  onCopy,
  onContentChange,
  onSave,
  onRegenerateCaption,
  onRegenerateImage,
  aspectRatio,
  aspectText
}: { 
  platform: string; 
  title: string;
  icon: any; 
  content: PlatformContent | null; 
  isLoadingDraft: boolean;
  onCopy: () => void;
  onContentChange: (val: string) => void;
  onSave: (scheduledAt?: string) => void;
  onRegenerateCaption: (useEmojis: boolean) => void;
  onRegenerateImage: () => void;
  aspectRatio: string;
  aspectText: string;
}) {
  const styles = platformStyles[platform] || platformStyles.twitter;
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const handleShare = async () => {
    if (!content) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} Draft`,
          text: content.post
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(title + ' Draft')}&body=${encodeURIComponent(content.post)}`;
    }
  };

  return (
    <div className={`card bg-base-100 border border-base-300 shadow-lg h-full transition-all duration-500 ${isLoadingDraft ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}`}>
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center text-white shadow-sm`}>
            <Icon className="w-4 h-4" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isLoadingDraft && content && (
            <>
              {content.loadingCaption ? (
                 <span className="loading loading-spinner loading-xs text-primary mr-1"></span>
              ) : (
                <div className="flex gap-1 bg-base-200 p-1 rounded-lg">
                  <button
                    onClick={() => onRegenerateCaption(!content.useEmojis)}
                    className={`btn btn-xs ${content.useEmojis ? 'btn-primary' : 'btn-ghost'} border-none shadow-none`}
                    title={content.useEmojis ? 'Disable Emojis' : 'Enable Emojis'}
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onRegenerateCaption(content.useEmojis ?? true)}
                    className="btn btn-xs btn-ghost border-none shadow-none"
                    title="Regenerate Caption"
                  >
                     <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="divider divider-horizontal mx-1"></div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`btn btn-xs ${isEditing ? 'btn-primary' : 'btn-ghost'} border-none shadow-none`}
                title="Edit Post"
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleShare}
                className="btn btn-xs btn-ghost border-none shadow-none"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onCopy}
                className="btn btn-xs btn-outline btn-primary ml-1 font-bold"
                title="Copy Text"
              >
                Copy
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card-body p-6 overflow-hidden flex flex-col group relative gap-4">
        {isLoadingDraft && !content ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <span className="loading loading-dots loading-lg text-primary"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Drafting strategy</span>
          </div>
        ) : content ? (
          <>
            <div className="flex-1 flex flex-col">
              {isEditing ? (
                <textarea
                  value={content.post}
                  onChange={(e) => onContentChange(e.target.value)}
                  className={`textarea textarea-primary w-full flex-1 min-h-[140px] resize-none text-sm leading-relaxed ${platform === 'instagram' ? 'order-last mt-4' : ''}`}
                />
              ) : (
                <p className={`flex-1 ${platform === 'twitter' ? 'text-lg font-bold leading-tight' : platform === 'instagram' ? 'text-xs opacity-70 line-clamp-[6] order-last mt-4 italic' : 'text-sm leading-relaxed'} whitespace-pre-wrap overflow-y-auto`}>
                  {content.post}
                </p>
              )}
            </div>
            
            <div className={`${platform !== 'instagram' ? '' : 'mb-0'} ${aspectRatio} bg-base-300 rounded-2xl relative flex items-center justify-center overflow-hidden shrink-0 group/img border border-base-300`}>
              {content.loadingImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-base-200 animate-pulse">
                   <span className="loading loading-ring loading-lg text-primary"></span>
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Rendering Visuals</span>
                </div>
              ) : content.imageUrl ? (
                <>
                   <img src={content.imageUrl} alt={`${platform} generated graphic`} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform group-hover/img:scale-110 duration-700" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <button onClick={onRegenerateImage} className="btn btn-sm btn-white">
                       <RefreshCcw className="w-3 h-3" /> Regenerate
                     </button>
                     <a href={content.imageUrl} download={`${platform}-graphic.png`} className="btn btn-sm btn-primary">
                       <ImageIcon className="w-3 h-3" /> Download
                     </a>
                   </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <span className="text-[10px] font-bold uppercase opacity-50">{content.imageError || 'Visual generation failed'}</span>
                  <button onClick={onRegenerateImage} className="btn btn-xs btn-outline">Reprocess</button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Footer for Save & Schedule */}
      {!isLoadingDraft && content && (
        <div className="p-4 border-t border-base-300 bg-base-200/50 flex items-center justify-between mt-auto">
          <div className="flex gap-2">
            <button 
              onClick={() => onSave()}
              className="btn btn-sm btn-ghost bg-base-100 border border-base-300 shadow-sm gap-2"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button 
              onClick={() => setShowSchedule(!showSchedule)}
              className={`btn btn-sm ${showSchedule ? 'btn-primary' : 'btn-ghost bg-base-100 border border-base-300'} shadow-sm gap-2`}
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </button>
          </div>
          <div className="badge badge-ghost font-mono text-[9px] uppercase tracking-tighter opacity-50">{aspectText}</div>
        </div>
      )}
      
      {showSchedule && !isLoadingDraft && content && (
        <div className="p-4 bg-primary/5 border-t border-primary/10 flex items-center gap-3 relative animate-in slide-in-from-bottom duration-300">
          <input 
            type="datetime-local" 
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="input input-bordered input-sm flex-1 text-xs" 
          />
          <button 
            onClick={() => {
              if (scheduleDate) {
                onSave(scheduleDate);
                setShowSchedule(false);
                setScheduleDate('');
              }
            }}
            disabled={!scheduleDate}
            className="btn btn-sm btn-primary"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

