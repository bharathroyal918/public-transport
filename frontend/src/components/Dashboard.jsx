import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CloudRain, Calendar, MapPin, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
    const [formData, setFormData] = useState({
        Route_ID: '',
        Weather_Condition: 'Sunny',
        Event_Type: 'None',
        Hour: 8,
        Day_OfWeek: 0 // Monday
    });

    // State for dynamic content
    const [routes, setRoutes] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [featureData, setFeatureData] = useState([]);
    const [riskData, setRiskData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalysisData = async () => {
            try {
                // 1. Fetch Routes for Dropdown
                const routesRes = await axios.get('http://127.0.0.1:8000/routes');
                setRoutes(routesRes.data);
                // Pre-select first route if available
                if (routesRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, Route_ID: routesRes.data[0] }));
                }

                // 2. Fetch Feature Importance
                const featureRes = await axios.get('http://127.0.0.1:8000/feature-importance');
                const cleanedFeatures = featureRes.data.map(item => ({
                    feature: item.feature.replace('cat__', '').replace('Weather_Condition_', '').replace('Event_Type_', '').replace('Route_ID_', ''),
                    importance: item.importance
                })).slice(0, 8);
                setFeatureData(cleanedFeatures);

                // 3. Fetch Route Risks
                const riskRes = await axios.get('http://127.0.0.1:8000/route-risks');
                setRiskData(riskRes.data);
            } catch (err) {
                console.error("Failed to fetch analysis data", err);
                setError("Failed to load initial data. Ensure backend is running.");
            }
        };
        fetchAnalysisData();
    }, []);

    const checkPrediction = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('http://127.0.0.1:8000/predict', formData);
            setPrediction(response.data);
        } catch (err) {
            console.error("API Error:", err);
            setError("Failed to fetch prediction. Ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const sensitivityData = [
        { name: 'Sunny', delay: 5 },
        { name: 'Cloudy', delay: 7 },
        { name: 'Rainy', delay: 15 },
        { name: 'Snowy', delay: 30 }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="card space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-800">Predict Delay</h2>
                </div>

                <form onSubmit={checkPrediction} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Route ID</label>
                            <select
                                className="input-field"
                                value={formData.Route_ID}
                                onChange={(e) => setFormData({ ...formData, Route_ID: e.target.value })}
                            >
                                {routes.length === 0 && <option>Loading...</option>}
                                {routes.map(route => (
                                    <option key={route} value={route}>{route}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weather</label>
                            <select
                                className="input-field"
                                value={formData.Weather_Condition}
                                onChange={(e) => setFormData({ ...formData, Weather_Condition: e.target.value })}
                            >
                                <option value="Sunny">Sunny</option>
                                <option value="Rainy">Rainy</option>
                                <option value="Snowy">Snowy</option>
                                <option value="Cloudy">Cloudy</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                            <select
                                className="input-field"
                                value={formData.Event_Type}
                                onChange={(e) => setFormData({ ...formData, Event_Type: e.target.value })}
                            >
                                <option value="None">None</option>
                                <option value="Sports">Sports Match</option>
                                <option value="Concert">Concert</option>
                                <option value="Festival">Festival</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Time (Hour)</label>
                            <input
                                type="number"
                                min="0" max="23"
                                className="input-field"
                                value={formData.Hour}
                                onChange={(e) => setFormData({ ...formData, Hour: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Analyzing...' : 'Predict Delay'}
                    </button>

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>

                {/* Route Risks Chart */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center space-x-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-bold text-slate-800">Route Risk Assessment</h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={riskData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" />
                                <YAxis dataKey="Route_ID" type="category" stroke="#64748b" width={60} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="Delay_Minutes" fill="#f97316" radius={[0, 4, 4, 0]} name="Avg Delay (min)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
                {prediction && (
                    <div className="card border-l-4 border-l-blue-500">
                        <h3 className="text-lg font-semibold text-slate-700">Prediction Result</h3>
                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Estimated Delay</p>
                                <p className="text-4xl font-bold text-slate-900">{prediction.predicted_delay_minutes} <span className="text-lg text-slate-500">min</span></p>
                            </div>
                            <div className={`px-4 py-2 rounded-lg ${prediction.severity === 'High' ? 'bg-red-100 text-red-700' :
                                    prediction.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                }`}>
                                <span className="font-bold uppercase tracking-wider text-sm">{prediction.severity} Impact</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sensitivity Chart */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <CloudRain className="w-5 h-5 text-blue-500" />
                        Weather Impact
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sensitivityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="delay" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Feature Importance Chart */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        Top Delay Drivers
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={featureData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" stroke="#64748b" />
                                <YAxis dataKey="feature" type="category" stroke="#64748b" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Importance Score" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">Factors contributing most to prediction model</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
