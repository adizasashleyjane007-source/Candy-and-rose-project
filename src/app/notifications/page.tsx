"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import {
    Bell,
    Calendar,
    Package,
    User,
    Info,
    CheckCircle2,
    Circle,
    Check,
    Briefcase,
    Loader2
} from "lucide-react";

import { NotificationsDB, type Notification } from "@/lib/db";

type NotificationType = 'inventory' | 'customer' | 'appointment' | 'system' | 'billing';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
    const [loading, setLoading] = useState(true);

    const loadNotifs = useCallback(async () => {
        try {
            const data = await NotificationsDB.list();
            setNotifications(data);
        } catch (e) {
            console.error("Failed to load notifications:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifs();
        const handler = () => loadNotifs();
        window.addEventListener('notificationsUpdated', handler);
        return () => window.removeEventListener('notificationsUpdated', handler);
    }, [loadNotifs]);

    const toggleReadStatus = async (notif: Notification) => {
        try {
            if (!notif.is_read) {
                await NotificationsDB.markRead(notif.id!);
            } else {
                // Mark as unread by direct update
                const { createClient } = await import("@/lib/supabase/client");
                await createClient().from("notifications").update({ is_read: false }).eq("id", notif.id);
            }
            await loadNotifs();
        } catch (e) {
            console.error("Failed to update notification:", e);
        }
    };

    const markAllAsRead = async () => {
        try {
            await NotificationsDB.markAllRead();
            await loadNotifs();
        } catch (e) {
            console.error("Failed to mark all read:", e);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const filteredNotifications = notifications.filter(notif => {
        if (activeTab === 'unread') return !notif.is_read;
        if (activeTab === 'read') return notif.is_read;
        return true;
    });

    const getIconInfo = (type?: string) => {
        switch (type as NotificationType) {
            case 'inventory': return { icon: Package, bg: 'bg-amber-100', text: 'text-amber-600' };
            case 'customer': return { icon: User, bg: 'bg-emerald-100', text: 'text-emerald-600' };
            case 'appointment': return { icon: Calendar, bg: 'bg-indigo-100', text: 'text-indigo-600' };
            case 'system': return { icon: Info, bg: 'bg-blue-100', text: 'text-blue-600' };
            case 'billing': return { icon: Briefcase, bg: 'bg-purple-100', text: 'text-purple-600' };
            default: return { icon: Bell, bg: 'bg-gray-100', text: 'text-gray-600' };
        }
    };

    const formatTime = (created_at?: string) => {
        if (!created_at) return "";
        return new Date(created_at).toLocaleString([], {
            month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto w-full max-w-full">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">

                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h2>
                            {unreadCount > 0 && (
                                <span className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 font-medium">Manage system alerts and messages</p>
                    </div>

                    <button
                        onClick={markAllAsRead}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-pink-200 text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl font-bold text-sm transition-all shadow-sm"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-pink-100 overflow-hidden min-h-[500px] flex flex-col">

                    {/* Tabs */}
                    <div className="border-b border-gray-100 px-6 sm:px-8 pt-6 flex gap-6">
                        {(['all', 'unread', 'read'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-4 px-2 text-sm font-bold capitalize border-b-2 transition-colors relative ${activeTab === tab
                                    ? 'border-pink-500 text-pink-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {tab}
                                {tab === 'unread' && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-4 w-2 h-2 rounded-full bg-pink-500"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                                <span className="ml-3 text-gray-400 font-medium">Loading…</span>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full p-12 text-center text-gray-500">
                                <Bell className="w-12 h-12 mb-4 text-gray-300" />
                                <h3 className="text-lg font-bold text-gray-900 mb-1">No notifications found</h3>
                                <p className="text-sm">You're all caught up with your '{activeTab}' messages.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredNotifications.map((notif) => {
                                    const { icon: Icon, bg, text } = getIconInfo(notif.type);

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`p-6 sm:px-8 flex items-start gap-4 sm:gap-6 transition-colors hover:bg-gray-50/50 group ${notif.is_read ? 'opacity-80' : 'bg-pink-50/30'}`}
                                        >
                                            <div className="mt-1 relative shrink-0">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${notif.is_read ? 'bg-gray-100 text-gray-500' : `${bg} ${text}`}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                {!notif.is_read && (
                                                    <div className="absolute top-0 right-0 w-3 h-3 bg-pink-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <h4 className={`font-bold text-base truncate ${notif.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-xs font-semibold text-gray-400 shrink-0 whitespace-nowrap">
                                                        {formatTime(notif.created_at)}
                                                    </span>
                                                </div>
                                                <p className={`text-sm leading-relaxed mb-3 ${notif.is_read ? 'text-gray-500' : 'text-gray-600 font-medium'}`}>
                                                    {notif.message}
                                                </p>

                                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleReadStatus(notif)}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors"
                                                    >
                                                        {notif.is_read ? (
                                                            <><Circle className="w-3.5 h-3.5" /> Mark as unread</>
                                                        ) : (
                                                            <><CheckCircle2 className="w-3.5 h-3.5" /> Mark as read</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
