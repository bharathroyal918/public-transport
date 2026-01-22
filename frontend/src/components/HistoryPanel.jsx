import React from 'react';
import { Clock, Navigation } from 'lucide-react';

const HistoryPanel = ({ history, onSelect }) => {
    if (!history || history.length === 0) {
        return (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock size={16} />
                    <span className="font-semibold text-sm">Recent Searches</span>
                </div>
                <p className="text-gray-400 text-sm italic">No recent history.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Clock size={18} />
                <h3 className="font-semibold">Recent Searches</h3>
            </div>
            <div className="space-y-2">
                {history.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => onSelect(item)}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors text-sm border border-transparent hover:border-gray-200"
                    >
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{item.origin} → {item.destination}</span>
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                <Navigation size={10} /> Route: {item.Route_ID}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPanel;
