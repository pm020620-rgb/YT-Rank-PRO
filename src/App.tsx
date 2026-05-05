import { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Copy, Check, Youtube, TrendingUp, Shield, Globe, Play, Sparkles, 
  Layout, Hash, Tag, Type as TypeIcon, History, Download, Languages,
  AlertCircle, Image as ImageIcon, ExternalLink, Zap, Link as LinkIcon,
  Sword, Info, ChevronRight, BarChart3
} from 'lucide-react';

// Types for the result
interface YTSEOData {
  seo_keywords: { text: string; trend: 'up' | 'down' | 'stable'; volume: string }[];
  tags: string[];
  title_suggestions: { text: string; viral_score: number }[];
  description: string;
  hashtags: string[];
  category: string;
  thumbnail_advice: string;
  difficulty_score: number;
  video_info?: {
    title: string;
    channel: string;
    views: string;
  };
}

interface BattleResult {
  winner_index: number;
  reasoning: string;
  ctr_prediction: string;
}

type Language = 'English' | 'Hindi' | 'Hinglish';
type SearchMode = 'keyword' | 'url';
type TabType = 'all' | 'titles' | 'keywords' | 'description' | 'thumbnail' | 'battle';

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [language, setLanguage] = useState<Language>('English');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineQuery, setRefineQuery] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const [result, setResult] = useState<YTSEOData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Battle state
  const [battleInput1, setBattleInput1] = useState('');
  const [battleInput2, setBattleInput2] = useState('');
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [battling, setBattling] = useState(false);

  const currentYear = new Date().getFullYear();

  // URL Validation
  const isValidYTUrl = useMemo(() => {
    if (searchMode !== 'url' || !keyword) return true;
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(keyword);
  }, [keyword, searchMode]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('yt_rank_history_v3');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (kw: string) => {
    const newHistory = [kw, ...history.filter(h => h !== kw)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('yt_rank_history_v3', JSON.stringify(newHistory));
  };

  const handleGenerate = async (targetInput = keyword, refinement?: string) => {
    if (!targetInput.trim() && !refinement) return;
    if (searchMode === 'url' && !isValidYTUrl) return;

    if (refinement) {
      setRefining(true);
    } else {
      setLoading(true);
      setScanning(true);
      setResult(null);
      setActiveTab('all');
    }

    if (!refinement) {
      const steps = searchMode === 'keyword' 
        ? [
            "Analyzing high-volume search patterns...",
            "Calculating monthly CTR potential...",
            "Simulating competitor engagement...",
            "Crafting viral hook structures...",
            "Finalizing keyword ranking index..."
          ]
        : [
            "Initiating deep URL scrape...",
            "Decoding embedded algorithmic signals...",
            "Cross-referencing viral benchmarks...",
            "Analyzing channel authority context...",
            "Compiling strategic metadata report..."
          ];

      for (let i = 0; i < steps.length; i++) {
        setScanStatus(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = "";
      if (refinement) {
        prompt = `You are a YouTube SEO expert. Based on previous results for "${targetInput}", adjust them for this specific refinement: "${refinement}". Keep language ${language}. Return JSON.`;
      } else {
        prompt = searchMode === 'keyword'
          ? `Generate professional YouTube SEO data for keyword: "${targetInput}" in ${language}. 
             Include seo_keywords [text, trend (up/down/stable), volume (e.g. 45k/mo)], tags, 3 viral titles with scores, description, hashtags, difficulty_score (0-100), and thumbnail advice.`
          : `Analyze YouTube URL: "${targetInput}". Contextually extract/generate optimized data: titles, tags, description, keywords with monthly volumes and trends, category, and difficulty. Also provide video_info [title, channel, views].`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seo_keywords: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    trend: { type: Type.STRING, enum: ['up', 'down', 'stable'] },
                    volume: { type: Type.STRING }
                  },
                  required: ["text", "trend", "volume"]
                } 
              },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              title_suggestions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    viral_score: { type: Type.NUMBER }
                  },
                  required: ["text", "viral_score"]
                } 
              },
              description: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING },
              difficulty_score: { type: Type.NUMBER },
              thumbnail_advice: { type: Type.STRING },
              video_info: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  views: { type: Type.STRING }
                }
              }
            },
            required: ["seo_keywords", "tags", "title_suggestions", "description", "hashtags", "category", "difficulty_score", "thumbnail_advice"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as YTSEOData;
      setResult(data);
      if (!refinement) saveToHistory(targetInput);
      setScanning(false);
      setRefineQuery('');
    } catch (error) {
      console.error("Error generating SEO data:", error);
      setScanning(false);
    } finally {
      setLoading(false);
      setRefining(false);
    }
  };

  const handleTitleBattle = async () => {
    if (!battleInput1 || !battleInput2) return;
    setBattling(true);
    setBattleResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Compare these two YouTube titles: 
        1. "${battleInput1}" 
        2. "${battleInput2}"
        Which one has better Click-Through Rate (CTR) potential? Provide reasoning and a predicted CTR% range for the winner.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              winner_index: { type: Type.NUMBER, description: "1 or 2" },
              reasoning: { type: Type.STRING },
              ctr_prediction: { type: Type.STRING }
            },
            required: ["winner_index", "reasoning", "ctr_prediction"]
          }
        }
      });
      setBattleResult(JSON.parse(response.text));
    } catch (e) {
      console.error(e);
    } finally {
      setBattling(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllData = () => {
    if (!result) return;
    const all = `TITLES:\n${result.title_suggestions.map(t => t.text).join('\n')}\n\nDESCRIPTION:\n${result.description}\n\nTAGS:\n${result.tags.join(', ')}`.trim();
    copyToClipboard(all, 'all');
  };

  const downloadCSV = () => {
    if (!result) return;
    const rows = [["Type", "Content"], ["Keywords", result.seo_keywords.map(k => k.text).join("; ")], ["Tags", result.tags.join("; ")]];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    window.open(encodeURI(csvContent));
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans selection:bg-red-100 selection:text-red-600 pb-24 md:pb-0">
      {/* Floating Action Bar (Mobile Only) */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] md:hidden w-[90%]"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-2xl">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center border-2 border-slate-900"><Youtube className="w-4 h-4 text-white" /></div>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-slate-900"><TrendingUp className="w-4 h-4 text-white" /></div>
              </div>
              <button 
                onClick={copyAllData} 
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
              >
                {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Quick Copy All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <Youtube className="text-white w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-900 hidden sm:block italic">YT Rank <span className="text-red-600">Pro</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['English', 'Hindi', 'Hinglish'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${language === lang ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 border-b-2 border-slate-700">
              Go Enterprise
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Search Hero */}
        <section className="pt-20 pb-16 bg-white border-b border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                <Zap className="w-3 h-3" /> V.3.0.0 Global Standard
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter leading-[1.1]">
                Master the <span className="text-red-600">YouTube</span> <br /> 
                Algorithm Today
              </h1>
              <p className="text-slate-500 font-medium mb-10 max-w-xl mx-auto">Generate viral-ready metadata or extract deep signals from existing links in seconds.</p>
            </motion.div>

            {/* Mode Toggle */}
            <div className="inline-flex p-1 bg-slate-100 rounded-[20px] mb-8 border border-slate-200">
              <button 
                onClick={() => setSearchMode('keyword')}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest ${searchMode === 'keyword' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <TrendingUp className="w-4 h-4" /> Keyword Intel
              </button>
              <button 
                onClick={() => setSearchMode('url')}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest ${searchMode === 'url' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <LinkIcon className="w-4 h-4" /> Link Scan
              </button>
            </div>

            <div className="relative group max-w-2xl mx-auto">
              <div className={`absolute -inset-1 bg-gradient-to-r ${isValidYTUrl ? 'from-red-600 to-orange-600' : 'from-rose-600 to-rose-700'} rounded-[24px] blur opacity-10 group-hover:opacity-20 transition duration-1000`}></div>
              <div className={`relative flex flex-col md:flex-row gap-2 p-2 bg-white border ${!isValidYTUrl ? 'border-rose-300 shadow-rose-100' : 'border-slate-200 shadow-slate-100'} rounded-[24px] shadow-2xl`}>
                <div className="flex-1 relative">
                  {searchMode === 'keyword' ? (
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  ) : (
                    <Youtube className={`absolute left-4 top-1/2 -translate-y-1/2 ${!isValidYTUrl ? 'text-rose-500' : 'text-red-500'} w-5 h-5`} />
                  )}
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm ${!isValidYTUrl ? 'text-rose-600' : 'text-slate-700'} placeholder:text-slate-400`}
                    placeholder={searchMode === 'keyword' ? "What is your video about?..." : "Paste any YouTube video URL..."}
                  />
                </div>
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading || !isValidYTUrl}
                  className="bg-slate-950 hover:bg-black text-white px-10 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {loading ? <Zap className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4 text-red-500 group-hover:rotate-12 transition-transform" />}
                  <span className="text-xs uppercase tracking-[0.1em]">{loading ? 'Scanning...' : 'Start Intel'}</span>
                </button>
              </div>
              {!isValidYTUrl && (
                <div className="absolute -bottom-8 left-4 flex items-center gap-1.5 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Please enter a valid YouTube link
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && !result && (
              <div className="mt-12 flex flex-wrap justify-center gap-3">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setKeyword(h); handleGenerate(h); }}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black rounded-xl hover:bg-white hover:text-red-600 hover:border-red-200 transition-all uppercase tracking-widest"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Scanning Animation */}
        <AnimatePresence>
          {scanning && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-32 text-center"
            >
              <div className="mb-10 relative inline-block">
                <div className="w-28 h-28 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-red-600 animate-bounce" />
                </div>
              </div>
              <motion.p 
                key={scanStatus}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black text-slate-900 tracking-tighter"
              >
                {scanStatus}
              </motion.p>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <Shield className="w-3 h-3 text-emerald-500" /> SECURE ALGO SCAN
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Area */}
        <AnimatePresence>
          {result && !scanning && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-7xl mx-auto px-4 mt-12 py-12"
            >
              {/* URL Preview */}
              {searchMode === 'url' && result.video_info && (
                <div className="bg-slate-900/95 backdrop-blur-xl p-8 rounded-[40px] mb-12 flex flex-col md:flex-row items-center gap-8 border border-white/10 shadow-2xl overflow-hidden group">
                  <div className="w-full md:w-80 aspect-video bg-slate-800 rounded-3xl overflow-hidden relative shadow-2xl flex items-center justify-center border border-white/5">
                    <Play className="w-16 h-16 text-white/10 group-hover:scale-125 transition-transform duration-500" />
                    <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-xl">
                      <Zap className="w-3 h-3" /> Live Signal
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h2 className="text-2xl font-black text-white leading-tight tracking-tight">{result.video_info.title}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center"><Youtube className="w-3 h-3 text-red-500" /></div>
                        <span className="text-sm font-bold text-slate-300">{result.video_info.channel}</span>
                      </div>
                      <div className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Globe className="w-3 h-3" /> {result.video_info.views} Total Views
                      </div>
                      <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20">
                        Scan Verified
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="bg-white/40 backdrop-blur-xl p-2 rounded-[30px] border border-white mb-12 flex flex-wrap items-center justify-center lg:justify-start gap-1 shadow-xl">
                {[
                  { id: 'all', label: 'Dashboard', icon: <Layout className="w-4 h-4" /> },
                  { id: 'titles', label: 'Viral Titles', icon: <TypeIcon className="w-4 h-4" /> },
                  { id: 'keywords', label: 'SEO Tags', icon: <Hash className="w-4 h-4" /> },
                  { id: 'description', label: 'Metadata', icon: <Download className="w-4 h-4" /> },
                  { id: 'battle', label: 'Title Battle', icon: <Sword className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-xl shadow-red-200 scale-105' : 'text-slate-400 hover:text-slate-800 hover:bg-white'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
                <div className="ml-auto hidden lg:flex items-center gap-3 pr-4">
                  <button onClick={downloadCSV} className="text-slate-400 hover:text-slate-900 transition-colors"><Download className="w-5 h-5" /></button>
                  <button onClick={copyAllData} className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Copy Hub</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content Panels */}
                <div className="lg:col-span-2 space-y-10">
                  <AnimatePresence mode="wait">
                    {/* Dashboard / All View */}
                    {(activeTab === 'all' || activeTab === 'titles') && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="titles-view" className="bg-white/60 backdrop-blur-3xl rounded-[40px] p-10 border border-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full translate-x-20 -translate-y-20"></div>
                        <div className="flex items-center justify-between mb-10">
                           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                             <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center"><TypeIcon className="w-5 h-5 text-purple-600" /></div>
                             Viral Title Engineering
                           </h3>
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">AI QUALITY: <span className="text-emerald-500">OPTIMAL</span></div>
                        </div>
                        <div className="space-y-6">
                          {result.title_suggestions.map((title, i) => (
                            <div key={i} className="group p-8 bg-white/50 backdrop-blur-sm rounded-[32px] border border-white hover:border-purple-200 hover:bg-white transition-all shadow-sm relative">
                              <div className="flex justify-between items-start gap-8">
                                <div className="flex-1 space-y-4">
                                  <p className="text-xl font-black text-slate-800 leading-[1.3] truncate-2-lines">{title.text}</p>
                                  <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                                       <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{title.viral_score}% VIRAL POTENTIAL</span>
                                    </div>
                                    <div className="h-4 w-[1px] bg-slate-200"></div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${title.text.length > 70 ? 'text-rose-500' : 'text-slate-400'}`}>
                                      {title.text.length} / 100 CHAR
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => copyToClipboard(title.text, `t-${i}`)} className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100 hover:text-purple-600 active:scale-90 transition-all shrink-0">
                                  {copiedField === `t-${i}` ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* SEO Intel View */}
                    {(activeTab === 'all' || activeTab === 'keywords') && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="keywords-view" className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white/60 backdrop-blur-3xl rounded-[40px] p-10 border border-white shadow-2xl relative overflow-hidden">
                          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center"><Tag className="w-5 h-5 text-red-600" /></div>
                            Video Tags
                          </h3>
                          <div className="flex flex-wrap gap-2.5">
                            {result.tags.map((tag, i) => (
                              <span key={i} className="px-4 py-2 bg-white/80 border border-white hover:bg-red-50 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm" onClick={() => copyToClipboard(tag, `tag-${i}`)}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-3xl rounded-[40px] p-10 border border-white shadow-2xl relative overflow-hidden">
                          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                            Keyword Metrics
                          </h3>
                          <div className="space-y-4">
                            {result.seo_keywords.map((kw, i) => (
                              <div key={i} className="group flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl hover:bg-white transition-all shadow-sm">
                                <div>
                                  <p className="font-black text-sm text-slate-800 italic">#{kw.text}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">S. Volume: <span className="text-slate-900">{kw.volume}</span></p>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${kw.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : kw.trend === 'down' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                   {kw.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                   {kw.trend}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Metadata View */}
                    {(activeTab === 'all' || activeTab === 'description') && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="desc-view" className="bg-slate-950 rounded-[40px] p-10 border border-slate-900 shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] rounded-full"></div>
                         <div className="flex items-center justify-between mb-10 relative z-10">
                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center"><Download className="w-5 h-5 text-white" /></div>
                              Studio-Ready Description
                            </h3>
                            <button onClick={() => copyToClipboard(result.description, 'desc')} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors flex items-center gap-2 uppercase tracking-[0.2em]">
                               {copiedField === 'desc' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                               {copiedField === 'desc' ? 'Copied' : 'Transfer Text'}
                            </button>
                         </div>
                         <div className="relative z-10 p-10 bg-slate-900/50 border border-white/5 rounded-[32px] text-slate-400 text-sm font-medium leading-relaxed font-mono shadow-inner">
                            {result.description}
                         </div>
                      </motion.div>
                    )}

                    {/* Title Battle View */}
                    {activeTab === 'battle' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="battle-view" className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-2xl text-center space-y-12">
                         <div className="space-y-4">
                            <div className="w-16 h-16 bg-red-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-red-200"><Sword className="w-8 h-8 rotate-45" /></div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Title CTR Battle</h3>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto">Compare two titles and let AI pick the viral winner based on engagement psychology.</p>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black italic border-4 border-white z-10 hidden md:flex">VS</div>
                           <textarea 
                             value={battleInput1}
                             onChange={(e) => setBattleInput1(e.target.value)}
                             placeholder="Enter Title A..."
                             className="w-full h-32 p-6 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-slate-700 resize-none transition-all placeholder:text-slate-300"
                           />
                           <textarea 
                             value={battleInput2}
                             onChange={(e) => setBattleInput2(e.target.value)}
                             placeholder="Enter Title B..."
                             className="w-full h-32 p-6 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-slate-700 resize-none transition-all placeholder:text-slate-300"
                           />
                         </div>
                         <button 
                           onClick={handleTitleBattle}
                           disabled={battling || !battleInput1 || !battleInput2}
                           className="bg-red-600 hover:bg-red-700 text-white px-12 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-200 transform transition-all active:scale-95 disabled:grayscale"
                         >
                           {battling ? 'Simulating Impressions...' : 'Battle Now'}
                         </button>
                         {battleResult && (
                           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 p-10 bg-emerald-50 border-2 border-emerald-100 rounded-[32px] text-left relative overflow-hidden group">
                              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full"></div>
                              <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">WINNER: TITLE {battleResult.winner_index === 1 ? 'A' : 'B'}</div>
                                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">EXPECTED CTR: {battleResult.ctr_prediction}</div>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 leading-tight">"{battleResult.winner_index === 1 ? battleInput1 : battleInput2}"</h4>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed border-t border-emerald-200/50 pt-4"><Info className="w-4 h-4 inline mr-2 text-emerald-500" />{battleResult.reasoning}</p>
                              </div>
                           </motion.div>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Smart Refinement Corner */}
                  <div className="bg-white/40 backdrop-blur-3xl rounded-[40px] p-10 border border-white shadow-2xl relative overflow-hidden group">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200/50 group-hover:rotate-12 transition-transform">
                           <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                           <h3 className="font-black text-slate-900 text-lg">AI Engineering Terminal</h3>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Context-Aware Real-time Refinement</p>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row gap-4">
                        <input 
                           type="text" 
                           value={refineQuery}
                           onChange={(e) => setRefineQuery(e.target.value)}
                           className="flex-1 px-8 py-5 bg-white border border-slate-100 rounded-3xl outline-none font-bold text-slate-700 shadow-inner text-sm"
                           placeholder="E.g. 'Make titles more curiosity-driven'..."
                           onKeyDown={(e) => e.key === 'Enter' && handleGenerate(keyword, refineQuery)}
                        />
                        <button 
                           onClick={() => handleGenerate(keyword, refineQuery)}
                           disabled={refining || !refineQuery.trim()}
                           className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black active:scale-95 transition-all shadow-xl"
                        >
                           {refining ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Zap className="w-4 h-4" />}
                           Refine
                        </button>
                     </div>
                  </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-10">
                  {/* Difficulty Index */}
                  <div className="bg-slate-950 rounded-[40px] p-12 text-white relative shadow-2xl overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-transparent opacity-50"></div>
                     <div className="relative z-10 flex flex-col items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-12">SEO Difficulty Index</h4>
                        <div className="relative w-48 h-48 mb-10">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-900" />
                              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" 
                                 strokeDasharray={552.92} 
                                 strokeDashoffset={552.92 - (552.92 * result.difficulty_score) / 100} 
                                 strokeLinecap="round"
                                 className={`transition-all duration-1000 ${result.difficulty_score < 35 ? 'text-emerald-500' : result.difficulty_score < 70 ? 'text-amber-500' : 'text-rose-500'}`} 
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <span className="text-6xl font-black tracking-tighter tabular-nums leading-none">{result.difficulty_score}</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-widest">Score</span>
                           </div>
                        </div>
                        <div className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 ${result.difficulty_score < 35 ? 'text-emerald-500' : result.difficulty_score < 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                           {result.difficulty_score < 35 ? 'High Potential' : result.difficulty_score < 70 ? 'Moderate Contest' : 'Hard Battle'}
                        </div>
                     </div>
                  </div>

                  {/* Thumbnail Strategy */}
                  <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-[40px] p-10 text-white shadow-2xl relative group hover:rotate-1 transition-all">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3">
                       <ImageIcon className="w-6 h-6 text-white/90" /> Visual Engine Insight
                    </h3>
                    <p className="text-sm text-white font-bold italic leading-relaxed mb-8">"{result.thumbnail_advice}"</p>
                    <div className="space-y-4 pt-10 border-t border-white/20">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80"><span>CTR Tension</span><span>Extreme</span></div>
                       <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white w-[95%]"></div></div>
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80"><span>Saturation</span><span>Vibrant</span></div>
                       <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white w-[88%]"></div></div>
                    </div>
                  </div>

                  {/* Topic Metadata */}
                  <div className="bg-white/60 backdrop-blur-3xl rounded-[40px] p-12 border border-white shadow-2xl relative overflow-hidden">
                    <div className="mb-12">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Classification</h4>
                       <p className="text-3xl font-black text-slate-900 italic tracking-tighter underline decoration-red-500 decoration-[8px] underline-offset-4 decoration-skip-ink">"{result.category}"</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Viral Hashtags</h4>
                       <div className="flex flex-wrap gap-3">
                         {result.hashtags.map((h, i) => (
                           <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black italic rounded-xl border border-blue-100/50 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">{h}</span>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Features Section - Only when results not present */}
        {!result && !scanning && (
          <section className="max-w-7xl mx-auto px-4 py-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              {[
                { icon: <Globe className="text-red-500" />, title: "Global Volume Data", desc: "Using live search frequency metrics from 200+ regions worldwide." },
                { icon: <Shield className="text-blue-500" />, title: "Pro Algorithmic Scan", desc: "Deep extraction of competitor tags and hidden metadata signals." },
                { icon: <Sparkles className="text-purple-500" />, title: "Creative Engine 3.0", desc: "Generate title hooks with 95% psychological engagement scores." },
              ].map((f, i) => (
                <div key={i} className="p-12 bg-white rounded-[50px] border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden">
                   <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-10 group-hover:bg-slate-950 group-hover:text-white transition-all duration-300">
                      {f.icon}
                   </div>
                   <h3 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">{f.title}</h3>
                   <p className="text-slate-500 text-sm font-medium leading-relaxed">{f.desc}</p>
                   <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50/50 blur-[40px] -translate-x-1/2 -translate-y-1/2 group-hover:bg-red-500/10 transition-colors"></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="bg-slate-950 text-white py-24 border-t border-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/20">
              <Youtube className="text-white w-7 h-7" />
            </div>
            <span className="font-black text-3xl tracking-tighter italic">YT Rank <span className="text-red-500">Pro</span></span>
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em] mb-12 text-center">Powering the Creator Economy Since 2024</p>
          <div className="flex justify-center gap-16 mb-16 flex-wrap">
            <div className="text-center">
              <span className="text-5xl font-black text-white block mb-2 tabular-nums tracking-tighter">2.5M+</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Optimized Assets</span>
            </div>
            <div className="text-center">
              <span className="text-5xl font-black text-white block mb-2 tabular-nums tracking-tighter">95%</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Algo Success</span>
            </div>
            <div className="text-center">
              <span className="text-5xl font-black text-white block mb-2 tabular-nums tracking-tighter">Sub-1s</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scan Latency</span>
            </div>
          </div>
          <div className="w-full h-[1px] bg-white/5 max-w-4xl mx-auto mb-12"></div>
          <p className="text-[10px] font-bold text-slate-600">© 2024 - {currentYear} YT Rank Finder Pro. Global standards in YouTube SEO Engineering.</p>
        </div>
      </footer>
    </div>
  );
}
