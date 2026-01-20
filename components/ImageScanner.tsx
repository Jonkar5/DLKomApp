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
    const [isProcessing, setIsProcessing] = useState(false);
    const [cropArea, setCropArea] = useState({ top: 10, left: 10, right: 10, bottom: 10 });

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

            // Camera full resolution
            const vWidth = video.videoWidth;
            const vHeight = video.videoHeight;

            // The guide in UI is roughly 3/4 aspect ratio in the center
            // We'll capture the central 80% of the horizontal/vertical center for simplicity
            // or more precisely: calculate the 3:4 rectangle centered.

            let cropWidth, cropHeight, startX, startY;

            if (vWidth / vHeight > 3 / 4) {
                // Video is wider than 3:4
                cropHeight = vHeight * 0.8;
                cropWidth = cropHeight * (3 / 4);
            } else {
                // Video is narrower than 3:4
                cropWidth = vWidth * 0.8;
                cropHeight = cropWidth * (4 / 3);
            }

            startX = (vWidth - cropWidth) / 2;
            startY = (vHeight - cropHeight) / 2;

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            const dataUri = canvas.toDataURL('image/jpeg', 0.9);
            setCurrentImage(dataUri);
            setRotation(0);
            setFilter('none');
            setStep('edit');
        }
    };

    // --- Processing Logic ---
    const applyPerspective = () => {
        if (!currentImage || isProcessing) return;

        setIsProcessing(true);
        const img = new Image();
        img.onload = () => {
            try {
                const processedUri = processImage(img);
                setPages(prev => [...prev, processedUri]);
                setStep('preview');
                setCurrentImage(null);
            } catch (err) {
                console.error("Error processing image:", err);
                alert("Error al procesar la imagen.");
            } finally {
                setIsProcessing(false);
            }
        };
        img.onerror = () => {
            setIsProcessing(false);
            alert("Error al cargar la imagen para procesar.");
        };
        img.src = currentImage;
    };

    const processImage = (img: HTMLImageElement): string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Handle rotation
        if (rotation % 180 === 0) {
            canvas.width = img.width;
            canvas.height = img.height;
        } else {
            canvas.width = img.height;
            canvas.width = img.height;
            canvas.height = img.width;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Apply Filters (Canvas implementation matching CSS filters)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        if (filter !== 'none') {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                if (filter === 'bw') {
                    gray = gray > 120 ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = gray;
                } else if (filter === 'magic') {
                    // High contrast + brightness
                    data[i] = Math.min(255, (r - 128) * 1.5 + 128 + 20);
                    data[i + 1] = Math.min(255, (g - 128) * 1.5 + 128 + 20);
                    data[i + 2] = Math.min(255, (b - 128) * 1.5 + 128 + 20);
                } else if (filter === 'grayscale') {
                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

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
                            <div className="relative max-w-full max-h-full">
                                <img
                                    src={currentImage}
                                    className="max-w-full max-h-full object-contain rounded-lg transition-all duration-300"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        filter: filter === 'bw' ? 'grayscale(1) contrast(500%)' :
                                            filter === 'grayscale' ? 'grayscale(1)' :
                                                filter === 'magic' ? 'contrast(1.5) brightness(1.2)' : 'none'
                                    }}
                                />
                                {/* Perspective Grid placeholder */}
                                <div className="absolute inset-0 border-2 border-indigo-500/50 pointer-events-none">
                                    <Crop className="absolute -top-3 -left-3 w-6 h-6 text-indigo-500 fill-white" />
                                    <Crop className="absolute -top-3 -right-3 w-6 h-6 text-indigo-500 fill-white rotate-90" />
                                    <Crop className="absolute -bottom-3 -right-3 w-6 h-6 text-indigo-500 fill-white rotate-180" />
                                    <Crop className="absolute -bottom-3 -left-3 w-6 h-6 text-indigo-500 fill-white -rotate-90" />
                                </div>
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
                                <span className="text-[10px]">Blanco/N</span>
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
                            <button onClick={() => setStep('capture')} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">Atrás</button>
                            <button
                                onClick={applyPerspective}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <RotateCw className="w-4 h-4 animate-spin" /> Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" /> Confirmar
                                    </>
                                )}
                            </button>
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
