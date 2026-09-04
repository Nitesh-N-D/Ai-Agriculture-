import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, AlertTriangle, Loader2, Map, Droplets, Sprout, Wheat } from 'lucide-react';

const Report = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        Nitrogen: 90,
        Phosphorus: 40,
        Potassium: 40,
        Temperature: 28,
        Humidity: 70,
        pH: 6.5,
        Rainfall: 200,
        Area: 'India',
        Crop: 'rice',
        Year: 2024
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'number' ? parseFloat(value) : value
        });
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        const payload = new FormData();
        for (const key in formData) {
            payload.append(key, formData[key]);
        }

        try {
            const { data } = await axios.post('http://127.0.0.1:8000/smart-report', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(data.smart_report);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initialize system core.');
        } finally {
            setLoading(false);
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, type: "spring", bounce: 0.4 }
        })
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 lg:p-8 max-w-6xl mx-auto h-full text-slate-100 relative z-10 w-full"
        >
            <div className="mb-8 text-center w-full">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-400/40"
                >
                    <FileText className="w-7 h-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-2 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">{t('report_title')}</h1>
                <p className="text-slate-400 font-normal tracking-wide text-xs uppercase">{t('report_subtitle')}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="dash-card p-6 lg:p-8 relative overflow-hidden group w-full"
                >
                    <form onSubmit={handlePredict} className="space-y-6 relative z-10">

                        {/* Biosphere Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase border-b border-[#1a3624] pb-2 mb-2 flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-emerald-400" /> {t('report_biosphere_metrics')}
                                </h3>
                            </div>
                            {[
                                { name: 'Nitrogen', type: 'number', label: t('report_nitrogen') },
                                { name: 'Phosphorus', type: 'number', label: t('report_phosphorus') },
                                { name: 'Potassium', type: 'number', label: t('report_potassium') },
                                { name: 'Temperature', type: 'number', label: t('report_temperature') },
                                { name: 'Humidity', type: 'number', label: t('report_humidity') },
                                { name: 'pH', type: 'number', label: t('report_ph') },
                                { name: 'Rainfall', type: 'number', label: t('report_rainfall') },
                            ].map(f => (
                                <div key={f.name}>
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{f.label || f.name}</label>
                                    <input
                                        type={f.type} step="any" name={f.name} value={formData[f.name]}
                                        onChange={handleChange} required
                                        className="w-full px-3 py-2.5 rounded-xl border border-[#1a3624] bg-[#0c1810] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-center font-mono text-xs"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Spatial Targets */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="col-span-2">
                                <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase border-b border-[#1a3624] pb-2 mb-2 flex items-center gap-2">
                                    <Map className="w-4 h-4 text-amber-400" /> {t('report_location_details')}
                                </h3>
                            </div>
                            {[
                                { name: 'Area', label: t('report_area') },
                                { name: 'Crop', label: t('report_crop') },
                                { name: 'Year', label: t('report_year') }
                            ].map(f => (
                                <div key={f.name}>
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{f.label}</label>
                                    <input
                                        type={f.name === 'Year' ? 'number' : 'text'} name={f.name} value={formData[f.name]}
                                        onChange={handleChange} required
                                        className="w-full px-3 py-2.5 rounded-xl border border-[#1a3624] bg-[#0c1810] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-center font-mono text-xs uppercase"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <motion.button
                                whileHover={{ scale: !loading ? 1.02 : 1 }}
                                whileTap={{ scale: !loading ? 0.98 : 1 }}
                                type="submit"
                                disabled={loading}
                                className={`dash-btn-primary w-full py-3.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 ${loading && 'opacity-50 cursor-not-allowed shadow-none'}`}
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                <span>{loading ? t('report_btn_analyzing') : t('report_btn_generate')}</span>
                            </motion.button>
                        </div>
                    </form>
                </motion.div>

                {/* Results Area */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="h-full relative w-full"
                >
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="dash-card !bg-red-500/10 !border-red-500/30 p-5 flex gap-3 text-red-200 mb-6"
                            >
                                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                                <p className="text-xs font-medium">{error}</p>
                            </motion.div>
                        )}

                        {!result && !error && !loading && (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="dash-card p-8 flex flex-col items-center justify-center text-center h-[460px] border-dashed"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-[#122418] border border-[#1b3a26] flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-2">Integrated Farm Report</h3>
                                <p className="text-slate-400 text-xs max-w-[280px] leading-relaxed">
                                    {t('report_placeholder_desc')}
                                </p>
                            </motion.div>
                        )}

                        {result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="dash-card overflow-hidden w-full relative"
                            >
                                <div className="p-6 border-b border-[#183120] bg-[#0c1810] flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-wide">{t('report_analysis_complete')}</h3>
                                    <p className="text-emerald-400 text-xs font-semibold mt-1 uppercase tracking-wider">{t('report_generated')}</p>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Crop Recommendation Render */}
                                    {result.crop_recommendation && (
                                        <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible" className="p-4 rounded-xl bg-[#122418] border border-[#1b3a26]">
                                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Sprout className="w-4 h-4 text-emerald-400" /> {t('report_crop_recommendation')}
                                            </h4>
                                            {result.crop_recommendation.error ? (
                                                <p className="text-red-400 font-mono text-xs">{result.crop_recommendation.error}</p>
                                            ) : (
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-2xl font-extrabold text-emerald-400 capitalize mb-0.5">
                                                            {result.crop_recommendation.recommended_crop}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">{t('report_best_crop')}</p>
                                                    </div>
                                                    {result.crop_recommendation.confidence && (
                                                        <div className="text-right">
                                                            <p className="text-lg font-extrabold text-white">
                                                                {result.crop_recommendation.confidence.toFixed(1)}%
                                                            </p>
                                                            <p className="text-[10px] text-emerald-400 font-semibold uppercase">{t('report_match')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* Harvest Yield Forecast Render */}
                                    {result.yield_prediction && (
                                        <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible" className="p-4 rounded-xl bg-[#122418] border border-[#1b3a26]">
                                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Wheat className="w-4 h-4 text-amber-400" /> {t('report_yield_forecast')}
                                            </h4>
                                            {result.yield_prediction.error ? (
                                                <p className="text-red-400 font-mono text-xs">{result.yield_prediction.error}</p>
                                            ) : (
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-2xl font-extrabold text-amber-400 mb-0.5">
                                                            {result.yield_prediction.predicted_yield?.toFixed(2)} <span className="text-sm font-normal text-slate-400">t/ha</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">{t('report_estimated_yield')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                                            result.yield_prediction.yield_level === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                                            result.yield_prediction.yield_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                                            'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                        }`}>
                                                            {result.yield_prediction.yield_level}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-1">{t('report_yield_level')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Report;
