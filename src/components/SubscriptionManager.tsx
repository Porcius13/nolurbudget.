import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Trash2, Bell, RefreshCw, CreditCard } from 'lucide-react';
import { Subscription, Category } from '../types';
import { cn } from '../lib/utils';
import { SummaryCard } from './UI';
import { apiFetch } from '../lib/api';

interface SubscriptionManagerProps {
    categories: Category[];
}

export default function SubscriptionManager({ categories }: SubscriptionManagerProps) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newSub, setNewSub] = useState({
        name: '',
        amount: '',
        category_id: '',
        frequency: 'monthly' as const,
        next_date: '',
        type: 'expense' as const
    });

    const fetchSubscriptions = async () => {
        const res = await apiFetch('/api/subscriptions');
        const data = await res.json();
        setSubscriptions(data);
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const handleAdd = async () => {
        if (!newSub.name || !newSub.amount || !newSub.category_id || !newSub.next_date) return;

        await apiFetch('/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newSub,
                amount: parseFloat(newSub.amount),
                category_id: parseInt(newSub.category_id)
            })
        });

        setIsAdding(false);
        setNewSub({ name: '', amount: '', category_id: '', frequency: 'monthly', next_date: '', type: 'expense' });
        fetchSubscriptions();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Abonelikler</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Yinelenen ödemelerini yönet.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {subscriptions.length === 0 ? (
                    <div className="premium-card p-12 rounded-[2rem] text-center space-y-4 border-dashed border-2">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                            <RefreshCw size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Henüz kayıtlı abonelik yok.</p>
                    </div>
                ) : (
                    subscriptions.map((sub, i) => (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="premium-card p-5 rounded-3xl flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">{sub.name}</p>
                                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sub.amount)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                            {sub.frequency === 'monthly' ? 'Aylık' : sub.frequency === 'weekly' ? 'Haftalık' : 'Yıllık'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={10} /> Sonraki: {sub.next_date}
                                        </span>
                                        {/* Simulated Price Hike Detection */}
                                        {sub.amount > 150 && sub.name.toLowerCase().includes('netflix') && (
                                            <div className="flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase animate-pulse">
                                                <Bell size={10} /> Fiyat Artışı Saptandı
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add Subscription Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 sm:items-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdding(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl"
                        >
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Yeni Abonelik</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Abonelik Adı (örn: Netflix)"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newSub.name}
                                    onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Tutar"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newSub.amount}
                                    onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                        value={newSub.category_id}
                                        onChange={e => setNewSub({ ...newSub, category_id: e.target.value })}
                                    >
                                        <option value="" className="text-slate-900 dark:text-white">Kategori Seç</option>
                                        {categories.filter(c => c.type === 'expense').map(c => (
                                            <option key={c.id} value={c.id} className="text-slate-900 dark:text-white">{c.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                        value={newSub.frequency}
                                        onChange={e => setNewSub({ ...newSub, frequency: e.target.value as any })}
                                    >
                                        <option value="monthly" className="text-slate-900 dark:text-white">Aylık</option>
                                        <option value="weekly" className="text-slate-900 dark:text-white">Haftalık</option>
                                        <option value="yearly" className="text-slate-900 dark:text-white">Yıllık</option>
                                    </select>
                                </div>
                                <input
                                    type="date"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newSub.next_date}
                                    onChange={e => setNewSub({ ...newSub, next_date: e.target.value })}
                                />
                                <button
                                    onClick={handleAdd}
                                    className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 mt-4"
                                >
                                    Ekle
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
