/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { 
  Download, 
  Upload, 
  Type, 
  Image as ImageIcon, 
  User, 
  Layout, 
  RefreshCw,
  Camera,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Draggable from 'react-draggable';
import { useGesture } from '@use-gesture/react';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LayoutType = 'portrait' | 'landscape' | 'square_3_4';
type VersionType = 'classic' | 'immersive';

export default function App() {
  const DEFAULT_PUNCHLINE = 'VOTRE PUNCHLINE ICI';
  const DEFAULT_SUBTEXT = 'Une description courte ou un auteur';

  const [mainImage, setMainImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [punchline, setPunchline] = useState(DEFAULT_PUNCHLINE);
  const [punchlineSize, setPunchlineSize] = useState(20);
  const [punchlineAlign, setPunchlineAlign] = useState<'left' | 'center' | 'right'>('right');
  const [subText, setSubText] = useState(DEFAULT_SUBTEXT);
  const [layout, setLayout] = useState<LayoutType>('portrait');
  const [version, setVersion] = useState<VersionType>('immersive');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'rendering' | 'saving' | 'success'>('idle');
  const [exportFormat, setExportFormat] = useState<'jpg' | 'png'>('jpg');
  const [finalExportedImage, setFinalExportedImage] = useState<string | null>(null);
  
  // Image positioning state
  const [mainPos, setMainPos] = useState({ x: 0, y: 0, zoom: 1, flipX: false });
  const [profilePos, setProfilePos] = useState({ x: 0, y: 0, zoom: 1, flipX: false });
  const [profileContainerPos, setProfileContainerPos] = useState({ x: 0, y: 0 });
  const [punchlinePos, setPunchlinePos] = useState({ x: 0, y: 0 });
  const [subTextPos, setSubTextPos] = useState({ x: 0, y: 0 });
  const [subTextSize, setSubTextSize] = useState(10);
  const [fontFamily, setFontFamily] = useState<'bebas' | 'crushed'>('crushed');
  const [overlayOpacity, setOverlayOpacity] = useState(60);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [activeControl, setActiveControl] = useState<'main' | 'profile' | 'text' | 'overlay' | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);
  const punchlineRef = useRef<HTMLHeadingElement>(null);
  const [punchlineWidth, setPunchlineWidth] = useState(0);

  // Measure punchline width to sync subtext width
  useEffect(() => {
    if (punchlineRef.current) {
      const width = punchlineRef.current.offsetWidth;
      // Only update if width has changed significantly to avoid loops
      if (Math.abs(width - punchlineWidth) > 1) {
        setPunchlineWidth(width);
      }
    }
  }, [punchline, punchlineSize, fontFamily, layout, version, punchlineAlign, punchlineWidth]);

  // Load state from local storage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem('pic4pro_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.mainImage !== undefined) setMainImage(parsed.mainImage);
        if (parsed.profileImage !== undefined) setProfileImage(parsed.profileImage);
        if (parsed.punchline !== undefined) setPunchline(parsed.punchline);
        if (parsed.punchlineSize !== undefined) setPunchlineSize(parsed.punchlineSize);
        if (parsed.punchlineAlign !== undefined) setPunchlineAlign(parsed.punchlineAlign);
        if (parsed.subText !== undefined) setSubText(parsed.subText);
        if (parsed.layout !== undefined) setLayout(parsed.layout);
        if (parsed.version !== undefined) setVersion(parsed.version);
        if (parsed.mainPos !== undefined) setMainPos(parsed.mainPos);
        if (parsed.profilePos !== undefined) setProfilePos(parsed.profilePos);
        if (parsed.profileContainerPos !== undefined) setProfileContainerPos(parsed.profileContainerPos);
        if (parsed.punchlinePos !== undefined) setPunchlinePos(parsed.punchlinePos);
        else if (parsed.textPos !== undefined) setPunchlinePos(parsed.textPos);
        if (parsed.subTextPos !== undefined) setSubTextPos(parsed.subTextPos);
        if (parsed.subTextSize !== undefined) setSubTextSize(parsed.subTextSize);
        if (parsed.fontFamily !== undefined) setFontFamily(parsed.fontFamily);
        if (parsed.overlayOpacity !== undefined) setOverlayOpacity(parsed.overlayOpacity);
        if (parsed.isOverlayEnabled !== undefined) setIsOverlayEnabled(parsed.isOverlayEnabled);
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
  }, []);

  // Save state to local storage whenever it changes
  useEffect(() => {
    const stateToSave = {
      mainImage,
      profileImage,
      punchline,
      punchlineSize,
      punchlineAlign,
      subText,
      layout,
      version,
      mainPos,
      profilePos,
      profileContainerPos,
      punchlinePos,
      subTextPos,
      subTextSize,
      fontFamily,
      overlayOpacity,
      isOverlayEnabled
    };
    try {
      localStorage.setItem('pic4pro_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state to localStorage (likely quota exceeded)', e);
      // We don't alert the user on every change to avoid annoyance, 
      // but we prevent the app from crashing.
    }
  }, [mainImage, profileImage, punchline, punchlineSize, punchlineAlign, subText, layout, version, mainPos, profilePos, profileContainerPos, punchlinePos, subTextPos, subTextSize, fontFamily, overlayOpacity, isOverlayEnabled]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'profile') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'main') setMainImage(event.target?.result as string);
        else setProfileImage(event.target?.result as string);
      };
      reader.onerror = () => {
        console.error('FileReader error');
        alert('Erreur lors du chargement de l\'image. Veuillez réessayer.');
      };
      reader.readAsDataURL(file);
    }
  };

  const exportImage = useCallback(async () => {
    if (canvasRef.current === null) return;
    
    setIsExporting(true);
    setExportProgress(10);
    setExportStatus('preparing');
    
    try {
      // 1. Wait for any transitions or rendering to stabilize
      await new Promise(resolve => setTimeout(resolve, 800));
      setExportProgress(30);
      setExportStatus('rendering');
      
      const el = canvasRef.current;
      
      // 2. Ensure images are fully loaded and decoded
      const images = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(images.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 2000); // 2 second timeout per image
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));
      
      setExportProgress(50);

      // 3. Explicit dimensions for the export
      const width = el.offsetWidth;
      const height = el.offsetHeight;

      // 4. Generate Image
      setExportProgress(70);
      setExportStatus('saving');
      
      const options = {
        quality: 0.95,
        width: width,
        height: height,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
        }
      };

      let blob: Blob | null = null;
      let dataUrl: string | null = null;

      if (exportFormat === 'jpg') {
        // Safari workaround: call twice to ensure images are fully decoded and rendered
        await htmlToImage.toJpeg(el, options);
        dataUrl = await htmlToImage.toJpeg(el, options);
      } else {
        // Safari workaround: call twice to ensure images are fully decoded and rendered
        await htmlToImage.toPng(el, options);
        dataUrl = await htmlToImage.toPng(el, options);
      }
      
      if (!dataUrl || dataUrl === 'data:,') throw new Error('Export failed: Empty image data');
      
      // Convert dataUrl to Blob for sharing
      const fetchResponse = await fetch(dataUrl);
      blob = await fetchResponse.blob();
      
      if (!blob || blob.size < 100) throw new Error('Export failed: Empty blob');

      setExportProgress(90);
      const extension = exportFormat === 'jpg' ? 'jpg' : 'png';
      const fileName = `pic4pro-${Date.now()}.${extension}`;
      const objectUrl = URL.createObjectURL(blob);
      
      // 5. Handle download/share
      let shared = false;
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: exportFormat === 'jpg' ? 'image/jpeg' : 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: '[🟠Pic4pro] Export',
            });
            shared = true;
            setExportProgress(100);
            setExportStatus('success');
            setTimeout(() => {
              setIsExporting(false);
              setExportStatus('idle');
              setExportProgress(0);
            }, 1500);
            URL.revokeObjectURL(objectUrl);
            return;
          }
        } catch (shareErr) {
          console.log('Share failed, falling back to manual download', shareErr);
        }
      }

      // If share failed or is not available, show the image in the modal
      // so iOS users can long-press to save it to their gallery.
      setFinalExportedImage(dataUrl);
      setExportProgress(100);
      setExportStatus('success');
      
      // Also try to trigger a download for desktop users
      const link = document.createElement('a');
      link.download = fileName;
      link.href = objectUrl;
      link.click();
      
      // We don't auto-close here so the user can see the image and long press it
      
    } catch (err) {
      console.error('Export failed', err);
      alert('L\'exportation a échoué. Veuillez réessayer. Si le problème persiste, essayez de rafraîchir la page.');
      setIsExporting(false);
      setExportStatus('idle');
      setExportProgress(0);
    }
  }, [canvasRef, exportFormat]);

  const reset = () => {
    setMainImage(null);
    setProfileImage(null);
    setPunchline(DEFAULT_PUNCHLINE);
    setPunchlineSize(20);
    setSubText(DEFAULT_SUBTEXT);
    setSubTextSize(10);
    setPunchlineAlign('left');
    setLayout('portrait');
    setVersion('immersive');
    setMainPos({ x: 0, y: 0, zoom: 1, flipX: false });
    setProfilePos({ x: 0, y: 0, zoom: 1, flipX: false });
    setProfileContainerPos({ x: 0, y: 0 });
    setPunchlinePos({ x: 0, y: 0 });
    setFontFamily('crushed');
    setOverlayOpacity(60);
    setActiveControl(null);
    setFinalExportedImage(null);
    localStorage.removeItem('pic4pro_state');
  };

  // Gesture binds
  const bindMain = useGesture({
    onDrag: ({ delta: [dx, dy] }) => {
      setMainPos(prev => ({ ...prev, x: prev.x + dx * 0.15, y: prev.y + dy * 0.15 }));
    },
    onPinch: ({ delta: [d] }) => {
      setMainPos(prev => ({ ...prev, zoom: Math.max(1, Math.min(5, prev.zoom + d)) }));
    }
  }) as any;

  const bindProfile = useGesture({
    onDrag: ({ delta: [dx, dy] }) => {
      setProfileContainerPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    onPinch: ({ delta: [d] }) => {
      setProfilePos(prev => ({ ...prev, zoom: Math.max(1, Math.min(5, prev.zoom + d)) }));
    }
  }) as any;

  const bindPunchline = useGesture({
    onDrag: ({ delta: [dx, dy] }) => {
      setPunchlinePos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    onPinch: ({ delta: [d] }) => {
      setPunchlineSize(prev => Math.max(20, Math.min(150, prev + d * 20)));
    }
  }) as any;

  const bindSubText = useGesture({
    onDrag: ({ delta: [dx, dy] }) => {
      setSubTextPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    onPinch: ({ delta: [d] }) => {
      setSubTextSize(prev => Math.max(8, Math.min(40, prev + d * 10)));
    }
  }) as any;

  return (
    <div 
      className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#FF6321]/20"
      onClick={() => setActiveControl(null)}
    >
      {/* Export Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div 
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
            {finalExportedImage ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <h3 className="text-xl font-bold text-gray-900">Image prête ! 🎉</h3>
                <p className="text-sm text-gray-600">
                  <strong>Sur iPhone :</strong> Appuyez longuement sur l'image ci-dessous et choisissez "Enregistrer dans Photos".
                </p>
                <img 
                  src={finalExportedImage} 
                  alt="Export final" 
                  className="w-full rounded-lg shadow-md border border-gray-200" 
                />
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `pic4pro-${Date.now()}.${exportFormat}`;
                      link.href = finalExportedImage;
                      link.click();
                    }}
                    className="flex-1 bg-[#FF6321] hover:bg-[#E55A1F] text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Télécharger
                  </button>
                  <button 
                    onClick={() => {
                      setIsExporting(false);
                      setExportStatus('idle');
                      setFinalExportedImage(null);
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  {exportStatus === 'success' ? (
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 border-4 border-[#FF6321] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold">
                    {exportStatus === 'success' ? 'Terminé !' : 'Exportation en cours...'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                    {exportStatus === 'preparing' && 'Préparation des éléments...'}
                    {exportStatus === 'rendering' && 'Génération du visuel...'}
                    {exportStatus === 'saving' && 'Enregistrement du fichier...'}
                    {exportStatus === 'success' && 'Votre visuel est prêt !'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF6321] transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {exportProgress}% complété
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header 
        className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF6321] rounded-lg flex items-center justify-center">
              <Camera className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">🟠Pic4pro</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
            <div className="h-6 w-px bg-black/10 mx-2" />
            <button 
              onClick={() => exportImage()}
              disabled={isExporting}
              className="bg-[#FF6321] text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#E5591D] transition-all shadow-lg shadow-[#FF6321]/20 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exportation...' : 'Exporter la création'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
        {/* Editor Area */}
        <div 
          className="flex flex-col items-center justify-center bg-white rounded-3xl border border-black/5 p-8 min-h-[600px] shadow-sm relative"
          onClick={() => setActiveControl(null)}
        >
          {/* Floating Controls Panel */}
          <div 
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveControl(activeControl === 'main' ? null : 'main')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg",
                activeControl === 'main' ? "bg-[#FF6321] text-white" : "bg-white text-gray-500 border border-black/5"
              )}
            >
              <ImageIcon className="w-4 h-4" /> Image
            </button>
            <button 
              onClick={() => setActiveControl(activeControl === 'profile' ? null : 'profile')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg",
                activeControl === 'profile' ? "bg-[#FF6321] text-white" : "bg-white text-gray-500 border border-black/5"
              )}
            >
              <User className="w-4 h-4" /> Profil
            </button>
            <button 
              onClick={() => setActiveControl(activeControl === 'text' ? null : 'text')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg",
                activeControl === 'text' ? "bg-[#FF6321] text-white" : "bg-white text-gray-500 border border-black/5"
              )}
            >
              <Type className="w-4 h-4" /> Texte
            </button>
            {version === 'immersive' && (
              <button 
                onClick={() => setActiveControl(activeControl === 'overlay' ? null : 'overlay')}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-lg",
                  activeControl === 'overlay' ? "bg-[#FF6321] text-white" : "bg-white text-gray-500 border border-black/5"
                )}
              >
                <Layout className="w-4 h-4" /> Filtre
              </button>
            )}
          </div>

          {activeControl && (
            <Draggable nodeRef={draggableRef} handle=".drag-handle" bounds="parent">
              <div 
                ref={draggableRef} 
                className="absolute top-16 right-4 z-[70] bg-white/98 backdrop-blur-2xl border border-black/10 p-4 rounded-2xl shadow-2xl w-64 space-y-3 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="drag-handle cursor-move flex items-center justify-between border-b border-black/5 pb-2">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-[#FF6321]">
                    {activeControl === 'main' ? 'IMAGE' : activeControl === 'profile' ? 'PROFIL' : activeControl === 'text' ? 'TEXTE' : 'FILTRE'}
                  </h4>
                  <div className="flex items-center gap-2 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        if (activeControl === 'main') setMainPos(p => ({ ...p, flipX: !p.flipX }));
                        else if (activeControl === 'profile') setProfilePos(p => ({ ...p, flipX: !p.flipX }));
                      }}
                    className={cn(
                      "px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all",
                      (activeControl === 'main' ? mainPos.flipX : profilePos.flipX) 
                        ? "bg-[#FF6321] text-white" 
                        : "bg-gray-100 text-gray-400 hover:text-black"
                    )}
                    title="Miroir Horizontal"
                  >
                    Miroir
                  </button>
                  <button 
                    onClick={() => {
                      if (activeControl === 'main') setMainPos({ x: 0, y: 0, zoom: 1, flipX: false });
                      else if (activeControl === 'profile') setProfilePos({ x: 0, y: 0, zoom: 1, flipX: false });
                      else {
                        setPunchlineSize(25);
                        setPunchlinePos({ x: 0, y: 0 });
                      }
                    }}
                    className="text-[8px] font-bold text-gray-400 uppercase hover:text-[#FF6321] transition-colors"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => setActiveControl(null)}
                    className="text-gray-400 hover:text-black"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                {activeControl === 'text' ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Police</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFontFamily('bebas')}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                            fontFamily === 'bebas' 
                              ? "bg-[#FF6321] text-white border-[#FF6321]" 
                              : "bg-white text-gray-500 border-gray-200 hover:border-[#FF6321]"
                          )}
                          style={{ fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                          Bebas
                        </button>
                        <button
                          onClick={() => setFontFamily('crushed')}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                            fontFamily === 'crushed' 
                              ? "bg-[#FF6321] text-white border-[#FF6321]" 
                              : "bg-white text-gray-500 border-gray-200 hover:border-[#FF6321]"
                          )}
                          style={{ fontFamily: '"Crushed", cursive' }}
                        >
                          Crushed
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Taille</span>
                        <span className="text-[9px] font-mono text-[#FF6321]">{punchlineSize}px</span>
                      </div>
                      <input 
                        type="range" min="20" max="150" step="1" 
                        value={punchlineSize} 
                        onChange={(e) => setPunchlineSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">X Titre</span>
                        <input 
                          type="range" min="-200" max="200" step="1" 
                          value={punchlinePos.x} 
                          onChange={(e) => setPunchlinePos(p => ({ ...p, x: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Y Titre</span>
                        <input 
                          type="range" min="-200" max="200" step="1" 
                          value={punchlinePos.y} 
                          onChange={(e) => setPunchlinePos(p => ({ ...p, y: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Taille Sous-titre</span>
                        <span className="text-[9px] font-mono text-[#FF6321]">{subTextSize}px</span>
                      </div>
                      <input 
                        type="range" min="8" max="40" step="1" 
                        value={subTextSize} 
                        onChange={(e) => setSubTextSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">X Sous-titre</span>
                        <input 
                          type="range" min="-200" max="200" step="1" 
                          value={subTextPos.x} 
                          onChange={(e) => setSubTextPos(p => ({ ...p, x: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Y Sous-titre</span>
                        <input 
                          type="range" min="-200" max="200" step="1" 
                          value={subTextPos.y} 
                          onChange={(e) => setSubTextPos(p => ({ ...p, y: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                    </div>
                  </>
                ) : activeControl === 'overlay' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Activer le filtre</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={isOverlayEnabled}
                          onChange={(e) => setIsOverlayEnabled(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6321]"></div>
                      </label>
                    </div>
                    
                    <div className={cn("space-y-1 transition-opacity", !isOverlayEnabled && "opacity-50 pointer-events-none")}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Opacité</span>
                        <span className="text-[9px] font-mono text-[#FF6321]">{overlayOpacity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1" 
                        value={overlayOpacity} 
                        onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        disabled={!isOverlayEnabled}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Zoom</span>
                        <span className="text-[9px] font-mono text-[#FF6321]">{activeControl === 'main' ? mainPos.zoom.toFixed(2) : profilePos.zoom.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" step="0.01" 
                        value={activeControl === 'main' ? mainPos.zoom : profilePos.zoom} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (activeControl === 'main') setMainPos(p => ({ ...p, zoom: val }));
                          else setProfilePos(p => ({ ...p, zoom: val }));
                        }}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">X</span>
                        <input 
                          type="range" min="-100" max="100" step="1" 
                          value={activeControl === 'main' ? mainPos.x : profilePos.x} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (activeControl === 'main') setMainPos(p => ({ ...p, x: val }));
                            else setProfilePos(p => ({ ...p, x: val }));
                          }}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Y</span>
                        <input 
                          type="range" min="-100" max="100" step="1" 
                          value={activeControl === 'main' ? mainPos.y : profilePos.y} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (activeControl === 'main') setMainPos(p => ({ ...p, y: val }));
                            else setProfilePos(p => ({ ...p, y: val }));
                          }}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            </Draggable>
          )}

          <div 
            ref={canvasRef}
            className={cn(
              "relative bg-white transition-all duration-500 ease-in-out",
              layout === 'portrait' ? "aspect-[9/16] w-full max-w-[450px]" : 
              layout === 'landscape' ? "aspect-[16/9] w-full max-w-[800px]" :
              "aspect-[3/4] w-full max-w-[600px]"
            )}
          >
            <div className={cn(
              "w-full h-full flex items-center justify-center transition-all duration-500",
              version === 'classic' ? "p-4" : "p-0"
            )}>
              <div className={cn(
                "relative w-full h-full overflow-hidden transition-all duration-500",
                version === 'classic' ? "bg-white border border-gray-200 rounded-[2rem]" : "bg-transparent"
              )}>
                {/* The Orange Frame for Immersive - Moved inside for better export compatibility */}
                {version === 'immersive' && (
                  <div className="absolute top-0 left-0 w-full h-full border-[8px] border-[#FF6321] z-40 pointer-events-none" />
                )}
                {version === 'classic' ? (
                  /* VERSION 1: CLASSIC */
                  <div className="absolute top-0 left-0 w-full h-full p-6 flex flex-col">
                    <div 
                      className={cn(
                        "relative flex-1 rounded-2xl overflow-hidden bg-gray-50 group transition-all border border-[#FF6321]"
                      )}
                    >
                      {mainImage ? (
                          <img 
                            {...bindMain()}
                            src={mainImage} 
                            alt="Main" 
                            className="w-full h-full object-contain touch-none"
                            style={{ 
                              transform: `scale(${mainPos.zoom}) translate(${mainPos.x}%, ${mainPos.y}%) scaleX(${mainPos.flipX ? -1 : 1})` 
                            }}
                            referrerPolicy="no-referrer"
                          />
                      ) : (
                        <div 
                          className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); document.getElementById('main-upload')?.click(); }}
                        >
                          <ImageIcon className="w-12 h-12 opacity-20" />
                          <p className="text-xs uppercase tracking-widest font-medium opacity-50">Espace Image</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex items-end justify-between -space-x-6">
                      <div className="flex-1 flex flex-col gap-2 relative z-10 items-end">
                        <h2 
                          ref={punchlineRef}
                          {...bindPunchline()}
                          className={cn(
                            "leading-[1.1] tracking-tight text-white break-words bg-[#FF6321] w-fit rounded-xl relative z-10 touch-none select-none cursor-move",
                            fontFamily === 'bebas' ? "font-bebas uppercase" : "font-crushed"
                          )}
                          style={{ 
                            fontSize: `${(layout === 'landscape' || layout === 'square_3_4') ? punchlineSize * 0.75 : punchlineSize}px`,
                            textAlign: punchlineAlign,
                            padding: '0.15em 0.3em 0.15em 50px',
                            transform: `translate(${punchlinePos.x}px, ${punchlinePos.y}px)`
                          }}
                        >
                          {punchline}
                        </h2>
                        <p 
                          {...bindSubText()}
                          className={cn(
                            "font-bold text-white bg-[#232d3a] tracking-[0.15em] w-fit rounded-xl -mt-4 relative z-20 touch-none select-none cursor-move",
                            punchlineAlign === 'center' ? "text-center" : punchlineAlign === 'right' ? "text-right" : "text-left",
                            fontFamily === 'bebas' ? "font-bebas uppercase" : "font-crushed"
                          )}
                          style={{ 
                            width: punchlineWidth ? `${punchlineWidth}px` : 'auto',
                            fontSize: `${(layout === 'landscape' || layout === 'square_3_4') ? subTextSize * 0.75 : subTextSize}px`,
                            padding: '0.2em 0.4em 0.2em 3em',
                            transform: `translate(${subTextPos.x}px, ${subTextPos.y}px)`
                          }}
                        >
                          {subText}
                        </p>
                      </div>
                    </div>

                    <div 
                      {...bindProfile()}
                      className={cn(
                        "rounded-full border-2 border-white overflow-hidden bg-gray-100 flex-shrink-0 absolute z-30 touch-none cursor-move",
                        "w-[80px] h-[80px]"
                      )}
                      style={{
                        bottom: '24px',
                        left: '24px',
                        transform: `translate(${profileContainerPos.x}px, ${profileContainerPos.y}px)`
                      }}
                    >
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Profile" 
                          className="w-full h-full object-contain pointer-events-none"
                          style={{ 
                            transform: `scale(${profilePos.zoom}) translate(${profilePos.x}%, ${profilePos.y}%) scaleX(${profilePos.flipX ? -1 : 1})` 
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={(e) => { e.stopPropagation(); document.getElementById('profile-upload')?.click(); }}
                        >
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Footer Text */}
                    <div className={cn(
                      "mt-4 pt-4 border-t border-black/5 flex justify-between items-center transition-all"
                    )}>
                      <p className="text-[8px] font-bold text-[#FF6321] uppercase tracking-widest">
                        #MultiPoteⓇ sur LinkedIn
                      </p>
                      <p className="text-[8px] font-bold text-[#FF6321] uppercase tracking-widest">
                        Hanane Risayindi
                      </p>
                    </div>
                  </div>
                ) : (
                  /* VERSION 2: IMMERSIVE */
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col">
                    {/* Background Image */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gray-900">
                      {mainImage ? (
                        <img 
                          {...bindMain()}
                          src={mainImage} 
                          alt="Main" 
                          className="w-full h-full object-contain opacity-90 touch-none"
                          style={{ 
                            transform: `scale(${mainPos.zoom}) translate(${mainPos.x}%, ${mainPos.y}%) scaleX(${mainPos.flipX ? -1 : 1})` 
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div 
                          className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-white/20 gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={(e) => { e.stopPropagation(); document.getElementById('main-upload')?.click(); }}
                        >
                          <ImageIcon className="w-12 h-12" />
                          <p className="text-xs uppercase tracking-widest font-medium">Image de fond</p>
                        </div>
                      )}
                      {/* Stronger Gradient Overlay for readability */}
                      {isOverlayEnabled && (
                        <div 
                          className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/10 to-black pointer-events-none" 
                          style={{ opacity: overlayOpacity / 100 }}
                        />
                      )}
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
                      {/* Punchline */}
                      <h2 
                        ref={punchlineRef}
                        {...bindPunchline()}
                        className={cn(
                          "absolute z-10 break-words drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] pointer-events-auto touch-none select-none cursor-move",
                          "font-bold text-white uppercase leading-none",
                          fontFamily === 'bebas' ? "font-bebas" : "font-crushed"
                        )}
                        style={{ 
                          left: '8%',
                          top: '62%',
                          width: '45%',
                          fontSize: `${((layout === 'landscape' || layout === 'square_3_4') ? punchlineSize * 0.75 : punchlineSize) * 1.2}px`,
                          textAlign: 'left',
                          transform: `translate(${punchlinePos.x}px, ${punchlinePos.y}px)`
                        }}
                      >
                        {punchline}
                      </h2>

                      {/* Subtext */}
                      <p 
                        {...bindSubText()}
                        className={cn(
                          "absolute z-20 font-bold text-white uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-auto touch-none select-none cursor-move",
                          "font-sans"
                        )}
                        style={{ 
                          left: '8%',
                          top: '72%',
                          width: '40%',
                          fontSize: `${((layout === 'landscape' || layout === 'square_3_4') ? subTextSize * 0.75 : subTextSize) * 1.2}px`,
                          textAlign: 'left',
                          transform: `translate(${subTextPos.x}px, ${subTextPos.y}px)`
                        }}
                      >
                        {subText}
                      </p>

                      {/* Profile */}
                      <div 
                        {...bindProfile()}
                        className={cn(
                          "absolute z-30 rounded-full border-2 border-white shadow-2xl overflow-hidden bg-white/10 pointer-events-auto touch-none cursor-move",
                          !isExporting && "backdrop-blur-sm"
                        )}
                        style={{
                          left: '78%',
                          top: '74%',
                          width: '80px',
                          height: '80px',
                          transform: `translate(-50%, -50%) translate(${profileContainerPos.x}px, ${profileContainerPos.y}px)`
                        }}
                      >
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-full h-full object-contain pointer-events-none"
                            style={{ 
                              transform: `scale(${profilePos.zoom}) translate(${profilePos.x}%, ${profilePos.y}%) scaleX(${profilePos.flipX ? -1 : 1})` 
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-white/30 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={(e) => { e.stopPropagation(); document.getElementById('profile-upload')?.click(); }}
                          >
                            <User className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Text - Fixed at bottom with 3px margin from orange border */}
                    <div className={cn(
                      "absolute bottom-[3px] left-[3px] right-[3px] py-2 border-t border-white/10 flex justify-center items-center z-20 bg-[#232d3a]/50 rounded-b-sm",
                      !isExporting && "backdrop-blur-sm"
                    )}>
                      <p className="text-[8px] font-bold text-white uppercase tracking-[0.12em] drop-shadow-md px-2 text-center whitespace-nowrap">
                        #MultiPoteⓇ sur LinkedIn <span className="mx-2 opacity-40 text-[#FF6321]">|</span> Hanane Risayindi
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Branding Watermark */}
                <div className={cn(
                  "absolute top-8 right-8 text-[10px] font-bold uppercase tracking-[0.2em] z-50 pointer-events-none",
                  version === 'classic' ? "text-black/40" : "text-white/50"
                )}>
                  [🟠Pic4pro]
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-sm text-gray-400 font-medium">
            Prévisualisation du rendu final
          </p>
        </div>

        {/* Controls Sidebar */}
        <aside 
          className="space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Version Selection */}
          <section className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Style de mise en page
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['immersive', 'classic'] as VersionType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={cn(
                    "py-3 rounded-xl text-xs font-bold uppercase transition-all border",
                    version === v 
                      ? "bg-[#FF6321] text-white border-[#FF6321] shadow-lg shadow-[#FF6321]/20" 
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                  )}
                >
                  {v === 'classic' ? 'Classique' : 'Immersif'}
                </button>
              ))}
            </div>
          </section>

          {/* Layout Selection */}
          <section className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Format
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['portrait', 'landscape', 'square_3_4'] as LayoutType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setLayout(t)}
                  className={cn(
                    "py-3 rounded-xl text-xs font-bold uppercase transition-all border",
                    layout === t 
                      ? "bg-[#FF6321] text-white border-[#FF6321] shadow-lg shadow-[#FF6321]/20" 
                      : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                  )}
                >
                  {t === 'portrait' ? '9:16' : t === 'landscape' ? '16:9' : '3:4'}
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-black/5">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Format d'exportation</label>
              <div className="grid grid-cols-2 gap-2">
                {(['jpg', 'png'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={cn(
                      "py-2 rounded-lg text-[10px] font-bold uppercase transition-all border",
                      exportFormat === f 
                        ? "bg-black text-white border-black" 
                        : "bg-gray-50 text-gray-400 border-gray-100"
                    )}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Image Uploads */}
          <section className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Médias
            </h3>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  id="main-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'main')}
                />
                <label
                  htmlFor="main-upload"
                  className="flex items-center justify-between w-full bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5 text-[#FF6321]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Image principale</p>
                      <p className="text-[10px] text-gray-400 uppercase font-medium">Changer le visuel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mainImage && (
                      <button 
                        onClick={(e) => { e.preventDefault(); setMainImage(null); }}
                        className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Upload className="w-4 h-4 text-gray-300" />
                  </div>
                </label>
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="profile-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'profile')}
                />
                <label
                  htmlFor="profile-upload"
                  className="flex items-center justify-between w-full bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} className="w-full h-full object-contain" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">Photo de profil</p>
                      <p className="text-[10px] text-gray-400 uppercase font-medium">Le petit rond</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profileImage && (
                      <button 
                        onClick={(e) => { e.preventDefault(); setProfileImage(null); }}
                        className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Upload className="w-4 h-4 text-gray-300" />
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Text Editing */}
          <section className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
              <Type className="w-4 h-4" /> Textes
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Alignement</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'left', icon: AlignLeft },
                    { id: 'center', icon: AlignCenter },
                    { id: 'right', icon: AlignRight }
                  ].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setPunchlineAlign(a.id as any)}
                      className={cn(
                        "py-2 rounded-lg flex items-center justify-center transition-all border",
                        punchlineAlign === a.id 
                          ? "bg-black text-white border-black" 
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      )}
                    >
                      <a.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Punchline</label>
                <textarea
                  value={punchline}
                  onFocus={() => { if (punchline === DEFAULT_PUNCHLINE) setPunchline(''); }}
                  onBlur={() => { if (punchline === '') setPunchline(DEFAULT_PUNCHLINE); }}
                  onChange={(e) => setPunchline(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] transition-all resize-none h-24"
                  placeholder="Entrez votre punchline..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Sous-titre</label>
                <input
                  type="text"
                  value={subText}
                  onFocus={() => { if (subText === DEFAULT_SUBTEXT) setSubText(''); }}
                  onBlur={() => { if (subText === '') setSubText(DEFAULT_SUBTEXT); }}
                  onChange={(e) => setSubText(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6321]/20 focus:border-[#FF6321] transition-all"
                  placeholder="Auteur ou description..."
                />
              </div>
            </div>
          </section>

          {/* Tips */}
          <div className="p-6 bg-[#FF6321]/5 rounded-3xl border border-[#FF6321]/10">
            <p className="text-xs text-[#FF6321] font-medium leading-relaxed">
              <strong>Conseil :</strong> Utilisez des images de haute qualité pour un meilleur rendu lors de l'exportation. Le bord orange reste immuable pour garder votre style.
            </p>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em]">
          🟠Pic4pro &copy; 2026
        </p>
      </footer>
    </div>
  );
}
