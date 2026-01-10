import React, { useState, useRef } from 'react';
import { SupplierInvoice } from '../types';
import {
    ArrowLeft,
    Plus,
    Search,
    Calendar,
    Trash2,
    Printer,
    X,
    Upload,
    FileText,
    Image as ImageIcon,
    Download
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface InvoicesProps {
    onBack: () => void;
    invoices: SupplierInvoice[];
    onAddInvoice: (invoice: SupplierInvoice) => void;
    onDeleteInvoice: (id: string) => void;
}

const Invoices: React.FC<InvoicesProps> = ({ onBack, invoices, onAddInvoice, onDeleteInvoice }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Form State
    const [provider, setProvider] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceImage, setInvoiceImage] = useState<string | null>(null);

    // Report State
    const [reportProvider, setReportProvider] = useState('');
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 300; // Optimized for mobile viewing

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    setInvoiceImage(dataUrl);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceImage) {
            alert("Por favor sube una imagen de la factura.");
            return;
        }

        const newInvoice: SupplierInvoice = {
            id: Date.now().toString(),
            provider,
            date: invoiceDate,
            imageUrl: invoiceImage
        };

        onAddInvoice(newInvoice);
        setIsAddModalOpen(false);
        // Reset form
        setProvider('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setInvoiceImage(null);
    };

    const handleGeneratePDF = () => {
        const doc = new jsPDF();
        const filteredForReport = invoices.filter(inv => {
            const matchesProvider = reportProvider === '' || inv.provider.toLowerCase().includes(reportProvider.toLowerCase());

            let matchesDate = true;
            if (reportStartDate || reportEndDate) {
                const invDate = new Date(inv.date);
                const start = reportStartDate ? new Date(reportStartDate) : new Date('2000-01-01');
                const end = reportEndDate ? new Date(reportEndDate) : new Date();
                end.setHours(23, 59, 59);
                matchesDate = invDate >= start && invDate <= end;
            }
            return matchesProvider && matchesDate;
        });

        if (filteredForReport.length === 0) {
            alert("No hay facturas con esos criterios.");
            return;
        }

        doc.setFontSize(22);
        doc.text("Informe de Facturas", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);

        let yPos = 40;

        filteredForReport.forEach((inv, index) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Proveedor: ${inv.provider}`, 14, yPos);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha: ${new Date(inv.date).toLocaleDateString()}`, 14, yPos + 6);

            // Add Image
            try {
                // imgData, format, x, y, width, height
                // A4 width is ~210mm. Margins 14mm. Max width ~180mm.
                // We want a reasonable height.
                doc.addImage(inv.imageUrl, 'JPEG', 14, yPos + 10, 100, 0); // 0 height means auto-scale to keep aspect ratio

                // Estimate height used
                // Since we don't know exact aspect ratio easily without loading img, we can assume a standard block or just add a fixed spacing
                // JS PDF addImage with 0 height scales proportionally to the width.
                // We will add a fixed spacing for now, assuming horizontal or vertical receipt. 
                // Better approach: Since we can't easily get dimensions synchronously here without pre-calc, 
                // we'll assume a max height block of 120mm.
                yPos += 130;
            } catch (e) {
                doc.text("[Error al cargar imagen]", 14, yPos + 20);
                yPos += 30;
            }

            yPos += 10; // Spacing between items
        });

        doc.save('facturas_proveedores.pdf');
        setIsReportModalOpen(false);
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.provider.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate === '' || inv.date === filterDate;
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6 animate-fade-in pb-20 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                    <button onClick={onBack} className="group p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300">
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Facturas</h2>
                        <p className="text-slate-400 font-medium">Proveedores y Archivos</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsReportModalOpen(true)} className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:border-indigo-600 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md">
                        <Printer className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                        <span className="hidden md:inline text-sm">PDF</span>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5">
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" strokeWidth={1.5} />
                        <span className="hidden md:inline text-sm font-semibold">Nueva Factura</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Buscar por proveedor...</option>
                        {[...new Set(invoices.map(i => i.provider))].sort().map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                <div className="relative md:w-48">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 cursor-pointer"
                        onClick={(e) => e.currentTarget.showPicker?.()}
                    />
                </div>
                {(searchTerm || filterDate) && (
                    <button
                        onClick={() => { setSearchTerm(''); setFilterDate(''); }}
                        className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredInvoices.length > 0 ? (
                    filteredInvoices.map(invoice => (
                        <div key={invoice.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                            <div
                                className="aspect-[3/4] rounded-2xl bg-slate-100 overflow-hidden relative cursor-pointer mb-3"
                                onClick={() => setSelectedImage(invoice.imageUrl)}
                            >
                                <img src={invoice.imageUrl} alt="Factura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-800 truncate pr-2">{invoice.provider}</h3>
                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(invoice.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { if (confirm('¿Borrar factura?')) onDeleteInvoice(invoice.id); }}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron facturas</p>
                    </div>
                )}
            </div>

            {/* Modal Add */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-bounce-subtle">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Nueva Factura</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSaveInvoice} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Imagen / Foto</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/10 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative"
                                >
                                    {invoiceImage ? (
                                        <img src={invoiceImage} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" />
                                            <span className="text-xs text-slate-400 font-medium">Click para subir foto</span>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Proveedor</label>
                                <input
                                    required
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none"
                                    placeholder="Nombre del proveedor"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none"
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all mt-4">
                                Guardar Factura
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Report */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-bounce-subtle">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Generar PDF</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Filtrar Proveedor (Opcional)</label>
                                <div className="relative">
                                    <select
                                        value={reportProvider}
                                        onChange={(e) => setReportProvider(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Todos los proveedores</option>
                                        {[...new Set(invoices.map(i => i.provider))].sort().map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Desde</label>
                                    <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" onClick={(e) => e.currentTarget.showPicker?.()} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Hasta</label>
                                    <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" onClick={(e) => e.currentTarget.showPicker?.()} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsReportModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancelar</button>
                                <button onClick={handleGeneratePDF} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Download className="w-4 h-4" /> PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button>
                    <img src={selectedImage} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
        </div>
    );
};

export default Invoices;
