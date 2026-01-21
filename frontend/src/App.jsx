import { useState } from 'react'
import Dashboard from './components/Dashboard'

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            TransitFlow AI
                        </h1>
                        <div className="flex space-x-4">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">System Active</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Dashboard />
            </main>
        </div>
    )
}

export default App
