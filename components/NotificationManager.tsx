import React, { useEffect, useState, useRef } from 'react';
import { CalendarEvent } from '../types';
import { Bell, X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { messaging, db } from '../src/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';

interface NotificationManagerProps {
    events: CalendarEvent[];
}

export interface NotificationManagerRef {
    requestPermission: () => Promise<void>;
}

const NotificationManager = React.forwardRef<NotificationManagerRef, NotificationManagerProps>(({ events }, ref) => {
    const [activeModalEvent, setActiveModalEvent] = useState<CalendarEvent | null>(null);
    const [hasToken, setHasToken] = useState<boolean>(() => !!localStorage.getItem('fcm_token_registered'));
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? (Notification.permission || 'default') : 'denied'
    );

    // Use a ref for audio context to avoid external file issues
    const audioContextRef = useRef<AudioContext | null>(null);
    const notifiedEventsRef = useRef<Set<string>>(new Set());

    const playSafeSound = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContextClass();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const requestPermission = async () => {
        console.log('🔔 requestPermission llamada');
        console.log('Notification disponible:', typeof Notification !== 'undefined');
        console.log('Messaging disponible:', !!messaging);

        if (typeof Notification === 'undefined' || !messaging) {
            console.error('❌ Notification o messaging no disponible');
            alert('Tu navegador no soporta notificaciones push o Firebase Messaging no está inicializado.');
            return;
        }

        try {
            console.log('📋 Solicitando permiso de notificación...');
            const permission = await Notification.requestPermission();
            console.log('✅ Permiso obtenido:', permission);
            setPermissionStatus(permission);

            if (permission === 'granted') {
                console.log('🎫 Generando token FCM...');
                const token = await getToken(messaging, {
                    vapidKey: 'BHLlsvii-b-lqDT0u9JZQLRB-7wIffHfNasC_L2pqP7DpeOQ5qkkXv_H60n7i5gvhAkKmbe1M2Sdnlg66xGrZjA'
                });

                if (token) {
                    console.log('✅ FCM Token generado:', token);
                    // Save token to Firestore
                    await setDoc(doc(db, 'fcmTokens', token), {
                        token: token,
                        lastUpdated: new Date().toISOString(),
                        platform: navigator.platform
                    });
                    localStorage.setItem('fcm_token_registered', 'true');
                    setHasToken(true);
                    console.log('💾 Token guardado en Firestore');
                    alert('✅ Notificaciones activadas correctamente');
                } else {
                    console.error('❌ No se pudo generar el token FCM');
                    alert('Error: No se pudo generar el token de notificación');
                }
            } else {
                console.warn('⚠️ Permiso denegado o cerrado');
                alert('Has denegado los permisos de notificación. Ve a la configuración de tu navegador para habilitarlos.');
            }
        } catch (error) {
            console.error('❌ Error en requestPermission:', error);
            alert(`Error al activar notificaciones: ${error}`);
        }
    };

    React.useImperativeHandle(ref, () => ({
        requestPermission
    }));

    // Force token refresh/check on mount if permission is granted
    useEffect(() => {
        const silentRegister = async () => {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && messaging) {
                try {
                    console.log('🔄 Verifying FCM token on startup...');
                    const token = await getToken(messaging, {
                        vapidKey: 'BHLlsvii-b-lqDT0u9JZQLRB-7wIffHfNasC_L2pqP7DpeOQ5qkkXv_H60n7i5gvhAkKmbe1M2Sdnlg66xGrZjA'
                    });

                    if (token) {
                        // Always update/refresh the token in Firestore to ensure it's active
                        await setDoc(doc(db, 'fcmTokens', token), {
                            token: token,
                            lastUpdated: new Date().toISOString(),
                            platform: navigator.platform,
                            userAgent: navigator.userAgent
                        }, { merge: true });

                        setHasToken(true);
                        localStorage.setItem('fcm_token_registered', 'true');
                        console.log('✅ FCM Token verified and updated in Firestore');
                    }
                } catch (err) {
                    console.error('Silent token registration failed:', err);
                }
            }
        };

        silentRegister();
    }, []);

    useEffect(() => {
        if (!messaging) return;

        // Handle foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            if (payload.data && payload.data.eventId) {
                const foundEvent = events.find(e => e.id === payload.data?.eventId);
                if (foundEvent && foundEvent.dismissed !== true) {
                    setActiveModalEvent(foundEvent);
                    playSafeSound();
                }
            }
        });

        return () => unsubscribe();
    }, [events]);

    // Effect to handle eventId in URL on load
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('eventId');
        if (eventId && events.length > 0) {
            const foundEvent = events.find(e => e.id === eventId);
            if (foundEvent) {
                setActiveModalEvent(foundEvent);
                // Clean up URL without reloading
                window.history.replaceState({}, document.title, "/");
            }
        }
    }, [events]);

    // Local notifications are ENABLED for testing both systems
    // This will cause duplicates with FCM, but allows the user to test everything
    useEffect(() => {
        const checkEvents = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const currentDay = `${year}-${month}-${day}`;

            const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');

            events.forEach(event => {
                if (event.date === currentDay && event.time === currentTime && !notifiedEventsRef.current.has(event.id)) {
                    triggerNotification(event);
                    notifiedEventsRef.current.add(event.id);
                }
            });
        };

        const triggerNotification = (event: CalendarEvent) => {
            try {
                setActiveModalEvent(event);
                playSafeSound();
            } catch (err) {
                console.error('Critical error in triggerNotification:', err);
                alert(`Recordatorio: ${event.title}\n${event.time}`);
            }
        };

        const interval = setInterval(checkEvents, 30000);
        checkEvents();
        return () => clearInterval(interval);
    }, [events]);

    const handleActivate = () => {
        requestPermission();
        playSafeSound(); // "Prime" audio context on user gesture
    };

    const handleDismiss = async () => {
        if (activeModalEvent) {
            try {
                // Mark event as dismissed in Firestore so the cloud function stops sending push
                await updateDoc(doc(db, 'events', activeModalEvent.id), {
                    dismissed: true
                });
                setActiveModalEvent(null);
            } catch (error) {
                console.error('Error dismissing event:', error);
                setActiveModalEvent(null);
            }
        }
    };

    if ((permissionStatus === 'default' || (permissionStatus === 'granted' && !hasToken)) && !activeModalEvent) {
        return (
            <div className="fixed bottom-24 left-4 right-4 z-[200] md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-bounce-subtle">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <Bell className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800">Activar Notificaciones</h4>
                        <p className="text-xs text-slate-500 mb-3">Haz clic en Activar para permitir avisos y sonido en este dispositivo.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleActivate}
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
                            onClick={handleDismiss}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98]"
                        >
                            ENTENDIDO (Silenciar)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
});

export default NotificationManager;
