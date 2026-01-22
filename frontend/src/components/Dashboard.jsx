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
        Day_OfWeek: 0
    });

    // Data States
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [result, setResult] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for Map Display (Decoupled from Form Input)
    const [displayedTrip, setDisplayedTrip] = useState({ origin: '', destination: '' });

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

    const handlePredict = async () => {
        setError(null);
        setLoading(true);
        setResult(null);
        setTrendData([]);

        // Update Map only on Calculate
        setDisplayedTrip({
            origin: formData.origin,
            destination: formData.destination
        });

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
            const updatedHistory = [newHistoryItem, ...searchHistory].slice(0, 10); // Keep last 10
            setSearchHistory(updatedHistory);
            localStorage.setItem('transitHistory', JSON.stringify(updatedHistory));

        } catch (err) {
            setError(err.message);
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
                        key={`${displayedTrip.origin}-${displayedTrip.destination}`}
                        className="w-full h-full"
                        origin={displayedTrip.origin}
                        destination={displayedTrip.destination}
                        onDirectionsFetched={handleDirectionsFetched}
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
                                    {displayedTrip.origin} <span className="text-gray-400">→</span> {displayedTrip.destination}
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
                        <div className="flex gap-6 h-full">

                            {/* Available Routes List */}
                            <div className="w-1/3 min-w-[250px] space-y-3">
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

                            {/* Analytics / Charts */}
                            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-full max-h-[300px]">
                                <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} /> Hourly Delay Forecast
                                </h4>
                                {trendData.length > 0 ? (
                                    <div className="w-full h-[85%]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        Forecast available after calculation
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
