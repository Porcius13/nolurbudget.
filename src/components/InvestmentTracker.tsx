import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Wallet, TrendingUp, Plus, Trash2, Briefcase, Coins, Landmark } from 'lucide-react';
import { Investment } from '../types';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

export default function InvestmentTracker() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newInv, setNewInv] = useState<{
        name: string;
        type: Investment['type'];
        amount: string;
        purchase_price: string;
        currency: string;
        subtype: string;
    }>({
        name: '',
        type: 'stock',
        amount: '',
        purchase_price: '',
        currency: 'TRY',
        subtype: 'gram'
    });

    const [prices, setPrices] = useState<Record<string, number>>({
        'gram': 2450.50,
        'ceyre': 4050.00,
        'BTC': 65400.00,
        'ETH': 3500.00,
        'AAPL': 185.20
    });

    const fetchInvestments = async () => {
        const res = await apiFetch('/api/investments');
        const data = await res.json();
        setInvestments(data);
    };

    useEffect(() => {
        fetchInvestments();
    }, []);

    const handleAdd = async () => {
        if (!newInv.name || !newInv.amount || !newInv.purchase_price) return;
        await apiFetch('/api/investments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newInv,
                amount: parseFloat(newInv.amount),
                purchase_price: parseFloat(newInv.purchase_price)
            })
        });
        setIsAdding(false);
        setNewInv({ name: '', type: 'stock', amount: '', purchase_price: '', currency: 'TRY', subtype: 'gram' });
        fetchInvestments();
    };

    const totalValue = investments.reduce((acc, inv) => acc + (inv.amount * (prices[inv.subtype || inv.name] || inv.current_price || inv.purchase_price)), 0);
    const totalProfit = investments.reduce((acc, inv) => {
        const current = prices[inv.subtype || inv.name] || inv.current_price || inv.purchase_price;
        return acc + (inv.amount * (current - inv.purchase_price));
    }, 0);

    return (
        <div className="space-y-6">
            <div className="premium-card p-10 rounded-[3.5rem] bg-indigo-600 dark:bg-slate-900 text-white relative overflow-hidden shadow-2xl border-none">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Landmark size={120} />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Toplam Yatırım Değeri</p>
                    <h2 className="text-5xl font-black mb-6">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalValue)}
                    </h2>
                    <div className="flex gap-4">
                        <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3">
                            <TrendingUp size={18} className="text-emerald-400" />
                            <span className="text-sm font-bold">
                                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString('tr-TR')} ₺
                            </span>
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl flex items-center gap-3 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-bold">Yeni Ekle</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investments.map((inv, i) => (
                    <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="premium-card p-6 rounded-3xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                                inv.type === 'stock' ? "bg-blue-500" : inv.type === 'crypto' ? "bg-orange-500" : "bg-yellow-500"
                            )}>
                                {inv.type === 'stock' ? <Briefcase size={20} /> : <Coins size={20} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
                                    {inv.subtype ? `${inv.name} (${inv.subtype})` : inv.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{inv.amount} Adet</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-slate-900 dark:text-white">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: inv.currency }).format(inv.amount * (prices[inv.subtype || inv.name] || inv.current_price || inv.purchase_price))}
                            </p>
                            <p className={cn(
                                "text-[9px] font-black",
                                (prices[inv.subtype || inv.name] || inv.current_price || inv.purchase_price) >= inv.purchase_price ? "text-emerald-500" : "text-rose-500"
                            )}>
                                {(((prices[inv.subtype || inv.name] || inv.current_price || inv.purchase_price) - inv.purchase_price) / inv.purchase_price * 100).toFixed(2)}%
                            </p>
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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Yeni Yatırım</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Varlık Adı (örn: Apple, BTC, Gram Altın)"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                                    value={newInv.name}
                                    onChange={e => setNewInv({ ...newInv, name: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    {['stock', 'crypto', 'gold'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewInv({ ...newInv, type: t as any })}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                newInv.type === t ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                            )}
                                        >
                                            {t === 'stock' ? 'Hisse' : t === 'crypto' ? 'Kripto' : 'Altın'}
                                        </button>
                                    ))}
                                </div>

                                {newInv.type === 'gold' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">Altın Türü</label>
                                        <select
                                            className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none outline-none"
                                            value={newInv.subtype}
                                            onChange={e => setNewInv({ ...newInv, subtype: e.target.value })}
                                        >
                                            <option value="gram">Gram Altın</option>
                                            <option value="ceyre">Çeyrek Altın</option>
                                            <option value="yarim">Yarım Altın</option>
                                            <option value="tam">Tam Altın</option>
                                            <option value="24k">24 Ayar</option>
                                            <option value="22k">22 Ayar</option>
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="Miktar"
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none"
                                        value={newInv.amount}
                                        onChange={e => setNewInv({ ...newInv, amount: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Alış Fiyatı"
                                        className="h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none"
                                        value={newInv.purchase_price}
                                        onChange={e => setNewInv({ ...newInv, purchase_price: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 mt-4 active:scale-95 transition-all"
                                >
                                    Portföye Ekle
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
