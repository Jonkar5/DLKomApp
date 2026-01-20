import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RotateCw, Crop, Layers, Maximize, Plus, Trash2, ZoomIn } from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface Point {
    x: number;
    y: number;
}

interface ImageScannerProps {
    onSave: (pdfDataUri: string, pages: string[]) => void;
    onClose: () => void;
}

const ImageScanner: React.FC<ImageScannerProps> = ({ onSave, onClose }) => {
    const [step, setStep] = useState<'capture' | 'edit' | 'preview'>('capture');
    const [pages, setPages] = useState<string[]>([]);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [points, setPoints] = useState<Point[]>([
        { x: 10, y: 10 }, { x: 90, y: 10 },
        { x: 90, y: 90 }, { x: 10, y: 90 }
    ]);
    const [filter, setFilter] = useState<'none' | 'bw' | 'grayscale' | 'magic'>('none');
    const [rotation, setRotation] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const editCanvasRef = useRef<HTMLCanvasElement>(null);

    // --- Camera Logic ---
    useEffect(() => {
        if (step === 'capture') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [step]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("No se pudo acceder a la cámara. Revisa los permisos.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            const dataUri = canvas.toDataURL('image/jpeg', 0.9);
            setCurrentImage(dataUri);
            setStep('edit');
            // Reset points to detected or default
            setPoints([
                { x: 10, y: 10 }, { x: 90, y: 10 },
                { x: 90, y: 90 }, { x: 10, y: 90 }
            ]);
        }
    };

    // --- Processing Logic ---
    const applyPerspective = () => {
        if (!currentImage || !editCanvasRef.current) return;

        const img = new Image();
        img.onload = () => {
            const canvas = editCanvasRef.current!;
            const ctx = canvas.getContext('2d')!;

            // Simple approach for demo: we'll just crop for now 
            // Real perspective warp requires a complex transform matrix
            // For now, let's implement the "Finalize" flow
            const processedUri = processImage(img);
            setPages([...pages, processedUri]);
            setStep('preview');
        };
        img.src = currentImage;
    };

    const processImage = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Handle rotation
        if (rotation % 180 === 0) {
            canvas.width = img.width;
            canvas.height = img.height;
        } else {
            canvas.width = img.height;
            canvas.height = img.width;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Apply Filters
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        if (filter === 'grayscale' || filter === 'bw' || filter === 'magic') {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                if (filter === 'bw') {
                    gray = gray > 128 ? 255 : 0;
                } else if (filter === 'magic') {
                    // Contrast enhancement
                    gray = (gray - 128) * 1.5 + 128;
                    gray = Math.max(0, Math.min(255, gray));
                }

                data[i] = data[i + 1] = data[i + 2] = gray;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    };

    const finalizePdf = () => {
        const doc = new jsPDF();
        pages.forEach((page, index) => {
            if (index > 0) doc.addPage();
            doc.addImage(page, 'JPEG', 0, 0, 210, 297);
        });
        const pdfUri = doc.output('datauristring');
        onSave(pdfUri, pages);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
                <h3 className="text-white font-bold">Escáner de Facturas</h3>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X /></button>
            </div>

            {/* Content */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {step === 'capture' && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-8">
                            <div className="w-full max-w-sm aspect-[3/4] border-2 border-white/30 rounded-xl" />
                            <div className="flex items-center gap-8">
                                <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center overflow-hidden bg-slate-800">
                                    {pages.length > 0 && <img src={pages[pages.length - 1]} className="w-full h-full object-cover" />}
                                </div>
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-xl flex items-center justify-center group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-100 group-active:scale-95 transition-transform" />
                                </button>
                                <div className="text-white text-sm font-bold bg-black/40 px-3 py-1 rounded-full">
                                    {pages.length} págs
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'edit' && currentImage && (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 relative p-4 flex items-center justify-center">
                            <img src={currentImage} className="max-w-full max-h-full object-contain rounded-lg" style={{ transform: `rotate(${rotation}deg)` }} />
                            {/* Perspective Grid placeholder */}
                            <div className="absolute inset-4 border-2 border-indigo-500/50 pointer-events-none">
                                <Crop className="absolute -top-3 -left-3 w-6 h-6 text-indigo-500 fill-white" />
                                <Crop className="absolute -top-3 -right-3 w-6 h-6 text-indigo-500 fill-white rotate-90" />
                                <Crop className="absolute -bottom-3 -right-3 w-6 h-6 text-indigo-500 fill-white rotate-180" />
                                <Crop className="absolute -bottom-3 -left-3 w-6 h-6 text-indigo-500 fill-white -rotate-90" />
                            </div>
                        </div>

                        {/* Edit Toolbar */}
                        <div className="bg-slate-900 grid grid-cols-4 gap-2 p-4">
                            <button onClick={() => setRotation(r => (r + 90) % 360)} className="flex flex-col items-center gap-1 text-slate-400">
                                <RotateCw className="w-5 h-5" />
                                <span className="text-[10px]">Rotar</span>
                            </button>
                            <button onClick={() => setFilter(f => f === 'bw' ? 'none' : 'bw')} className={`flex flex-col items-center gap-1 ${filter === 'bw' ? 'text-indigo-400' : 'text-slate-400'}`}>
                                <Layers className="w-5 h-5" />
                                <span className="text-[10px]">B/N</span>
                            </button>
                            <button onClick={() => setFilter(f => f === 'magic' ? 'none' : 'magic')} className={`flex flex-col items-center gap-1 ${filter === 'magic' ? 'text-indigo-400' : 'text-slate-400'}`}>
                                <Maximize className="w-5 h-5" />
                                <span className="text-[10px]">Mágico</span>
                            </button>
                            <button onClick={() => setFilter(f => f === 'grayscale' ? 'none' : 'grayscale')} className={`flex flex-col items-center gap-1 ${filter === 'grayscale' ? 'text-indigo-400' : 'text-slate-400'}`}>
                                <Layers className="w-5 h-5" />
                                <span className="text-[10px]">Gris</span>
                            </button>
                        </div>

                        <div className="flex gap-4 p-4 bg-slate-950 border-t border-slate-800">
                            <button onClick={() => setStep('capture')} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">Repetir</button>
                            <button onClick={applyPerspective} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Confirmar</button>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {pages.map((page, i) => (
                                <div key={i} className="relative group">
                                    <img src={page} className="w-full rounded-xl border-4 border-white shadow-xl" />
                                    <button
                                        onClick={() => setPages(pages.filter((_, idx) => idx !== i))}
                                        className="absolute -top-2 -right-2 p-2 bg-rose-500 text-white rounded-full shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 p-4 bg-slate-950 border-t border-slate-800">
                            <button onClick={() => setStep('capture')} className="flex-1 py-3 bg-white text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" /> Añadir hoja
                            </button>
                            <button onClick={finalizePdf} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" /> Guardar Todo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={editCanvasRef} className="hidden" />
        </div>
    );
};

export default ImageScanner;
