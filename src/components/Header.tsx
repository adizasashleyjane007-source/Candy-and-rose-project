"use client";

import { Bell, ChevronDown, User, Settings, LogOut, Menu, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "./SidebarContext";
import GlobalSearch from "./GlobalSearch";
import { NotificationsDB, type Notification } from "@/lib/db";
import NotificationChatModal from "./NotificationChatModal";

export default function Header() {
    const router = useRouter();
    const { toggle } = useSidebar();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const notifDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

    const [adminProfile, setAdminProfile] = useState({
        name: "Admin User",
        email: "admin@candyandrose.com",
        image: null as string | null
    });

    const loadNotifications = useCallback(async () => {
        try {
            setLoadingNotifs(true);
            const list = await NotificationsDB.list();
            setNotifications(list);
            const unread = list.filter(n => !n.is_read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setLoadingNotifs(false);
        }
    }, []);

    const updateCount = useCallback(async () => {
        try {
            const supabase = createClient();
            const { count } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("is_read", false);
            setUnreadCount(count ?? 0);
        } catch {
            // silently fail
        }
    }, []);

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await NotificationsDB.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            window.dispatchEvent(new Event('notificationsUpdated'));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await NotificationsDB.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            window.dispatchEvent(new Event('notificationsUpdated'));
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await NotificationsDB.remove(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            const wasUnread = !notifications.find(n => n.id === id)?.is_read;
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            window.dispatchEvent(new Event('notificationsUpdated'));
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const loadProfile = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('name, email, image_url, phone, role, bio')
                .eq('id', user.id)
                .single();

            if (profile) {
                const headerProfile = {
                    name: profile.name || user.email?.split('@')[0] || 'Admin User',
                    email: profile.email || user.email || 'admin@candyandrose.com',
                    image: profile.image_url || null,
                };
                setAdminProfile(headerProfile);
                return;
            }

            const meta = user.user_metadata ?? {};
            const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Admin User';
            const avatar = meta.avatar_url || meta.picture || null;
            const newProfile = {
                name,
                email: user.email || 'admin@candyandrose.com',
                image: avatar,
            };
            setAdminProfile(newProfile);
        } catch {}
    }, []);

    useEffect(() => {
        updateCount();
        loadProfile();
        loadNotifications();

        const onNotifUpdate = () => {
            updateCount();
            loadNotifications();
        };
        const onProfileChange = () => loadProfile();

        window.addEventListener('notificationsUpdated', onNotifUpdate);
        window.addEventListener('salon_profile_changed', onProfileChange);

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
                setNotifDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('notificationsUpdated', onNotifUpdate);
            window.removeEventListener('salon_profile_changed', onProfileChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [updateCount, loadProfile, loadNotifications]);

    return (
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-transparent gap-4 relative z-30">
            <button
                onClick={toggle}
                className="lg:hidden p-2 rounded-full bg-white text-gray-600 hover:text-pink-500 shadow-sm transition-colors shrink-0"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Component */}
            <GlobalSearch />

            <div className="flex items-center gap-3 sm:gap-6 ml-auto">
                <div className="hidden md:block">
                    <p className="text-sm font-bold text-gray-500">
                        Welcome Back, <span className="text-pink-600">
                            {adminProfile.name.toLowerCase().startsWith('admin') 
                                ? adminProfile.name 
                                : `Admin ${adminProfile.name.split(' ')[0]}`}
                        </span>
                    </p>
                </div>

                <div className="relative" ref={notifDropdownRef}>
                    <button
                        onClick={() => {
                            setNotifDropdownOpen(!notifDropdownOpen);
                            if (!notifDropdownOpen) {
                                loadNotifications();
                            }
                        }}
                        className="p-2 rounded-full bg-white text-pink-400 hover:text-pink-500 shadow-sm transition-colors relative cursor-pointer outline-none"
                    >
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-5 w-5" aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white px-1 ring-2 ring-white shadow-sm z-10">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notifDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-pink-100 z-50 animate-in fade-in slide-in-from-top-2 duration-300 py-2 overflow-hidden">
                            <div className="px-4 py-3 border-b border-pink-50 flex items-center justify-between bg-pink-50/10">
                                <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={(e) => handleMarkAllAsRead(e)}
                                        className="text-xs font-semibold text-pink-600 hover:text-pink-700 transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-50 no-scrollbar">
                                {loadingNotifs && notifications.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400 text-xs font-medium">
                                        Loading...
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400 text-xs font-medium">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map((notif) => (
                                        <div 
                                            key={notif.id}
                                            onClick={() => {
                                                setSelectedNotif(notif);
                                                setNotifDropdownOpen(false);
                                            }}
                                            className={`p-4 hover:bg-pink-50/30 transition-colors relative flex items-start gap-3 group/notif cursor-pointer ${!notif.is_read ? 'bg-pink-50/10' : ''}`}
                                        >
                                            {/* Unread dot indicator */}
                                            {!notif.is_read && (
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-pink-500"></span>
                                            )}
                                            
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-xs text-gray-900 truncate ${!notif.is_read ? 'font-bold' : 'font-medium'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                                    {notif.created_at ? formatTime(notif.created_at) : ''}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/notif:opacity-100 transition-opacity">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(notif.id!, e)}
                                                        className="p-1 hover:bg-pink-100 rounded text-pink-600 transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteNotif(notif.id!, e)}
                                                    className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="px-4 py-2 border-t border-pink-50 text-center bg-pink-50/10">
                                <Link 
                                    href="/notifications" 
                                    onClick={() => setNotifDropdownOpen(false)}
                                    className="text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors block py-1"
                                >
                                    View all notifications
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 sm:gap-3 hover:bg-white p-1 pr-1 sm:pr-3 rounded-full transition-all cursor-pointer select-none border border-transparent outline-none shadow-sm sm:shadow-none bg-white sm:bg-transparent"
                    >
                        {adminProfile.image ? (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-pink-200 shadow-sm shrink-0 bg-white">
                                <img src={adminProfile.image} alt={adminProfile.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-pink-100 flex items-center justify-center border border-pink-200 shadow-sm shrink-0">
                                <span className="text-pink-600 font-semibold uppercase text-xs sm:text-sm">{adminProfile.name ? adminProfile.name.slice(0, 2) : 'AD'}</span>
                            </div>
                        )}
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{adminProfile.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 lowercase truncate max-w-[120px]">{adminProfile.email}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 hidden sm:block transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-pink-100 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300 py-1.5 overflow-hidden">
                            {/* User Info Summary */}
                            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30">
                                <p className="text-xs font-bold text-gray-900 truncate">{adminProfile.name}</p>
                                <p className="text-[10px] font-medium text-gray-500 lowercase truncate">{adminProfile.email}</p>
                            </div>
                            <Link
                                href="/admin-profile"
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors font-semibold"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <User className="w-4 h-4" /> Profile
                            </Link>
                            <Link
                                href="/settings"
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors font-semibold"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <Settings className="w-4 h-4" /> Settings
                            </Link>
                            <div className="h-px bg-gray-100 my-1 mx-3"></div>
                            <button
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold text-left"
                                onClick={async () => {
                                    setIsDropdownOpen(false);
                                    const supabase = createClient();
                                    await supabase.auth.signOut();
                                    router.push('/login');
                                    router.refresh();
                                }}
                            >
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {selectedNotif && (
                <NotificationChatModal
                    isOpen={!!selectedNotif}
                    onClose={() => setSelectedNotif(null)}
                    notification={selectedNotif}
                    onNotificationUpdated={() => {
                        loadNotifications();
                        updateCount();
                    }}
                />
            )}
        </header>
    );
}
