import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Calendar, Clock, Cloud, Navigation, TrendingUp, AlertTriangle, Car } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import MapComponent from './MapComponent';
import HistoryPanel from './HistoryPanel';

const Dashboard = () => {
    // State
    const [formData, setFormData] = useState({
        origin: '',
        destination: '',
        Route_ID: '',
        Weather_Condition: 'Clear',
        Event_Type: 'Normal',
        Hour: 12,
        Day_OfWeek: 0,
        Temperature: 30,     // Default 30C
        Precipitation: 0,    // Default 0mm
        Event_Attendance: 0  // Default 0
    });

    // Data States
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [result, setResult] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busAgencies, setBusAgencies] = useState([]);

    // Debounced Search Terms for Auto-Update
    const [debouncedOrigin, setDebouncedOrigin] = useState('');
    const [debouncedDestination, setDebouncedDestination] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOrigin(formData.origin);
            setDebouncedDestination(formData.destination);
        }, 1500); // 1.5s delay to prevent spamming

        return () => clearTimeout(timer);
    }, [formData.origin, formData.destination]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const res = await fetch('http://localhost:8000/routes');
                const data = await res.json();
                if (data.routes) setAvailableRoutes(data.routes);
            } catch (e) {
                console.error("Failed to load routes", e);
            }
        };

        const loadHistory = () => {
            const saved = localStorage.getItem('transitHistory');
            if (saved) setSearchHistory(JSON.parse(saved));
        };

        fetchRoutes();
        loadHistory();
    }, []);

    // Auto-update granular details based on high-level selection (Defaults)
    useEffect(() => {
        setFormData(prev => {
            // ... (keep existing logic)
            let temp = prev.Temperature;
            let precip = prev.Precipitation;
            let attend = prev.Event_Attendance;

            // Weather Logic
            if (prev.Weather_Condition === 'Rainy') { precip = 20; temp = 25; }
            else if (prev.Weather_Condition === 'Snowy') { precip = 10; temp = -2; }
            else if (prev.Weather_Condition === 'Clear') { precip = 0; temp = 30; }
            else if (prev.Weather_Condition === 'Sunny') { precip = 0; temp = 35; }
            else if (prev.Weather_Condition === 'Cloudy') { precip = 0; temp = 28; }

            // Event Logic
            if (prev.Event_Type === 'Sports') attend = 40000;
            else if (prev.Event_Type === 'Concert') attend = 25000;
            else if (prev.Event_Type === 'Festival') attend = 60000;
            else if (prev.Event_Type === 'Protest') attend = 10000;
            else attend = 0;

            return { ...prev, Temperature: temp, Precipitation: precip, Event_Attendance: attend };
        });
    }, [formData.Weather_Condition, formData.Event_Type]);

    // Auto-Trigger Prediction on Debounced Input Change
    useEffect(() => {
        if (debouncedOrigin && debouncedDestination && debouncedOrigin !== debouncedDestination) {
            handlePredict();
        }
    }, [debouncedOrigin, debouncedDestination]);

    const handlePredict = async () => {
        setError(null);
        setLoading(true);
        setResult(null);
        setTrendData([]);

        // Clear map route immediately to prevent ghosting
        setMapDirections(null);

        try {
            // Main Prediction
            const response = await fetch('http://localhost:8000/predict-trip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to get prediction');
            }

            const data = await response.json();
            setResult(data);

            // Trend Prediction (Parallel)
            const trendRes = await fetch('http://localhost:8000/predict-trend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (trendRes.ok) {
                const tData = await trendRes.json();
                setTrendData(tData.trend);
            }

            // Update History
            const newHistoryItem = { ...formData, timestamp: new Date().toISOString() };
            const updatedHistory = [newHistoryItem, ...searchHistory].slice(0, 10);
            setSearchHistory(updatedHistory);
            localStorage.setItem('transitHistory', JSON.stringify(updatedHistory));

        } catch (err) {
            console.error(err);
            // Don't set visible error for auto-updates to avoid annoying UI flicker
            // setError(err.message); 
        } finally {
            setLoading(false);
        }
    };

    const handleHistorySelect = (item) => {
        setFormData({
            ...item,
            Hour: item.Hour, // Ensure persistence
            Day_OfWeek: item.Day_OfWeek
        });
        // Also update displayed trip immediately for history selection if desired, 
        // or let user click calculate. Let's let user click calculate for consistency, 
        // OR better UX: update map immediately if selecting history.
        // Let's stick to consistent "Calculate" button behavior unless requested otherwise.
    };

    // Map State (Lifted Up)
    const [mapDirections, setMapDirections] = useState(null);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

    const handleDirectionsFetched = useCallback((directions) => {
        setMapDirections(directions);
        setSelectedRouteIndex(0);
    }, []);

    const handleBusAgenciesFetched = useCallback((agencies) => {
        setBusAgencies(agencies);
    }, []);

    // Calculate Dynamic Total Time based on Selected Route + AI Delay
    const getDynamicTotalTime = () => {
        if (!mapDirections || !mapDirections.routes[selectedRouteIndex]) {
            return result ? result.total_estimated_arrival : '0';
        }

        const route = mapDirections.routes[selectedRouteIndex];
        const leg = route.legs[0];

        // Base time in minutes
        const baseDurationMin = Math.round((leg.duration_in_traffic?.value || leg.duration?.value) / 60);

        // Add AI delay (if available)
        const aiDelay = result ? result.predicted_extra_delay : 0;

        return (baseDurationMin + aiDelay).toFixed(0);
    };

    const currentRoute = mapDirections?.routes[selectedRouteIndex];
    const hasTraffic = currentRoute ? (currentRoute.legs[0].duration_in_traffic?.value > currentRoute.legs[0].duration?.value + 300) : false; // > 5 min delay
    const trafficDelayVal = hasTraffic ? Math.round((currentRoute.legs[0].duration_in_traffic?.value - currentRoute.legs[0].duration?.value) / 60) : 0;


    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Sidebar / Left Panel */}
            <div className="w-1/3 min-w-[350px] p-6 flex flex-col gap-6 overflow-y-auto border-r border-gray-200 bg-white z-20">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        TransitAI
                    </h1>
                    <p className="text-gray-500 text-sm">Smart Delay Prediction System</p>
                </div>

                {/* Input Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Navigation size={18} className="text-blue-600" /> Trip Details
                    </h3>

                    <div className="space-y-3">
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input
                                className="w-full pl-10 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Origin (e.g. Vijayawada)"
                                value={formData.origin}
                                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                            />
                        </div>

                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-red-400" size={16} />
                            <input
                                className="w-full pl-10 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Destination (e.g. Guntur)"
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            />
                        </div>

                        <div className="relative">
                            <Car className="absolute left-3 top-3 text-gray-400" size={16} />
                            <select
                                className="w-full pl-10 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                                value={formData.Route_ID}
                                onChange={(e) => setFormData({ ...formData, Route_ID: e.target.value })}
                            >
                                <option value="">Select Route ID</option>
                                {availableRoutes.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 ml-1">Weather</label>
                            <div className="relative">
                                <Cloud className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                <select
                                    className="w-full pl-8 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    value={formData.Weather_Condition}
                                    onChange={(e) => setFormData({ ...formData, Weather_Condition: e.target.value })}
                                >
                                    <option>Clear</option>
                                    <option>Rainy</option>
                                    <option>Foggy</option>
                                    <option>Cloudy</option>
                                    <option>Snowy</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 ml-1">Event</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                <select
                                    className="w-full pl-8 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    value={formData.Event_Type}
                                    onChange={(e) => setFormData({ ...formData, Event_Type: e.target.value })}
                                >
                                    <option>Normal</option>
                                    <option>Holiday</option>
                                    <option>Peak Hours</option>
                                    <option>Festival</option>
                                    <option>Protest</option>
                                    <option>Sports</option>
                                    <option>Concert</option>
                                    <option>None</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 ml-1">Hour (0-23)</label>
                            <input
                                type="number" min="0" max="23"
                                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.Hour}
                                onChange={(e) => setFormData({ ...formData, Hour: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 ml-1">Day (0=Mon)</label>
                            <select
                                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.Day_OfWeek}
                                onChange={(e) => setFormData({ ...formData, Day_OfWeek: parseInt(e.target.value) })}
                            >
                                <option value="0">Monday</option>
                                <option value="1">Tuesday</option>
                                <option value="2">Wednesday</option>
                                <option value="3">Thursday</option>
                                <option value="4">Friday</option>
                                <option value="5">Saturday</option>
                                <option value="6">Sunday</option>
                            </select>
                        </div>
                    </div>

                    {/* Granular "What-If" Controls */}
                    <div className="border-t border-gray-100 pt-3 mt-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Scenario Analysis (What-If)</p>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">Rainfall (mm)</span>
                                    <span className="font-bold text-blue-600">{formData.Precipitation} mm</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    value={formData.Precipitation}
                                    onChange={(e) => setFormData({ ...formData, Precipitation: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">Temperature (°C)</span>
                                    <span className="font-bold text-orange-600">{formData.Temperature}°C</span>
                                </div>
                                <input
                                    type="range" min="-10" max="50" step="1"
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                    value={formData.Temperature}
                                    onChange={(e) => setFormData({ ...formData, Temperature: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">Crowd Size</span>
                                    <span className="font-bold text-purple-600">{formData.Event_Attendance.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="0" max="100000" step="1000"
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    value={formData.Event_Attendance}
                                    onChange={(e) => setFormData({ ...formData, Event_Attendance: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePredict}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all active:translate-y-[0px] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? 'Calculating...' : (
                            <>
                                <TrendingUp size={18} /> Calculate Delay
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2 border border-red-100">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
                        </div>
                    )}
                </div>

                <HistoryPanel history={searchHistory} onSelect={handleHistorySelect} />

            </div>

            {/* Main Content / Right Panel */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {/* 1. Map Section (Top) */}
                <div className="h-[50%] bg-gray-100 relative border-b border-gray-200">
                    <MapComponent
                        className="w-full h-full"
                        origin={debouncedOrigin}
                        destination={debouncedDestination}
                        onDirectionsFetched={handleDirectionsFetched}
                        onBusAgenciesFetched={handleBusAgenciesFetched}
                        directions={mapDirections}
                        routeIndex={selectedRouteIndex}
                    />
                </div>

                {/* 2. Trip Summary & Analytics (Bottom) */}
                <div className="h-[50%] flex flex-col overflow-hidden">

                    {/* Summary Header */}
                    {mapDirections && (
                        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    {debouncedOrigin} <span className="text-gray-400">→</span> {debouncedDestination}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {mapDirections.routes[selectedRouteIndex]?.summary}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-blue-600">
                                    {getDynamicTotalTime()} <span className="text-base font-normal text-gray-500">min</span>
                                </div>
                                <div className="text-xs text-gray-400 flex flex-col items-end">
                                    <span>
                                        Traffic: {hasTraffic ? <span className="text-red-500 font-bold">+{trafficDelayVal} min</span> : 'Normal'}
                                    </span>
                                    {result && <span>AI Delay: +{result.predicted_extra_delay.toFixed(1)} min</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scrollable Content: Routes & Graphs */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="flex gap-6 min-h-full">

                            {/* Available Routes List */}
                            <div className="w-1/3 min-w-[250px] space-y-3 h-fit">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Available Routes</h4>
                                {mapDirections?.routes.map((route, idx) => {
                                    const isSelected = idx === selectedRouteIndex;
                                    const leg = route.legs[0];
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedRouteIndex(idx)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all shadow-sm ${isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-lg">Route {idx + 1}</span>
                                                <span className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {leg.duration_in_traffic?.text || leg.duration?.text}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {route.summary}
                                            </p>
                                        </button>
                                    )
                                })}
                                {!mapDirections && (
                                    <div className="text-center py-10 text-gray-400">
                                        Enter locations to see routes
                                    </div>
                                )}
                            </div>

                            {/* Analytics / Charts & Available Travels */}
                            <div className="flex-1 flex flex-col gap-6">
                                {/* Hourly Delay Forecast Chart */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col" style={{ height: '280px' }}>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2 shrink-0">
                                        <TrendingUp size={16} /> Hourly Delay Forecast
                                    </h4>
                                    {trendData.length > 0 ? (
                                        <div className="flex-1 w-full min-h-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorDelay" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                                                    <YAxis tick={{ fontSize: 10 }} />
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <Tooltip />
                                                    <Area type="monotone" dataKey="delay" stroke="#2563eb" fillOpacity={1} fill="url(#colorDelay)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                            Forecast available after calculation
                                        </div>
                                    )}
                                </div>

                                {/* Available Travels Dialog */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col" style={{ height: '500px' }}>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
                                        <Car size={16} className="text-blue-600" /> Available Travels
                                    </h4>
                                    <div className="flex-1 overflow-y-auto">
                                        {busAgencies.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3 pr-2">
                                                {busAgencies.map((agency, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-blue-400"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xl mt-0.5">🚌</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-800 truncate">{agency.name}</p>
                                                                <p className="text-xs text-gray-500 line-clamp-2">{agency.formatted_address}</p>
                                                                {agency.rating && (
                                                                    <p className="text-xs text-yellow-600 mt-1">⭐ {agency.rating.toFixed(1)}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-400 text-sm">
                                                {debouncedOrigin ? 'Loading available travels...' : 'Enter origin to see available travels'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
