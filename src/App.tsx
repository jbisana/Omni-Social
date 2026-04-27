import { useState, useCallback, useEffect } from 'react';
import { Twitter, Linkedin, Instagram, Sparkles, Loader2, RefreshCcw, Send, CheckCircle2, AlertCircle, Save, Calendar, Edit2, Check, Share2, BarChart2, Clock, FileText, Smile, Image as ImageIcon } from 'lucide-react';
import { generateDrafts, generateImage, regenerateCaption, GeneratedDrafts } from './services/gemini';

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
  
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [content, setContent] = useState<Record<'twitter' | 'linkedin' | 'instagram', PlatformContent | null>>({
    twitter: null,
    linkedin: null,
    instagram: null
  });

  const [savedPosts, setSavedPosts] = useState<{platform: string, post: string, imageUrl?: string, scheduledAt?: string}[]>([]);

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
      const drafts = await generateDrafts(idea, tone, hashtags, true);
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
      const imageUrl = await generateImage(prompt, ratio);
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
      const draft = await regenerateCaption(idea, tone, platform, hashtags, currentUseEmojis);
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Omni<span className="text-blue-400">Social</span></span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-slate-400 text-sm">Cross-Platform <span className="text-white font-medium">AI Generator</span></div>
          <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
        </div>
      </header>

      {/* Main Control Panel */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Content Idea</label>
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. We just launched a new feature that lets users export data to CSV with one click."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && !isGeneratingDrafts && handleGenerate()}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desired Tone</label>
            <div className="flex p-1 bg-slate-100 rounded-lg shadow-inner">
              {(['professional', 'witty', 'urgent'] as Tone[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tone === t 
                      ? 'bg-white text-blue-600 rounded shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full md:w-56">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custom Hashtags (Insta)</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="e.g. #startup #launch"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custom Link</label>
            <input
              type="text"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && !isGeneratingDrafts && handleGenerate()}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!idea.trim() || isGeneratingDrafts}
            className="px-6 py-2.5 h-[46px] bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isGeneratingDrafts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isGeneratingDrafts ? 'Generating' : 'Generate All'}
          </button>
        </div>
        {draftError && (
          <div className="max-w-7xl mx-auto mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{draftError}</p>
          </div>
        )}
      </div>

      {/* Generated Outputs Grid */}
      <main className="flex-1 p-6 flex flex-col">
        {!content.twitter && !isGeneratingDrafts ? (
          <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-12 lg:min-h-[400px]">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Waiting for inspiration</h3>
            <p className="text-slate-500 max-w-sm">Enter your idea above and we'll automatically craft platform-specific posts and imagery.</p>
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
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col items-center justify-between md:flex-row gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <BarChart2 className="w-5 h-5 text-indigo-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Post Analytics</h2>
              </div>
              <div className="flex gap-4 md:gap-8">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                   <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</div>
                 </div>
                 <div className="w-px bg-slate-200"></div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
                   <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 justify-center"><Clock className="w-3 h-3"/> Scheduled</div>
                 </div>
                 <div className="w-px bg-slate-200"></div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-indigo-600">{stats.drafts}</div>
                   <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 justify-center"><FileText className="w-3 h-3"/> Drafts</div>
                 </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-md font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Saved / Scheduled Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPosts.map((sp, i) => {
                  const isPublished = sp.scheduledAt && new Date(sp.scheduledAt) <= new Date();
                  return (
                    <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                           {sp.platform === 'twitter' && <Twitter className="w-3 h-3" />}
                           {sp.platform === 'linkedin' && <Linkedin className="w-3 h-3" />}
                           {sp.platform === 'instagram' && <Instagram className="w-3 h-3" />}
                           {sp.platform}
                        </span>
                        {sp.scheduledAt ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${isPublished ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isPublished ? <CheckCircle2 className="w-3 h-3"/> : <Calendar className="w-3 h-3"/>}
                            {isPublished ? 'Published' : new Date(sp.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><FileText className="w-3 h-3"/> Draft</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-4 mb-3 leading-relaxed flex-1">{sp.post}</p>
                      {sp.imageUrl && (
                         <div className="aspect-video w-full rounded border border-slate-200 overflow-hidden shrink-0">
                           <img src={sp.imageUrl} className="w-full h-full object-cover" alt="Saved Content Media" />
                         </div>
                      )}
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
    <div className={`bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm h-full transform transition-all duration-300 ${isLoadingDraft ? 'opacity-70 scale-[0.98]' : 'opacity-100'}`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-6 h-6 ${styles.iconBg} rounded-sm flex items-center justify-center text-white text-[10px]`}>
            <Icon className="w-3 h-3" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isLoadingDraft && content && (
            <>
              {content.loadingCaption ? (
                 <Loader2 className="w-4 h-4 animate-spin text-slate-400 mr-1" />
              ) : (
                <>
                  <button
                    onClick={() => onRegenerateCaption(!content.useEmojis)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${content.useEmojis ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
                    title={content.useEmojis ? 'Disable Emojis (Regenerates caption)' : 'Enable Emojis (Regenerates caption)'}
                  >
                    <Smile className="w-3 h-3" />
                    {content.useEmojis ? 'On' : 'Off'}
                  </button>
                  <button 
                    onClick={() => onRegenerateCaption(content.useEmojis ?? true)}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="Regenerate Caption"
                  >
                     <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Edit Post"
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleShare}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onCopy}
                className="text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors ml-1"
                title="Copy Text"
              >
                Copy
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col group relative">
        {isLoadingDraft && !content ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Drafting content...</span>
          </div>
        ) : content ? (
          <>
            <div className="flex-1 flex flex-col">
              {isEditing ? (
                <textarea
                  value={content.post}
                  onChange={(e) => onContentChange(e.target.value)}
                  className={`w-full flex-1 min-h-[120px] resize-none p-3 border border-blue-200 bg-blue-50/30 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${platform === 'instagram' ? 'order-last mt-3' : ''}`}
                />
              ) : (
                <p className={`flex-1 ${platform === 'twitter' ? 'text-base font-medium text-slate-900 leading-snug' : platform === 'instagram' ? 'text-xs text-slate-600 line-clamp-[8] order-last mt-3' : 'text-sm text-slate-800 leading-relaxed'} whitespace-pre-wrap overflow-y-auto`}>
                  {content.post}
                </p>
              )}
            </div>
            
            <div className={`${platform !== 'instagram' ? 'mt-4' : 'mb-0'} ${aspectRatio} bg-slate-200 rounded border border-slate-300 relative flex items-center justify-center overflow-hidden shrink-0 group/img`}>
              {content.loadingImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100">
                   <div className="relative">
                     <div className="w-8 h-8 border-2 border-slate-200 rounded-full"></div>
                     <div className={`w-8 h-8 border-2 ${styles.border} rounded-full border-t-transparent animate-spin absolute top-0`}></div>
                   </div>
                   <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Generating Image</span>
                </div>
              ) : content.imageUrl ? (
                <>
                   <img src={content.imageUrl} alt={`${platform} generated graphic`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <button onClick={onRegenerateImage} className="bg-white text-slate-900 text-xs font-semibold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 flex items-center gap-1">
                       <RefreshCcw className="w-3 h-3" /> Regenerate
                     </button>
                     <a href={content.imageUrl} download={`${platform}-graphic.png`} className="bg-white text-slate-900 text-xs font-semibold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 flex items-center gap-1">
                       <ImageIcon className="w-3 h-3" /> Download
                     </a>
                   </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">{content.imageError || 'Image unavailable'}</span>
                  <button onClick={onRegenerateImage} className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors">Try Again</button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Footer for Save & Schedule */}
      {!isLoadingDraft && content && (
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between mt-auto">
          <div className="flex gap-2">
            <button 
              onClick={() => onSave()}
              className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button 
              onClick={() => setShowSchedule(!showSchedule)}
              className={`text-xs flex items-center gap-1.5 font-medium px-3 py-1.5 rounded border shadow-sm transition-colors ${showSchedule ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'}`}
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{aspectText}</span>
        </div>
      )}
      
      {showSchedule && !isLoadingDraft && content && (
        <div className="p-3 bg-blue-50/50 border-t border-blue-100 flex items-center gap-2 relative">
          <input 
            type="datetime-local" 
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 text-slate-700" 
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
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

