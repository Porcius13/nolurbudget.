import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import { Goal } from '../types';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

export default function SavingsGoals() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newGoal, setNewGoal] = useState({
        name: '',
        target_amount: '',
        deadline: '',
        color: '#6366f1',
        icon: 'Target'
    });

    const fetchGoals = async () => {
        const res = await apiFetch('/api/goals');
        const data = await res.json();
        setGoals(data);
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const handleAdd = async () => {
        if (!newGoal.name || !newGoal.target_amount) return;
        await apiFetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newGoal,
                target_amount: parseFloat(newGoal.target_amount)
            })
        });
        setIsAdding(false);
        setNewGoal({ name: '', target_amount: '', deadline: '', color: '#6366f1', icon: 'Target' });
        fetchGoals();
    };

    const handleContribute = async (id: number, amount: number) => {
        await apiFetch(`/api/goals-contribute?id=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        fetchGoals();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-glow">Hedefler</h2>
                    <p className="text-sm text-slate-500 dark:text-white/40 font-medium">Hayallerin için biriktir.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-90"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {goals.map((goal, i) => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="premium-card p-6 rounded-[2rem] space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                        style={{ backgroundColor: goal.color }}
                                    >
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{goal.name}</h3>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            {goal.deadline ? `${goal.deadline} tarihine kadar` : 'Süresiz'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">%{Math.round(progress)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tamamlandı</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-slate-900 dark:text-white">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(goal.current_amount)}</span>
                                    <span className="text-slate-400">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(goal.target_amount)}</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full rounded-full shadow-inner"
                                        style={{ backgroundColor: goal.color }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleContribute(goal.id, 500)}
                                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all border border-slate-100 dark:border-slate-700"
                                >
                                    +500 ₺ Ekle
                                </button>
                                <button
                                    onClick={() => handleContribute(goal.id, 1000)}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                                >
                                    +1.000 ₺ Ekle
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Yeni Hedef</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Hedef Adı (örn: Yeni Bilgisayar)"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newGoal.name}
                                    onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Hedeflenen Tutar"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newGoal.target_amount}
                                    onChange={e => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                                />
                                <input
                                    type="date"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                    value={newGoal.deadline}
                                    onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewGoal({ ...newGoal, color: c })}
                                            className={cn(
                                                "w-10 h-10 rounded-full border-4 transition-all",
                                                newGoal.color === c ? "border-slate-300 dark:border-slate-500 scale-110" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 mt-4"
                                >
                                    Hedef Oluştur
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
