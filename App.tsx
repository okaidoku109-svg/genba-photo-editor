import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Type, 
  HardHat, 
  MapPin, 
  Image as ImageIcon,
  Eraser,
  Palette,
  MousePointer2,
  Circle,
  Undo2,
  Pipette,
  Plus,
  Trash2
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

type ToolMode = 'select' | 'eraser' | 'eyedropper' | 'text';
type EraserType = 'blur' | 'fill';

interface EraserStroke {
  points: { x: number; y: number }[];
  brushSize: number;
  eraserType: EraserType;
  fillColor: string;
}

interface TextLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<SignboardData>(INITIAL_DATA);
  const [boardType, setBoardType] = useState<SignboardType>(SignboardType.BLACKBOARD);
  const [boardPos, setBoardPos] = useState<Position>({ x: 20, y: 20 });
  const [boardSize, setBoardSize] = useState<Size>({ width: DEFAULT_BOARD_WIDTH, height: DEFAULT_BOARD_HEIGHT });
  const [showBoard, setShowBoard] = useState(false);
  
  const [isResizing, setIsResizing] = useState(false);
  
  // 消しゴム機能用ステート
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [eraserType, setEraserType] = useState<EraserType>('blur');
  const [brushSize, setBrushSize] = useState(30);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [eraserStrokes, setEraserStrokes] = useState<EraserStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  
  // テキストラベル用ステート
  const [textLabels, setTextLabels] = useState<TextLabel[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextContent, setNewTextContent] = useState('');
  const [newTextFontSize, setNewTextFontSize] = useState(24);
  const [newTextColor, setNewTextColor] = useState('#000000');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signboardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const resizingRef = useRef({ isResizing: false, startX: 0, startY: 0, initialW: 0, initialH: 0 });
  const textDraggingRef = useRef({ isDragging: false, textId: '', startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setBoardPos({ x: 20, y: 20 });
          setEraserStrokes([]); // 画像変更時にストロークをリセット
          setTextLabels([]); // 画像変更時にテキストラベルをリセット
          setSelectedTextId(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas描画（消しゴム効果適用）
  const drawEraserCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas サイズを画像表示サイズに合わせる
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 画像を描画
    ctx.drawImage(img, 0, 0, rect.width, rect.height);

    // 消しゴムストロークを描画
    eraserStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.brushSize;

      if (stroke.eraserType === 'fill') {
        ctx.strokeStyle = stroke.fillColor;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else {
        // ぼかし効果
        ctx.filter = 'blur(10px)';
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.filter = 'none';
      }
      ctx.restore();
    });

    // 現在描画中のストローク
    if (currentStroke.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (eraserType === 'fill') {
        ctx.strokeStyle = fillColor;
      } else {
        ctx.filter = 'blur(10px)';
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
      }

      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      currentStroke.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }, [eraserStrokes, currentStroke, brushSize, eraserType, fillColor]);

  useEffect(() => {
    if (imageSrc && (eraserStrokes.length > 0 || toolMode === 'eraser' || toolMode === 'eyedropper')) {
      drawEraserCanvas();
    }
  }, [imageSrc, toolMode, eraserStrokes, currentStroke, drawEraserCanvas]);

  // スポイトで色を取得
  const getColorAtPosition = (x: number, y: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return fillColor;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return fillColor;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // 消しゴム描画ハンドラ
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // スポイトモード
    if (toolMode === 'eyedropper') {
      const color = getColorAtPosition(x, y);
      setFillColor(color);
      setEraserType('fill');
      setToolMode('eraser');
      return;
    }
    
    if (toolMode !== 'eraser') return;
    
    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || toolMode !== 'eraser') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const handleCanvasPointerUp = () => {
    if (!isDrawing) return;
    
    if (currentStroke.length > 1) {
      setEraserStrokes(prev => [...prev, {
        points: currentStroke,
        brushSize,
        eraserType,
        fillColor
      }]);
    }
    
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setEraserStrokes(prev => prev.slice(0, -1));
  };

  // テキストラベル追加
  const handleAddText = () => {
    if (!newTextContent.trim()) return;
    
    const newLabel: TextLabel = {
      id: `text-${Date.now()}`,
      text: newTextContent,
      x: 50,
      y: 50,
      fontSize: newTextFontSize,
      color: newTextColor
    };
    
    setTextLabels(prev => [...prev, newLabel]);
    setNewTextContent('');
    setToolMode('select');
  };

  // テキストラベル削除
  const handleDeleteText = (id: string) => {
    setTextLabels(prev => prev.filter(label => label.id !== id));
    setSelectedTextId(null);
  };

  // テキストラベル更新
  const handleUpdateText = (id: string, updates: Partial<TextLabel>) => {
    setTextLabels(prev => prev.map(label => 
      label.id === id ? { ...label, ...updates } : label
    ));
  };

  // テキストラベルのドラッグ開始
  const handleTextPointerDown = (e: React.PointerEvent, label: TextLabel) => {
    if (toolMode !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedTextId(label.id);
    textDraggingRef.current = {
      isDragging: true,
      textId: label.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: label.x,
      initialY: label.y
    };
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

    // 消しゴムストロークを実際の画像サイズにスケーリングして描画
    const displayCanvas = canvasRef.current;
    if (displayCanvas) {
      const scaleX = img.naturalWidth / displayCanvas.width;
      const scaleY = img.naturalHeight / displayCanvas.height;

      eraserStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.brushSize * scaleX;

        if (stroke.eraserType === 'fill') {
          ctx.strokeStyle = stroke.fillColor;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
          stroke.points.forEach(point => {
            ctx.lineTo(point.x * scaleX, point.y * scaleY);
          });
          ctx.stroke();
        } else {
          // ぼかしは重ねて描画
          for (let i = 0; i < 5; i++) {
            ctx.filter = `blur(${15 * scaleX}px)`;
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
            stroke.points.forEach(point => {
              ctx.lineTo(point.x * scaleX, point.y * scaleY);
            });
            ctx.stroke();
          }
          ctx.filter = 'none';
        }
        ctx.restore();
      });
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageElement = containerRef.current.querySelector('img') || canvasRef.current;
    if (!imageElement) return;

    const displayedRect = imageElement.getBoundingClientRect();
    const scaleX = img.naturalWidth / displayedRect.width;
    const scaleY = img.naturalHeight / displayedRect.height;
    const offsetX = displayedRect.left - containerRect.left;
    const offsetY = displayedRect.top - containerRect.top;

    // 看板が表示されている場合のみ描画
    if (showBoard) {
      const boardRealX = (boardPos.x - offsetX) * scaleX;
      const boardRealY = (boardPos.y - offsetY) * scaleY;
      const boardRealW = boardSize.width * scaleX;
      const boardRealH = boardSize.height * scaleY;

      drawSignboardOnCanvas(ctx, boardRealX, boardRealY, boardRealW, boardRealH, boardData, boardType);
    }

    // テキストラベルを描画
    textLabels.forEach(label => {
      const textRealX = (label.x - offsetX) * scaleX;
      const textRealY = (label.y - offsetY) * scaleY;
      const textRealFontSize = label.fontSize * scaleX;
      
      ctx.save();
      ctx.font = `bold ${textRealFontSize}px "Noto Sans JP", sans-serif`;
      ctx.fillStyle = label.color;
      ctx.textBaseline = 'top';
      
      // テキストシャドウ効果
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4 * scaleX;
      ctx.shadowOffsetX = 2 * scaleX;
      ctx.shadowOffsetY = 2 * scaleX;
      
      const lines = label.text.split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(line, textRealX, textRealY + (index * textRealFontSize * 1.2));
      });
      ctx.restore();
    });

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
    if (toolMode !== 'select') return;
    
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
    if (textDraggingRef.current.isDragging) {
      const dx = e.clientX - textDraggingRef.current.startX;
      const dy = e.clientY - textDraggingRef.current.startY;
      handleUpdateText(textDraggingRef.current.textId, {
        x: textDraggingRef.current.initialX + dx,
        y: textDraggingRef.current.initialY + dy
      });
    }
  }, [boardSize]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current.isDragging = false;
    resizingRef.current.isResizing = false;
    textDraggingRef.current.isDragging = false;
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
            {/* 元画像（Canvasが表示される場合は非表示だが参照用） */}
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="Work site" 
              className={`block max-h-[85vh] max-w-full object-contain select-none ${(eraserStrokes.length > 0 || toolMode === 'eraser' || toolMode === 'eyedropper') ? 'invisible' : 'pointer-events-none'}`}
              onLoad={() => drawEraserCanvas()}
            />
            
            {/* 消しゴム/スポイト用Canvas（ストロークがある場合は常に表示） */}
            {(eraserStrokes.length > 0 || toolMode === 'eraser' || toolMode === 'eyedropper') && (
              <canvas
                ref={canvasRef}
                className={`absolute top-0 left-0 touch-none ${toolMode === 'eyedropper' ? 'cursor-cell' : toolMode === 'eraser' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
              />
            )}
            
            {/* 看板 */}
            {showBoard && (
              <div 
                ref={signboardRef} 
                className={`absolute group touch-none ${toolMode === 'select' ? 'cursor-move' : 'pointer-events-none'}`}
                style={{ left: boardPos.x, top: boardPos.y, width: boardSize.width, height: boardSize.height }} 
                onPointerDown={handlePointerDown}
              >
                <SignboardCanvas type={boardType} data={boardData} />
                {toolMode === 'select' && (
                  <>
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500/50 rounded-tl cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/50 pointer-events-none transition-colors" />
                    <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-xs font-mono rounded shadow-lg whitespace-nowrap transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'}`}>
                      {Math.round(boardSize.width)} × {Math.round(boardSize.height)} px
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* テキストラベル */}
            {textLabels.map(label => (
              <div
                key={label.id}
                className={`absolute touch-none ${toolMode === 'select' ? 'cursor-move' : 'pointer-events-none'} ${selectedTextId === label.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                style={{
                  left: label.x,
                  top: label.y,
                  fontSize: label.fontSize,
                  color: label.color,
                  fontFamily: '"Noto Sans JP", sans-serif',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.5)',
                  whiteSpace: 'pre-wrap'
                }}
                onPointerDown={(e) => handleTextPointerDown(e, label)}
              >
                {label.text}
              </div>
            ))}
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
          
          {/* ツールモード選択 */}
          {imageSrc && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> ツール</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setToolMode('select')}
                  className={`h-10 rounded border-2 flex items-center justify-center gap-1 font-bold text-xs transition ${toolMode === 'select' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400'}`}
                >
                  <MousePointer2 className="w-4 h-4" /> 選択
                </button>
                <button
                  onClick={() => setToolMode('eraser')}
                  className={`h-10 rounded border-2 flex items-center justify-center gap-1 font-bold text-xs transition ${toolMode === 'eraser' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-400'}`}
                >
                  <Eraser className="w-4 h-4" /> 消しゴム
                </button>
                <button
                  onClick={() => setToolMode('text')}
                  className={`h-10 rounded border-2 flex items-center justify-center gap-1 font-bold text-xs transition ${toolMode === 'text' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-200 text-slate-400'}`}
                >
                  <Type className="w-4 h-4" /> テキスト
                </button>
              </div>
            </div>
          )}

          {/* テキスト追加設定 */}
          {imageSrc && toolMode === 'text' && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <label className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3" /> テキスト追加
              </label>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">テキスト内容</label>
                <textarea
                  value={newTextContent}
                  onChange={(e) => setNewTextContent(e.target.value)}
                  placeholder="入力してください..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                  <span>文字サイズ</span>
                  <span className="text-purple-600">{newTextFontSize}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={newTextFontSize}
                  onChange={(e) => setNewTextFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">文字色</label>
                <div className="flex gap-2 flex-wrap items-center">
                  {['#000000', '#ffffff', '#ff0000', '#0000ff', '#008000'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTextColor(color)}
                      className={`w-8 h-8 rounded border-2 transition ${newTextColor === color ? 'border-purple-500 scale-110' : 'border-slate-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newTextColor}
                    onChange={(e) => setNewTextColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-2 border-slate-300"
                  />
                </div>
              </div>
              
              <button
                onClick={handleAddText}
                disabled={!newTextContent.trim()}
                className={`w-full h-10 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${newTextContent.trim() ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-200 text-slate-400'}`}
              >
                <Plus className="w-4 h-4" /> テキストを追加
              </button>
            </div>
          )}

          {/* 選択中のテキスト編集 */}
          {imageSrc && toolMode === 'select' && selectedTextId && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                  <Type className="w-3 h-3" /> テキスト編集
                </label>
                <button
                  onClick={() => handleDeleteText(selectedTextId)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" /> 削除
                </button>
              </div>
              
              {(() => {
                const label = textLabels.find(l => l.id === selectedTextId);
                if (!label) return null;
                return (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">テキスト内容</label>
                      <textarea
                        value={label.text}
                        onChange={(e) => handleUpdateText(label.id, { text: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>文字サイズ</span>
                        <span className="text-blue-600">{label.fontSize}px</span>
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={label.fontSize}
                        onChange={(e) => handleUpdateText(label.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">文字色</label>
                      <div className="flex gap-2 flex-wrap items-center">
                        {['#000000', '#ffffff', '#ff0000', '#0000ff', '#008000'].map(color => (
                          <button
                            key={color}
                            onClick={() => handleUpdateText(label.id, { color })}
                            className={`w-8 h-8 rounded border-2 transition ${label.color === color ? 'border-blue-500 scale-110' : 'border-slate-300'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input
                          type="color"
                          value={label.color}
                          onChange={(e) => handleUpdateText(label.id, { color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-2 border-slate-300"
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 消しゴム設定 */}
          {imageSrc && toolMode === 'eraser' && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1">
                  <Eraser className="w-3 h-3" /> 消しゴム設定
                </label>
                {eraserStrokes.length > 0 && (
                  <button
                    onClick={handleUndo}
                    className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 transition"
                  >
                    <Undo2 className="w-3 h-3" /> 戻す
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">タイプ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEraserType('blur')}
                    className={`h-9 rounded border-2 flex items-center justify-center font-bold text-xs transition ${eraserType === 'blur' ? 'border-orange-500 bg-white text-orange-600' : 'border-slate-200 bg-white text-slate-400'}`}
                  >
                    ぼかし
                  </button>
                  <button
                    onClick={() => setEraserType('fill')}
                    className={`h-9 rounded border-2 flex items-center justify-center font-bold text-xs transition ${eraserType === 'fill' ? 'border-orange-500 bg-white text-orange-600' : 'border-slate-200 bg-white text-slate-400'}`}
                  >
                    塗りつぶし
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Circle className="w-3 h-3" /> ブラシサイズ</span>
                  <span className="text-orange-600">{brushSize}px</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              
              {eraserType === 'fill' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>塗りつぶし色</span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: fillColor }}></span>
                      <span className="text-[10px] text-slate-400 font-mono">{fillColor}</span>
                    </span>
                  </label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {['#ffffff', '#000000', '#808080', '#d1d5db'].map(color => (
                      <button
                        key={color}
                        onClick={() => setFillColor(color)}
                        className={`w-8 h-8 rounded border-2 transition ${fillColor === color ? 'border-orange-500 scale-110' : 'border-slate-300'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-2 border-slate-300"
                    />
                    <button
                      onClick={() => setToolMode('eyedropper')}
                      className="w-8 h-8 rounded border-2 flex items-center justify-center transition border-slate-300 bg-white hover:bg-orange-50 hover:border-orange-300"
                      title="画像から色を取得"
                    >
                      <Pipette className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">💡 スポイトで画像から色を取得できます</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Palette className="w-3 h-3" /> 看板スタイル</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setBoardType(SignboardType.BLACKBOARD); setShowBoard(true); }} 
                className={`h-10 rounded border-2 flex items-center justify-center font-bold text-xs transition ${showBoard && boardType === SignboardType.BLACKBOARD ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600'}`}
              >
                黒板 (標準)
              </button>
              <button 
                onClick={() => { setBoardType(SignboardType.WHITE); setShowBoard(true); }} 
                className={`h-10 rounded border-2 flex items-center justify-center font-bold text-xs transition ${showBoard && boardType === SignboardType.WHITE ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}
              >
                ホワイト
              </button>
            </div>
            {showBoard && (
              <button 
                onClick={() => setShowBoard(false)} 
                className="w-full h-8 rounded border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 text-xs transition"
              >
                看板を非表示にする
              </button>
            )}
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
