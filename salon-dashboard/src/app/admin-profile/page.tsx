"use client";

import Header from "@/components/Header";
import { Camera, Lock, Mail, Phone, Shield, User, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminProfilePage() {
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [profile, setProfile] = useState({
        name: "Admin User",
        email: "admin@candyandrose.com",
        phone: "09123456789",
        role: "Administrator",
        bio: "I am the owner and chief administrator of Candy & Rose Salon.",
        image: "/LOGO.jpg"
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUserId(user.id);

                // Try to load from profiles table
                const { data: dbProfile, error } = await supabase
                    .from('profiles')
                    .select('name, email, phone, role, bio, image_url')
                    .eq('id', user.id)
                    .single();

                if (dbProfile) {
                    setProfile({
                        name: dbProfile.name || user.user_metadata?.full_name || 'Admin User',
                        email: dbProfile.email || user.email || '',
                        phone: dbProfile.phone || '',
                        role: dbProfile.role || 'Administrator',
                        bio: dbProfile.bio || '',
                        image: dbProfile.image_url || "/LOGO.jpg",
                    });
                } else {
                    // If no profile exists, create one using auth metadata
                    const initialProfile = {
                        id: user.id,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
                        email: user.email || '',
                        role: 'Administrator',
                        image_url: user.user_metadata?.avatar_url || "/LOGO.jpg"
                    };
                    
                    await supabase.from('profiles').insert(initialProfile);
                    
                    setProfile(prev => ({
                        ...prev,
                        name: initialProfile.name,
                        email: initialProfile.email,
                        image: initialProfile.image_url
                    }));
                }
            } catch (err) {
                console.error("Profile load failed:", err);
            }
        };
        loadProfile();
    }, []);

    const handleSaveProfile = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            if (userId) {
                const supabase = createClient();
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone,
                        role: profile.role,
                        bio: profile.bio,
                        image_url: profile.image,
                        updated_at: new Date().toISOString(),
                    });
                
                if (error) throw error;
                
                // Broadcast change to Header and other components
                window.dispatchEvent(new Event('salon_profile_changed'));
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save changes. Please try again.");
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            alert("Please fill in both password fields.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            alert("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (err: any) {
            console.error("Password update failed:", err);
            alert(`Failed to update password: ${err.message}`);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const MAX_HEIGHT = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Convert to webp/jpeg with 0.7 quality to keep it very small
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setProfile(prev => ({...prev, image: dataUrl}));
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden w-full max-w-full">
            <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">
                <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Admin Profile</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your personal information and security settings</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Card */}
                    <div className="lg:col-span-1 h-full">
                        {/* Profile Photo Card */}
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-pink-100 flex flex-col items-center text-center h-full">
                            <div className="relative group cursor-pointer mb-5 mt-4" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                                <div className="w-32 h-32 rounded-full bg-pink-50 border-4 border-white shadow-lg overflow-hidden relative mx-auto">
                                    <img src={profile.image} alt={profile.name} className={`w-full h-full object-cover ${profile.image === '/LOGO.jpg' ? 'mix-blend-multiply' : ''}`} />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <button className="absolute bottom-0 right-1/2 translate-x-12 p-2.5 bg-pink-500 text-white rounded-full shadow-md hover:bg-pink-600 transition-colors border-2 border-white pointer-events-none">
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mt-2">{profile.name}</h3>
                            <p className="text-pink-500 font-medium text-sm mb-4 tracking-wide uppercase">{profile.role}</p>

                            <p className="text-sm text-gray-500 leading-relaxed mb-6 px-4">
                                {profile.bio || "Update your photo and personal details here. Keep your password secure to protect your salon data."}
                            </p>

                            <div className="w-full pt-6 border-t border-gray-100 space-y-4 text-left mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Status</p>
                                        <p className="text-sm font-bold text-gray-900">Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Forms */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Basic Information Form */}
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-pink-100">
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
                                <p className="text-sm text-gray-500 mt-1">Update your basic profile details.</p>
                            </div>

                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Full Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={profile.name}
                                                onChange={(e) => setProfile(prev => ({...prev, name: e.target.value.replace(/[0-9]/g, '')}))}
                                                className="block w-full pl-11 pr-4 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Address */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={profile.email}
                                                onChange={(e) => setProfile(prev => ({...prev, email: e.target.value}))}
                                                className="block w-full pl-11 pr-4 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                maxLength={11}
                                                value={profile.phone}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                                                    setProfile(prev => ({...prev, phone: val}));
                                                }}
                                                className="block w-full pl-11 pr-4 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Role (Read Only) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Role</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Shield className="h-5 w-5 text-pink-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={profile.role}
                                                readOnly
                                                className="block w-full pl-11 pr-4 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 font-medium pointer-events-none select-none opacity-90"
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-700">Bio</label>
                                        <textarea
                                            rows={2}
                                            value={profile.bio}
                                            onChange={(e) => setProfile(prev => ({...prev, bio: e.target.value.replace(/[0-9]/g, '')}))}
                                            className="block w-full px-4 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium resize-none shadow-sm"
                                            placeholder="Write a short bio about yourself..."
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        type="button" 
                                        onClick={handleSaveProfile}
                                        className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-md shadow-pink-200 transition-all hover:scale-[1.02]"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>

                {/* Full-width Password Form Block */}
                <div className="mt-8">
                    <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-pink-100">
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Security & Password</h3>
                            <p className="text-sm text-gray-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-pink-400" />
                                        </div>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-12 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500 transition-colors"
                                            title="Toggle password visibility"
                                        >
                                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm New Password */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Confirm New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-pink-400" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-12 py-3 border border-pink-100 rounded-xl bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500 transition-colors"
                                            title="Toggle password visibility"
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button 
                                    type="submit" 
                                    disabled={isUpdatingPassword}
                                    className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-full font-bold shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
                                >
                                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
