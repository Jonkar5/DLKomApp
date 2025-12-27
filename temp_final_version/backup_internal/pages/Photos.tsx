import React, { useRef, useState } from 'react';
import { Image as ImageIcon, ArrowLeft, Upload, User, ChevronRight, Camera, Trash2, Maximize2, X } from 'lucide-react';
import { Client, Photo } from '../types';

interface PhotosProps {
    onBack: () => void;
    clients: Client[];
    photos: Photo[];
    onAddPhoto: (photo: Photo) => void;
    onDeletePhoto: (id: string) => void;
}

const Photos: React.FC<PhotosProps> = ({ onBack, clients, photos, onAddPhoto, onDeletePhoto }) => {
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<'actual' | 'final'>('actual');
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClientId(e.target.value);
    };

    const handleUploadClick = () => {
        if (!selectedClientId) {
            alert('Por favor, selecciona un cliente primero.');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhoto: Photo = {
                    id: Date.now().toString(),
                    clientId: selectedClientId,
                    category: activeCategory,
                    url: reader.result as string,
                    date: new Date().toISOString()
                };
                onAddPhoto(newPhoto);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Borrar esta foto?')) {
            onDeletePhoto(id);
        }
    };

    // Filter photos
    const filteredPhotos = photos.filter(p =>
        p.clientId === selectedClientId && p.category === activeCategory
    );

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="group p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 shadow-sm transition-all duration-300">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Galería</h2>
                        <p className="text-slate-400 font-medium text-sm">Registro visual de obra</p>
                    </div>
                </div>
            </div>

            {/* CLIENT SELECTOR */}
            <div className="relative group max-w-xl mx-auto md:mx-0">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-hover:text-sky-500 text-slate-400">
                    <User className="w-5 h-5" />
                </div>
                <select
                    value={selectedClientId}
                    onChange={handleClientChange}
                    className="w-full pl-12 pr-10 py-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-300 rounded-2xl shadow-sm text-slate-700 font-semibold outline-none focus:ring-4 focus:ring-sky-500/10 appearance-none cursor-pointer text-lg transition-all duration-300"
                >
                    <option value="">Seleccione un cliente...</option>
                    {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-sky-500 transition-colors">
                    <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
            </div>

            {selectedClientId ? (
                <>
                    {/* TABS */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mx-auto max-w-lg">
                        <button
                            onClick={() => setActiveCategory('actual')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${activeCategory === 'actual'
                                    ? 'bg-white text-sky-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Estado Actual
                        </button>
                        <button
                            onClick={() => setActiveCategory('final')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${activeCategory === 'final'
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Estado Final
                        </button>
                    </div>

                    {/* GALLERY GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                        {/* UPLOAD BUTTON */}
                        <div
                            onClick={handleUploadClick}
                            className={`aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
                        ${activeCategory === 'actual'
                                    ? 'border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-500'
                                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-500'
                                }
                    `}
                        >
                            <div className="p-3 rounded-full bg-white/60 mb-2 shadow-sm">
                                <Camera className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-bold">Subir Foto</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                                capture="environment" // Suggests native camera on mobile
                            />
                        </div>

                        {/* PHOTOS */}
                        {filteredPhotos.map((photo) => (
                            <div
                                key={photo.id}
                                className="group relative aspect-square rounded-3xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer bg-white"
                                onClick={() => setFullScreenImage(photo.url)}
                            >
                                <img src={photo.url} alt="Obra" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                                {/* OVERLAY ACTIONS */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                    <button className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors">
                                        <Maximize2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                                        className="p-2 bg-rose-500/80 hover:bg-rose-600 backdrop-blur-md rounded-full text-white transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                    <span className="text-[10px] text-white/90 font-medium block">
                                        {new Date(photo.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPhotos.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <ImageIcon className="w-16 h-16 mx-auto mb-2 text-slate-300" />
                            <p className="text-slate-400 font-medium">No hay fotos en esta categoría.</p>
                        </div>
                    )}
                </>
            ) : (
                /* EMPTY STATE */
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="p-6 bg-white rounded-full shadow-lg shadow-sky-100 mb-6">
                        <User className="w-12 h-12 text-sky-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Seleccione un Cliente</h3>
                    <p className="text-slate-400 text-center max-w-xs mx-auto">
                        Para ver la galería y subir fotos, primero debe seleccionar un cliente de la lista.
                    </p>
                </div>
            )}

            {/* LIGHTBOX / FULL SCREEN */}
            {fullScreenImage && (
                <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setFullScreenImage(null)}>
                    <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <img src={fullScreenImage} alt="Full Screen" className="max-w-full max-h-screen object-contain p-4" />
                </div>
            )}
        </div>
    );
};

export default Photos;