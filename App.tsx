import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Type, 
  HardHat, 
  MapPin, 
  Image as ImageIcon,
  Eraser,
  Palette
} from 'lucide-react';
import { SignboardData, SignboardType, Position, Size } from './types';
import SignboardCanvas from './components/SignboardCanvas';

const INITIAL_DATA: SignboardData = {
  title: "",
  item: "",
  details: "",
  fontSizeTitle: 1.0,
  fontSizeItem: 1.0,
  fontSizeDetails: 1.0,
};

const DEFAULT_BOARD_WIDTH = 240;
const DEFAULT_BOARD_HEIGHT = 180;

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<SignboardData>(INITIAL_DATA);
  const [boardType, setBoardType] = useState<SignboardType>(SignboardType.BLACKBOARD);
  const [boardPos, setBoardPos] = useState<Position>({ x: 20, y: 20 });
  const [boardSize, setBoardSize] = useState<Size>({ width: DEFAULT_BOARD_WIDTH, height: DEFAULT_BOARD_HEIGHT });
  
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signboardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const resizingRef = useRef({ isResizing: false, startX: 0, startY: 0, initialW: 0, initialH: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setBoardPos({ x: 20, y: 20 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!imageSrc || !containerRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => { img.onload = resolve; });
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageElement = containerRef.current.querySelector('img');
    if (!imageElement) return;

    const displayedRect = imageElement.getBoundingClientRect();
    const scaleX = img.naturalWidth / displayedRect.width;
    const scaleY = img.naturalHeight / displayedRect.height;
    const offsetX = displayedRect.left - containerRect.left;
    const offsetY = displayedRect.top - containerRect.top;

    const boardRealX = (boardPos.x - offsetX) * scaleX;
    const boardRealY = (boardPos.y - offsetY) * scaleY;
    const boardRealW = boardSize.width * scaleX;
    const boardRealH = boardSize.height * scaleY;

    drawSignboardOnCanvas(ctx, boardRealX, boardRealY, boardRealW, boardRealH, boardData, boardType);

    const link = document.createElement('a');
    link.download = `genba-photo-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  const drawSignboardOnCanvas = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, data: SignboardData, type: SignboardType) => {
    ctx.save();
    let bgColor = type === SignboardType.BLACKBOARD ? '#004d40' : '#ffffff';
    let textColor = type === SignboardType.BLACKBOARD ? '#ffffff' : '#0f172a';
    let lineColor = type === SignboardType.BLACKBOARD ? '#ffffff' : '#0f172a';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = w * 0.01;
    ctx.strokeRect(x, y, w, h);

    const fontName = type === SignboardType.BLACKBOARD ? '"Noto Sans JP", serif' : '"Noto Sans JP", sans-serif';
    ctx.lineWidth = w * 0.005; 
    
    const headerH = h * 0.30;
    const rowH = headerH / 2;

    ctx.beginPath();
    ctx.moveTo(x, y + headerH);
    ctx.lineTo(x + w, y + headerH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + rowH);
    ctx.lineTo(x + w, y + rowH);
    ctx.stroke();

    const divX = x + (w * 0.20);
    ctx.beginPath();
    ctx.moveTo(divX, y);
    ctx.lineTo(divX, y + headerH);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(h * 0.06)}px ${fontName}`;
    ctx.fillText("工事名", x + (w * 0.1), y + (rowH * 0.5));
    ctx.fillText("場　所", x + (w * 0.1), y + headerH - (rowH * 0.5));

    ctx.textAlign = 'left';
    ctx.font = `${Math.floor(h * 0.07 * data.fontSizeTitle)}px ${fontName}`;
    ctx.fillText(data.title, x + (w * 0.22), y + (rowH * 0.5));
    
    ctx.font = `${Math.floor(h * 0.07 * data.fontSizeDetails)}px ${fontName}`;
    ctx.fillText(data.details, x + (w * 0.22), y + headerH - (rowH * 0.5));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `${Math.floor(h * 0.08 * data.fontSizeItem)}px ${fontName}`;
    
    const bodyY = y + headerH + (h * 0.03);
    const bodyX = x + (w * 0.03);
    const lineHeight = h * 0.1 * data.fontSizeItem;
    const lines = data.item.split('\n');
    lines.forEach((line, index) => {
        ctx.fillText(line, bodyX, bodyY + (index * lineHeight));
    });
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = signboardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const isResizeArea = (e.clientX - rect.left > rect.width - 20) && (e.clientY - rect.top > rect.height - 20);
    if (isResizeArea) {
      resizingRef.current = { isResizing: true, startX: e.clientX, startY: e.clientY, initialW: boardSize.width, initialH: boardSize.height };
      setIsResizing(true);
    } else {
      draggingRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialX: boardPos.x, initialY: boardPos.y };
    }
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (draggingRef.current.isDragging) {
      const dx = e.clientX - draggingRef.current.startX;
      const dy = e.clientY - draggingRef.current.startY;
      setBoardPos({ x: draggingRef.current.initialX + dx, y: draggingRef.current.initialY + dy });
    }
    if (resizingRef.current.isResizing) {
      const dx = e.clientX - resizingRef.current.startX;
      const dy = e.clientY - resizingRef.current.startY;
      setBoardSize({ width: Math.max(100, resizingRef.current.initialW + dx), height: Math.max(80, resizingRef.current.initialH + dy) });
    }
  }, [boardSize]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current.isDragging = false;
    resizingRef.current.isResizing = false;
    setIsResizing(false);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div className="flex flex-col h-screen md:flex-row bg-slate-100 overflow-hidden">
      <div className="flex-1 relative bg-slate-200 flex items-center justify-center overflow-hidden p-4">
        {imageSrc ? (
          <div ref={containerRef} className="relative shadow-xl overflow-hidden bg-black" style={{ maxHeight: '90vh', maxWidth: '100%' }}>
            <img src={imageSrc} alt="Work site" className="block max-h-[85vh] max-w-full object-contain pointer-events-none select-none" />
            <div ref={signboardRef} className="absolute cursor-move group touch-none" style={{ left: boardPos.x, top: boardPos.y, width: boardSize.width, height: boardSize.height }} onPointerDown={handlePointerDown}>
              <SignboardCanvas type={boardType} data={boardData} />
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500/50 rounded-tl cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/50 pointer-events-none transition-colors" />
              {/* サイズ表示 */}
              <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-xs font-mono rounded shadow-lg whitespace-nowrap transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'}`}>
                {Math.round(boardSize.width)} × {Math.round(boardSize.height)} px
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-10 border-4 border-dashed border-slate-300 rounded-xl text-slate-400">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium">写真をアップロードしてください</p>
            <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg">フォルダから選択</button>
          </div>
        )}
      </div>
      <div className="w-full md:w-96 bg-white shadow-2xl z-20 flex flex-col h-[50vh] md:h-screen">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h1 className="font-bold text-slate-700 flex items-center gap-2"><HardHat className="w-5 h-5 text-amber-500" />工事用看板エディタ</h1>
          <button onClick={() => setBoardData(INITIAL_DATA)} className="p-2 text-slate-400 hover:text-red-500 transition"><Eraser className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Palette className="w-3 h-3" /> 看板スタイル</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBoardType(SignboardType.BLACKBOARD)} className={`h-10 rounded border-2 flex items-center justify-center font-bold text-xs transition ${boardType === SignboardType.BLACKBOARD ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-slate-200 text-slate-400'}`}>黒板 (標準)</button>
              <button onClick={() => setBoardType(SignboardType.WHITE)} className={`h-10 rounded border-2 flex items-center justify-center font-bold text-xs transition ${boardType === SignboardType.WHITE ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'}`}>ホワイト</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex justify-between"><span>工事名</span><span className="text-[10px] text-slate-400">文字 x{boardData.fontSizeTitle.toFixed(1)}</span></label>
              <div className="relative"><Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" value={boardData.title} onChange={e => setBoardData({...boardData, title: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例：〇〇新築工事" /></div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={boardData.fontSizeTitle} onChange={e => setBoardData({...boardData, fontSizeTitle: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex justify-between"><span>場所</span><span className="text-[10px] text-slate-400">文字 x{boardData.fontSizeDetails.toFixed(1)}</span></label>
              <div className="relative"><MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" value={boardData.details} onChange={e => setBoardData({...boardData, details: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例：東京都〇〇区" /></div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={boardData.fontSizeDetails} onChange={e => setBoardData({...boardData, fontSizeDetails: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex justify-between"><span>内容</span><span className="text-[10px] text-slate-400">文字 x{boardData.fontSizeItem.toFixed(1)}</span></label>
              <div className="relative"><HardHat className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><textarea value={boardData.item} rows={6} onChange={e => setBoardData({...boardData, item: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="例：\n床養生状況\n　１重目" /></div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={boardData.fontSizeItem} onChange={e => setBoardData({...boardData, fontSizeItem: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"><Upload className="w-4 h-4" /><span className="hidden sm:inline">写真変更</span></button>
          <button onClick={handleDownload} disabled={!imageSrc} className={`flex-[2] py-3 px-4 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition text-white ${imageSrc ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}><Download className="w-4 h-4" />保存する</button>
        </div>
      </div>
    </div>
  );
}
export default App;