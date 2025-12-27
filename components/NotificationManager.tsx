import React, { useEffect, useState, useRef } from 'react';
import { CalendarEvent } from '../types';
import { Bell, X, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface NotificationManagerProps {
    events: CalendarEvent[];
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ events }) => {
    const [activeModalEvent, setActiveModalEvent] = useState<CalendarEvent | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    // Keep track of notified events to avoid multiple notifications for same event
    const notifiedEventsRef = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize notification audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    const requestPermission = async () => {
        if (typeof Notification === 'undefined') return;

        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
    };

    useEffect(() => {
        const checkEvents = () => {
            const now = new Date();
            const currentDay = now.toISOString().split('T')[0];
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');

            events.forEach(event => {
                // If event is exactly now and hasn't been notified yet
                if (event.date === currentDay && event.time === currentTime && !notifiedEventsRef.current.has(event.id)) {
                    triggerNotification(event);
                    notifiedEventsRef.current.add(event.id);
                }
            });

            // Cleanup notified events that are in the past (to save memory)
            // This is simple: if the event date is older than today, or same day but older time, 
            // we could remove it, but keeping it for the session is safer to avoid re-triggering.
        };

        const triggerNotification = (event: CalendarEvent) => {
            // 1. Play Sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }

            // 2. Show Browser Notification
            if (Notification.permission === 'granted') {
                new Notification(`Recordatorio: ${event.title}`, {
                    body: `${event.time} - ${event.description || 'Sin descripción'}`,
                    icon: '/pwa-192x192.png'
                });
            }

            // 3. Show In-App Modal
            setActiveModalEvent(event);
        };

        // Check every 30 seconds
        const interval = setInterval(checkEvents, 30000);

        // Initial check
        checkEvents();

        return () => clearInterval(interval);
    }, [events]);

    if (permissionStatus === 'default' && !activeModalEvent) {
        return (
            <div className="fixed bottom-24 left-4 right-4 z-[200] md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-bounce-subtle">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <Bell className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800">Activar Notificaciones</h4>
                        <p className="text-xs text-slate-500 mb-3">Recibe avisos de tus citas y obras a tiempo.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={requestPermission}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Activar
                            </button>
                            <button
                                onClick={() => setPermissionStatus('denied')}
                                className="px-3 py-2 text-slate-400 hover:text-slate-600 text-xs font-medium"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeModalEvent) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                    <div className="bg-indigo-600 p-6 text-white relative">
                        <button
                            onClick={() => setActiveModalEvent(null)}
                            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-tight">¡Recordatorio!</h3>
                        <p className="text-indigo-100 text-sm">Tienes un evento programado justo ahora.</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-base font-bold text-slate-800 truncate">{activeModalEvent.title}</h4>
                                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{activeModalEvent.time}</span>
                                </div>
                            </div>
                        </div>

                        {activeModalEvent.description && (
                            <div className="p-4 bg-indigo-50/50 rounded-2xl text-sm text-slate-600 italic">
                                "{activeModalEvent.description}"
                            </div>
                        )}

                        <button
                            onClick={() => setActiveModalEvent(null)}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98]"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default NotificationManager;
