import React, { useState, useRef, useEffect } from 'react';
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
    Download,
    Edit,
    Share2,
    LayoutGrid,
    List,
    CheckCircle2,
    Maximize,
    Archive
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ImageScanner from '../components/ImageScanner';
import { uploadToStorage, deleteFromStorage, shareOrDownloadFile, generateZip } from '../src/utils/storage';

interface InvoicesProps {
    onBack: () => void;
    invoices: SupplierInvoice[];
    onAddInvoice: (invoice: SupplierInvoice) => void;
    onUpdateInvoice: (id: string, updates: Partial<SupplierInvoice>) => void;
    onDeleteInvoice: (id: string) => void;
}

const Invoices: React.FC<InvoicesProps> = ({ onBack, invoices, onAddInvoice, onUpdateInvoice, onDeleteInvoice }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<{ open: boolean, id: string | null, path?: string, type: 'standalone' | 'transfer' }>({ open: false, id: null, type: 'standalone' });

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);

    // Form State
    const [provider, setProvider] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
    const [invoiceFileType, setInvoiceFileType] = useState<'image' | 'pdf'>('image');
    const [baseAmount, setBaseAmount] = useState<number | ''>('');
    const [totalAmount, setTotalAmount] = useState<number | ''>('');

    // Report State
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBulkExport = async () => {
        const filteredForZip = invoices.filter(inv => {
            const matchesProvider = !searchTerm || inv.provider.toLowerCase().includes(searchTerm.toLowerCase());
            if (!reportStartDate && !reportEndDate && !searchTerm) return true;

            const invDate = new Date(inv.date);
            const start = reportStartDate ? new Date(reportStartDate) : new Date('2000-01-01');
            const end = reportEndDate ? new Date(reportEndDate) : new Date();
            end.setHours(23, 59, 59);

            const matchesDate = invDate >= start && invDate <= end;
            return matchesProvider && matchesDate;
        });

        if (filteredForZip.length === 0) {
            alert("No hay facturas en este rango de fechas.");
            return;
        }

        const zipBlob = await generateZip(filteredForZip.map(i => ({ url: i.imageUrl, name: `Factura_${i.provider}_${i.date}.pdf` })));
        if (zipBlob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `Facturas_Backup_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            setIsReportModalOpen(false);
        }
    };

    const handlePdfReport = async () => {
        const items = invoices.filter(inv => {
            const matchesProvider = !searchTerm || inv.provider.toLowerCase().includes(searchTerm.toLowerCase());
            if (!reportStartDate && !reportEndDate && !searchTerm) return true;

            const invDate = new Date(inv.date);
            const start = reportStartDate ? new Date(reportStartDate) : new Date('2000-01-01');
            const end = reportEndDate ? new Date(reportEndDate) : new Date();
            end.setHours(23, 59, 59);

            const matchesDate = invDate >= start && invDate <= end;
            return matchesProvider && matchesDate;
        });

        if (items.length === 0) {
            alert("No hay facturas para el informe.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Informe de Facturas: ${searchTerm || 'Todos'}`, 20, 20);
        doc.setFontSize(12);
        doc.text(`Desde: ${reportStartDate || 'Inicio'} Hasta: ${reportEndDate || 'Hoy'}`, 20, 30);
        doc.text(`Total Facturas: ${items.length}`, 20, 40);
        doc.text(`Importe Total Acumulado: ${items.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toFixed(2)}€`, 20, 50);

        let yOffset = 60;
        for (const [index, item] of items.entries()) {
            if (yOffset > 250) {
                doc.addPage();
                yOffset = 20;
            }
            doc.setFontSize(10);
            doc.text(`${index + 1}. [${item.date}] ${item.provider}: ${item.totalAmount?.toFixed(2)}€`, 20, yOffset);
            yOffset += 10;
        }

        doc.addPage();
        doc.setFontSize(16);
        doc.text("Anexo: Imágenes de Facturas", 20, 20);

        for (const item of items) {
            doc.addPage();
            doc.setFontSize(10);
            doc.text(`Factura ${item.provider} - ${item.date}`, 20, 10);
            try {
                if (item.imageUrl.startsWith('data:image')) {
                    doc.addImage(item.imageUrl, 'JPEG', 10, 20, 190, 260);
                } else if (item.imageUrl.startsWith('storage://')) {
                    // In a production app, we'd fetch the public URL here
                    doc.text("Documento PDF/Cloud (Ver archivo individual)", 20, 30);
                } else {
                    doc.text("Contenido no visualizable en este reporte dinámico.", 20, 30);
                }
            } catch (err) {
                console.error("Error adding image to PDF report", err);
            }
        }

        doc.save(`Informe_Facturas_${searchTerm || 'General'}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsReportModalOpen(false);
    };

    // --- File Handlers ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setInvoiceFileType(file.type.includes('pdf') ? 'pdf' : 'image');
            const reader = new FileReader();
            reader.onload = (e) => setInvoiceImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleScannerSave = (pdfDataUri: string) => {
        setInvoiceImage(pdfDataUri);
        setInvoiceFileType('pdf');
        setIsScannerOpen(false);
        setIsAddModalOpen(true);
    };

    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mandatory Fields Validation
        if (!provider || !invoiceDate || totalAmount === '') {
            alert("Por favor completa los campos obligatorios: Proveedor, Fecha e Importe Total.");
            return;
        }

        if (!invoiceImage) {
            alert("Por favor captura o sube la factura.");
            return;
        }

        try {
            // In a real app, we'd upload to Firebase Storage here and use the URL
            // Since we're demonstrating, we'll prefix with 'storage://' to mock the flow
            // or just use the DataURI as requested if storage is not fully setup.
            // For this task, let's assume we use the dataUri for now but structure it for storage.

            const newInvoice: SupplierInvoice = {
                id: Date.now().toString(),
                provider,
                date: invoiceDate,
                imageUrl: invoiceImage,
                fileType: invoiceFileType,
                baseAmount: baseAmount === '' ? undefined : Number(baseAmount),
                totalAmount: Number(totalAmount)
            };

            onAddInvoice(newInvoice);
            resetForm();
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error saving invoice:", error);
            alert("Error al guardar la factura.");
        }
    };

    const resetForm = () => {
        setProvider('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setInvoiceImage(null);
        setBaseAmount('');
        setTotalAmount('');
    };

    const handleDeleteClick = (invoice: SupplierInvoice) => {
        setIsDeleteConfirmOpen({ open: true, id: invoice.id, path: invoice.storagePath, type: 'standalone' });
    };

    const confirmDelete = () => {
        if (isDeleteConfirmOpen.id) {
            onDeleteInvoice(isDeleteConfirmOpen.id);
            // Also delete from storage if path exists
            if (isDeleteConfirmOpen.path) {
                deleteFromStorage(isDeleteConfirmOpen.path).catch(console.error);
            }
        }
        setIsDeleteConfirmOpen({ open: false, id: null, type: 'standalone' });
    };

    const handleTransferToOneDrive = async (invoice: SupplierInvoice) => {
        const success = await shareOrDownloadFile(invoice.imageUrl, `Factura_${invoice.provider}_${invoice.date}.pdf`);
        if (success) {
            setIsDeleteConfirmOpen({ open: true, id: invoice.id, path: invoice.storagePath, type: 'transfer' });
        }
    };

    const uniqueProviders = Array.from(new Set(invoices.map(inv => inv.provider))).sort();

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.provider.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate === '' || inv.date === filterDate;
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - (new Date(a.date).getTime() || 0));

    return (
        <div className="space-y-6 animate-fade-in pb-20 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-5">
                    <button onClick={onBack} className="group p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all">
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Facturas Proveedor</h2>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            OneDrive & Firebase Sync <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <button onClick={() => setIsReportModalOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors shadow-sm" title="Exportación Masiva">
                        <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                        {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Capturar</span>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-semibold">Subir PDF</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none"
                        list="providers-list"
                    />
                </div>
                <div className="relative md:w-56">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600"
                        onClick={(e) => e.currentTarget.showPicker?.()}
                    />
                </div>
                {(searchTerm || filterDate) && (
                    <button onClick={() => { setSearchTerm(''); setFilterDate(''); }} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Grid/List View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 px-2">
                    {filteredInvoices.map(invoice => (
                        <div key={invoice.id} className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 group hover:shadow-lg transition-all duration-300">
                            <div className="aspect-[3/4] rounded-xl bg-slate-100 overflow-hidden relative cursor-pointer mb-2" onClick={() => setSelectedImage(invoice.imageUrl)}>
                                {invoice.fileType === 'pdf' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                        <FileText className="w-12 h-12 text-rose-400 mb-2" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">PDF Factura</span>
                                    </div>
                                ) : (
                                    <img src={invoice.imageUrl} alt="Factura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Maximize className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{invoice.provider}</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-sm font-black text-indigo-600 ml-2">{invoice.totalAmount?.toFixed(2)}€</p>
                                </div>
                                <div className="flex gap-0.5 pt-1 border-t border-slate-50">
                                    <button onClick={() => handleTransferToOneDrive(invoice)} className="flex-1 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="OneDrive">
                                        <Share2 className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                    <button onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = invoice.imageUrl;
                                        link.download = `Factura_${invoice.provider}.pdf`;
                                        link.click();
                                    }} className="flex-1 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Descargar">
                                        <Download className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                    <button onClick={() => handleDeleteClick(invoice)} className="flex-1 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Borrar">
                                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Factura</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Proveedor</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Importe</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedImage(invoice.imageUrl)}>
                                            {invoice.fileType === 'pdf' ? <FileText className="w-full h-full p-2 text-rose-400" /> : <img src={invoice.imageUrl} className="w-full h-full object-cover" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{invoice.provider}</td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(invoice.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right font-black text-indigo-600">{invoice.totalAmount?.toFixed(2)}€</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleTransferToOneDrive(invoice)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Share2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteClick(invoice)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {filteredInvoices.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-medium">No se encontraron facturas</p>
                </div>
            )}

            {/* Modal Add/Upload */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Detalles de Factura</h3>
                                <p className="text-xs text-slate-400">Completa los campos obligatorios</p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X /></button>
                        </div>
                        <form onSubmit={handleSaveInvoice} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Imagen de Factura</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden"
                                    >
                                        {invoiceImage ? (
                                            invoiceFileType === 'pdf' ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText className="w-10 h-10 text-rose-400" />
                                                    <span className="text-xs font-bold text-slate-500">PDF Documento</span>
                                                </div>
                                            ) : (
                                                <img src={invoiceImage} className="w-full h-full object-contain" />
                                            )
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-slate-300 mb-2" />
                                                <span className="text-xs text-slate-400 font-medium">Click para seleccionar archivo</span>
                                            </>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Proveedor *</label>
                                    <input
                                        required
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none"
                                        placeholder="Nombre del proveedor"
                                        list="providers-list"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha *</label>
                                        <input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none" onClick={(e) => e.currentTarget.showPicker?.()} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Importe Total *</label>
                                        <div className="relative">
                                            <input type="number" step="0.01" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full pl-4 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-indigo-600" placeholder="0.00" />
                                            <span className="absolute right-3 top-3 text-slate-400 text-sm">€</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all mt-4 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Guardar Factura
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Scanner Component */}
            {isScannerOpen && (
                <ImageScanner
                    onSave={handleScannerSave}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen.open && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-bounce-subtle">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {isDeleteConfirmOpen.type === 'transfer' ? '¿Borrar de Firebase?' : '¿Eliminar Factura?'}
                        </h3>
                        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                            {isDeleteConfirmOpen.type === 'transfer'
                                ? 'Ya se ha guardado una copia. ¿Quieres eliminar la de la nube para liberar espacio?'
                                : 'Esta acción no se puede deshacer. Se borrará permanentemente de Firebase.'}
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsDeleteConfirmOpen({ open: false, id: null, type: 'standalone' })} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                {isDeleteConfirmOpen.type === 'transfer' ? 'Mantener' : 'Cancelar'}
                            </button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-colors">
                                {isDeleteConfirmOpen.type === 'transfer' ? 'Sí, borrar' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report/Export Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Search className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Exportar y Buscar</h3>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">Filtra facturas para descargar en ZIP</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Proveedor (Filtro rápido)</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del proveedor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                                    list="providers-list"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Desde</label>
                                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Hasta</label>
                                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsReportModalOpen(false)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                            <button onClick={handleBulkExport} className="py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                <Archive className="w-5 h-5" /> ZIP
                            </button>
                            <button onClick={handlePdfReport} className="col-span-2 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                                <FileText className="w-6 h-6" /> Descargar Informe PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedImage && (
                <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <div className="absolute top-4 right-4 flex gap-4">
                        <button className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-8 h-8" /></button>
                    </div>
                    {selectedImage.startsWith('data:application/pdf') || selectedImage.includes('.pdf') ? (
                        <iframe src={selectedImage} className="w-full h-full max-w-4xl max-h-[90vh] rounded-2xl bg-white" title="Invoice PDF" />
                    ) : (
                        <img src={selectedImage} alt="Full view" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-white/5" />
                    )}
                </div>
            )}
            {/* Provider Datalist for shared use */}
            <datalist id="providers-list">
                {uniqueProviders.map(p => (
                    <option key={p} value={p} />
                ))}
            </datalist>
        </div>
    );
};

export default Invoices;

