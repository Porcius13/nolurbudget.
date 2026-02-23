import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard as CardIcon, Plus, Trash2, Calendar, AlertCircle, Bell } from 'lucide-react';
import { CreditCard } from '../types';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

export default function CreditCardManager() {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newCard, setNewCard] = useState({
        name: '',
        limit: '',
        balance: '',
        closing_day: '15',
        due_day: '25',
        color: '#4f46e5'
    });

    const fetchCards = async () => {
        const res = await apiFetch('/api/cards');
        if (res.ok) {
            const data = await res.json();
            setCards(data);
        }
    };

    useEffect(() => {
        fetchCards();
    }, []);

    const handleAdd = async () => {
        if (!newCard.name || !newCard.limit || !newCard.balance) return;
        await apiFetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newCard,
                limit: parseFloat(newCard.limit),
                balance: parseFloat(newCard.balance),
                closing_day: parseInt(newCard.closing_day),
                due_day: parseInt(newCard.due_day)
            })
        });
        setIsAdding(false);
        setNewCard({ name: '', limit: '', balance: '', closing_day: '15', due_day: '25', color: '#4f46e5' });
        fetchCards();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kredi Kartlarım</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Limit ve Ödeme Takibi</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative overflow-hidden group"
                    >
                        <div
                            className="premium-card p-8 rounded-[2.5rem] text-white relative z-10 overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)` }}
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">BütçeDostu Card</p>
                                    <h3 className="text-2xl font-black">{card.name}</h3>
                                </div>
                                <CardIcon size={32} className="opacity-40" />
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-1 text-white">Güncel Borç</p>
                                    <p className="text-2xl font-black">{card.balance.toLocaleString('tr-TR')} ₺</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-1 text-white">Kullanılabilir Limit</p>
                                    <p className="text-2xl font-black">{(card.limit - card.balance).toLocaleString('tr-TR')} ₺</p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-white/10">
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                                    <Calendar size={14} className="text-white" />
                                    <span className="text-[10px] font-bold">Kesim: {card.closing_day}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-rose-500/20 px-4 py-2 rounded-xl backdrop-blur-md border border-rose-500/30">
                                    <Bell size={14} className="text-rose-300" />
                                    <span className="text-[10px] font-bold">Ödeme: {card.due_day}</span>
                                </div>
                            </div>

                            <div className="absolute right-0 bottom-0 p-8 opacity-5">
                                <CardIcon size={120} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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
                            className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-white/10"
                        >
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Yeni Kart Ekle</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Kart Adı (örn: Bonus Gold)"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                    value={newCard.name}
                                    onChange={e => setNewCard({ ...newCard, name: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="Kart Limiti"
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                        value={newCard.limit}
                                        onChange={e => setNewCard({ ...newCard, limit: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Güncel Borç"
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                        value={newCard.balance}
                                        onChange={e => setNewCard({ ...newCard, balance: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">Kesim Günü</label>
                                        <input
                                            type="number"
                                            min="1" max="31"
                                            className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                            value={newCard.closing_day}
                                            onChange={e => setNewCard({ ...newCard, closing_day: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">Son Ödeme Günü</label>
                                        <input
                                            type="number"
                                            min="1" max="31"
                                            className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                            value={newCard.due_day}
                                            onChange={e => setNewCard({ ...newCard, due_day: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 mt-4 active:scale-95 transition-all"
                                >
                                    Kartı Kaydet
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
