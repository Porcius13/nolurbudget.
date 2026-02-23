import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { apiFetch } from './lib/api';
import { Transaction, Category, Summary, Budget } from './types';

import { NavItem, SummaryCard, MenuButton } from './components/UI';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AIAnalysis from './components/AIAnalysis';
import BudgetManager from './components/BudgetManager';
import AIChat from './components/AIChat';
import SubscriptionManager from './components/SubscriptionManager';
import SavingsGoals from './components/SavingsGoals';
import Achievements from './components/Achievements';
import OCRScanner from './components/OCRScanner';
import ForecastView from './components/ForecastView';
import InvestmentTracker from './components/InvestmentTracker';
import SharedWallets from './components/SharedWallets';
import AlertSystem from './components/AlertSystem';
import FinancialCalendar from './components/FinancialCalendar';
import VoiceInterface from './components/VoiceInterface';
import PortfolioInsights from './components/PortfolioInsights';
import DocumentSafe from './components/DocumentSafe';
import LegacyAccess from './components/LegacyAccess';
import CreditCardManager from './components/CreditCardManager';
import { t, Lang } from './services/i18nService';
import { chatWithAI } from './services/chatService';
import {
  MessageSquare,
  RefreshCw,
  Globe,
  Trophy,
  Briefcase,
  Users,
  Calendar as CalendarIcon,
  Languages,
  Menu,
  LayoutGrid,
  X as CloseIcon,
  Mic,
  FileText,
  TrendingUp,
  ShieldCheck,
  History as HistoryIcon,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Plus,
  CreditCard,
  Moon,
  Sun,
  Target,
  Sparkles,
  Zap,
  Heart
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'ai' | 'budgets' | 'chat' | 'subscriptions' | 'goals' | 'achievements' | 'investments' | 'wallets' | 'calendar' | 'menu' | 'insights' | 'docs' | 'legacy' | 'cards'>('dashboard');
  const [currency, setCurrency] = useState('TRY');
  const [lang, setLang] = useState<Lang>('tr');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_income: 0, total_expense: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Apply Privacy Mode globally via CSS class on body
  useEffect(() => {
    if (isPrivacyMode) {
      document.documentElement.classList.add('stealth-mode');
    } else {
      document.documentElement.classList.remove('stealth-mode');
    }
  }, [isPrivacyMode]);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    type: 'expense' as 'income' | 'expense',
    tags: '',
    currency: 'TRY'
  });

  useEffect(() => {
    fetchData();
    // Check system preference for dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const fetchData = async () => {
    try {
      const [tRes, cRes, sRes, bRes] = await Promise.all([
        apiFetch('/api/transactions'),
        apiFetch('/api/categories'),
        apiFetch('/api/summary'),
        apiFetch('/api/budgets')
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      const bData = await bRes.json();

      setTransactions(tData);
      setCategories(cData);
      setSummary(sData || { total_income: 0, total_expense: 0 });
      setBudgets(bData || []);
    } catch (error) {
      console.error('App: Error fetching data:', error);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          category_id: parseInt(formData.category_id)
        })
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setFormData({
          amount: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          category_id: '',
          type: 'expense',
          tags: '',
          currency: 'TRY'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleAddBudget = async (budgetData: any) => {
    try {
      await apiFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(budgetData.category_id),
          amount: parseFloat(budgetData.amount)
        })
      });
      fetchData();
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await apiFetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const confirmAiTransaction = async (item: any) => {
    const category = categories.find(c => c.name === item.category_suggestion) || categories.find(c => c.name === 'Diğer');
    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.amount,
          description: item.description,
          date: item.date,
          category_id: category?.id,
          type: 'expense',
          is_ai_generated: true
        })
      });
      setAiResults(prev => prev.filter(i => i !== item));
      fetchData();
    } catch (error) {
      console.error('Error confirming AI transaction:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (aiResults.length === 0) return;
    setIsBulkApproving(true);
    try {
      const batchData = aiResults.map(item => {
        const category = categories.find(c => c.name === item.category_suggestion) || categories.find(c => c.name === 'Diğer');
        return {
          amount: item.amount,
          description: item.description,
          date: item.date,
          category_id: category?.id,
          type: 'expense',
          is_ai_generated: true
        };
      });

      const response = await apiFetch('/api/transactions-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        setAiResults([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error bulk approving transactions:', error);
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleVoiceInput = async (text: string) => {
    setIsVoiceOpen(false);
    try {
      const prompt = `User said: "${text}". If this is a transaction, please format it as a JSON object with: amount (number), description (string), type ("expense" or "income"), category_suggestion (string). If it's a general question, just answer.`;
      const response = await chatWithAI(prompt, transactions, summary);

      if (response.includes('{') && response.includes('}')) {
        try {
          const jsonMatch = response.match(/\{.*\}/s);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            setFormData(prev => ({
              ...prev,
              amount: data.amount?.toString() || prev.amount,
              description: data.description || prev.description,
              type: data.type || prev.type,
              category_id: categories.find(c => c.name.toLowerCase().includes(data.category_suggestion?.toLowerCase()))?.id.toString() || prev.category_id
            }));
            setIsAddModalOpen(true);
          }
        } catch (e) {
          alert(response);
          setActiveTab('chat');
        }
      } else {
        alert(response);
        setActiveTab('chat');
      }
    } catch (error) {
      console.error("Voice processing error:", error);
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-500 flex justify-center selection:bg-indigo-500/30 overflow-hidden",
      "bg-slate-50 text-slate-900 dark:bg-black dark:text-white"
    )}>
      {/* Aurora Background Buluts */}
      <div className="aurora-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="main-container bg-transparent flex flex-col">

        {/* Modern Header */}
        <header className="px-6 pt-10 pb-4 flex justify-between items-center z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white">
              BÜTÇEDOSTU
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
              </motion.div>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 text-slate-400 dark:text-white/40">Premium Finance</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className={cn(
                "w-11 h-11 backdrop-blur-xl rounded-2xl shadow-sm border flex items-center justify-center transition-all active:scale-90",
                "bg-white border-slate-200 text-slate-400 dark:bg-white/5 dark:border-white/10 dark:text-white/40",
                isPrivacyMode && "text-rose-500 border-rose-500/30 dark:text-rose-500 dark:border-rose-500/30"
              )}
              title="Stealth Mode"
            >
              <ShieldCheck size={20} />
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="w-11 h-11 backdrop-blur-xl rounded-2xl shadow-sm border flex items-center justify-center transition-all active:scale-90 bg-white border-slate-200 text-indigo-600 dark:bg-white/5 dark:border-white/10 dark:text-indigo-400"
              title="AI Chat"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-11 h-11 backdrop-blur-xl rounded-2xl shadow-sm border flex items-center justify-center transition-all active:scale-90 bg-white border-slate-200 dark:bg-white/5 dark:border-white/10"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="w-11 h-11 backdrop-blur-xl rounded-2xl shadow-sm border flex flex-col items-center justify-center transition-all active:scale-90 bg-white border-slate-200 dark:bg-white/5 dark:border-white/10"
            >
              <Languages size={16} className="text-slate-400 dark:text-white/40 mb-0.5" />
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{lang}</span>
            </button>
            <div className="w-11 h-11 bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20 p-0.5">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Favis"
                alt="User"
                className="rounded-xl"
              />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-44 pt-4 px-6 no-scrollbar mobile-safe-bottom">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <AlertSystem />
                <Dashboard
                  key="dashboard"
                  summary={summary}
                  transactions={transactions}
                  categories={categories}
                />
              </div>
            )}

            {activeTab === 'transactions' && (
              <TransactionList
                key="transactions"
                transactions={transactions}
                onDelete={handleDeleteTransaction}
              />
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8 pb-12">
                <AIAnalysis
                  key="ai"
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                  aiResults={aiResults}
                  setAiResults={setAiResults}
                  isBulkApproving={isBulkApproving}
                  onBulkApprove={handleBulkApprove}
                  onConfirmItem={confirmAiTransaction}
                />
                <ForecastView transactions={transactions} />
              </div>
            )}

            {activeTab === 'budgets' && (
              <BudgetManager
                key="budgets"
                budgets={budgets}
                categories={categories}
                transactions={transactions}
                onAddBudget={handleAddBudget}
              />
            )}

            {activeTab === 'chat' && (
              <AIChat
                key="chat"
                transactions={transactions}
                summary={summary}
              />
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionManager
                key="subscriptions"
                categories={categories}
              />
            )}

            {activeTab === 'goals' && (
              <SavingsGoals
                key="goals"
              />
            )}

            {activeTab === 'achievements' && (
              <Achievements
                key="achievements"
              />
            )}

            {activeTab === 'investments' && (
              <InvestmentTracker
                key="investments"
              />
            )}

            {activeTab === 'wallets' && (
              <SharedWallets
                key="wallets"
              />
            )}

            {activeTab === 'calendar' && (
              <FinancialCalendar
                key="calendar"
                transactions={transactions}
              />
            )}

            {activeTab === 'menu' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 pb-20">
                <MenuButton icon={<ShieldCheck />} label={t('insights', lang)} onClick={() => setActiveTab('insights')} color="bg-rose-500" />
                <MenuButton icon={<FileText />} label={t('docs', lang)} onClick={() => setActiveTab('docs')} color="bg-indigo-600" />
                <MenuButton icon={<Heart />} label={t('legacy', lang)} onClick={() => setActiveTab('legacy')} color="bg-rose-600" />
                <MenuButton icon={<CreditCard />} label="Kartlarım" onClick={() => setActiveTab('cards')} color="bg-emerald-600" />
                <MenuButton icon={<Briefcase />} label={t('investments', lang)} onClick={() => setActiveTab('investments')} color="bg-blue-500" />
                <MenuButton icon={<Target />} label={t('goals', lang)} onClick={() => setActiveTab('goals')} color="bg-emerald-500" />
                <MenuButton icon={<Users />} label={t('wallets', lang)} onClick={() => setActiveTab('wallets')} color="bg-purple-500" />
                <MenuButton icon={<CalendarIcon />} label={t('calendar', lang)} onClick={() => setActiveTab('calendar')} color="bg-orange-500" />
                <MenuButton icon={<Trophy />} label={t('achievements', lang)} onClick={() => setActiveTab('achievements')} color="bg-yellow-500" />
                <MenuButton icon={<RefreshCw />} label={t('subscriptions', lang)} onClick={() => setActiveTab('subscriptions')} color="bg-indigo-500" />
                <MenuButton icon={<MessageSquare />} label={t('chat', lang)} onClick={() => setActiveTab('chat')} color="bg-pink-500" />
                <MenuButton icon={<PieChartIcon />} label={t('budgets', lang)} onClick={() => setActiveTab('budgets')} color="bg-cyan-500" />
              </div>
            )}

            {activeTab === 'insights' && (
              <PortfolioInsights key="insights" />
            )}

            {activeTab === 'docs' && (
              <DocumentSafe key="docs" />
            )}

            {activeTab === 'legacy' && (
              <LegacyAccess key="legacy" />
            )}

            {activeTab === 'cards' && (
              <CreditCardManager key="cards" />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isVoiceOpen && (
              <VoiceInterface
                onResult={handleVoiceInput}
                onClose={() => setIsVoiceOpen(false)}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Floating Pill Navigation */}
        <div className="nav-pill-container">
          <nav className="glass py-3 px-8 flex items-center justify-between shadow-2xl">
            <NavItem
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard size={24} />}
              label=""
            />
            <NavItem
              active={activeTab === 'transactions'}
              onClick={() => setActiveTab('transactions')}
              icon={<HistoryIcon size={24} />}
              label=""
            />

            <div className="relative -top-6">
              <div className="ai-pulse" />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsVoiceOpen(true)}
                className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full shadow-lg flex items-center justify-center relative z-10 border border-white/20"
              >
                <Mic size={24} />
              </motion.button>
            </div>

            <NavItem
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              icon={<Zap size={24} />}
              label=""
            />

            <NavItem
              active={activeTab === 'menu'}
              onClick={() => setActiveTab('menu')}
              icon={<LayoutGrid size={24} />}
              label=""
            />
          </nav>
        </div>
      </div>

      {/* New Transaction Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Yeni İşlem</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="mb-6">
                <OCRScanner
                  onResult={(data) => {
                    setFormData(prev => ({
                      ...prev,
                      amount: data.amount.toString(),
                      description: data.description,
                      date: data.date || prev.date,
                      category_id: categories.find(c => c.name.toLowerCase().includes(data.category_suggestion.toLowerCase()))?.id.toString() || prev.category_id
                    }));
                  }}
                />
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      formData.type === 'expense' ? "bg-white dark:bg-slate-700 text-rose-500 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Gider
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      formData.type === 'income' ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Gelir
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tutar (₺)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      autoFocus
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-3xl font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Açıklama</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Harcama detayını giriniz..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Kategori</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold appearance-none text-slate-900 dark:text-white"
                    >
                      <option value="">Seçiniz</option>
                      {categories.filter(c => c.type === formData.type).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">İşlem Tarihi</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Etiketler (Virgülle ayır)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="kira, fatura, eglence..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-5 premium-gradient-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-[0.98] mt-4"
                >
                  {t('save', lang)}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Chat Floating Action Button */}
      <AnimatePresence>
        {activeTab !== 'chat' && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab('chat')}
            className="fixed right-6 bottom-32 z-50 w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center border border-white/20"
          >
            <MessageSquare size={28} />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-white/20 rounded-full"
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
