import React, { useState, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsService, DirectionsRenderer, TrafficLayer, OverlayView } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem'
};

// Default center (Vijayawada approx)
const defaultCenter = {
    lat: 16.5062,
    lng: 80.6480
};

// Libraries must be a constant to prevent script reloading loops
const libraries = ["places"];

const MapComponent = ({ origin, destination, className, onDirectionsFetched, directions, routeIndex, onBusAgenciesFetched }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyCi3U0TUQmlrrrVOaR-aG6k4KNusN8DOKg",
        libraries
    });

    const [map, setMap] = useState(null);
    const [busAgencies, setBusAgencies] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState(null);

    const onLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback((map) => {
        setMap(null);
    }, []);

    // 1. Directions Effect
    React.useEffect(() => {
        if (!isLoaded || !map || !origin || !destination) return;

        let aborted = false;
        const directionsService = new google.maps.DirectionsService();

        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(),
                trafficModel: 'bestguess'
            },
            provideRouteAlternatives: true
        }, (result, status) => {
            if (aborted) return;
            if (status === google.maps.DirectionsStatus.OK) {
                if (onDirectionsFetched) onDirectionsFetched(result);
                // Center Map
                if (map && result.routes[0].bounds) {
                    map.fitBounds(result.routes[0].bounds);
                }
            } else {
                console.error(`Directions fetch failed: ${status}`);
            }
        });

        return () => { aborted = true; };
    }, [isLoaded, map, origin, destination, onDirectionsFetched]);

    // 2. Places/Buses Effect
    React.useEffect(() => {
        if (!isLoaded || !map || !origin) return;

        let aborted = false;
        // Explicitly clear markers when origin changes
        setBusAgencies([]);
        setSelectedAgency(null);

        const placesService = new google.maps.places.PlacesService(map);

        const fetchPrivateUtils = new Promise((resolve) => {
            placesService.textSearch({
                query: `bus travels in ${origin}`,
                fields: ['name', 'geometry', 'formatted_address', 'rating'],
            }, (results, status) => {
                resolve((status === google.maps.places.PlacesServiceStatus.OK && results) ? results : []);
            });
        });

        const fetchPublicRTC = new Promise((resolve) => {
            placesService.textSearch({
                query: `RTC bus station in ${origin}`,
                fields: ['name', 'geometry', 'formatted_address', 'rating'],
            }, (results, status) => {
                resolve((status === google.maps.places.PlacesServiceStatus.OK && results) ? results : []);
            });
        });

        Promise.all([fetchPrivateUtils, fetchPublicRTC]).then(([privateBuses, publicBuses]) => {
            if (aborted) return;
            // Mix & Slice
            const combined = [...publicBuses.slice(0, 5), ...privateBuses.slice(0, 5)];
            setBusAgencies(combined);
            if (onBusAgenciesFetched) onBusAgenciesFetched(combined);
        });

        return () => { aborted = true; };
    }, [isLoaded, map, origin, onBusAgenciesFetched]);


    if (!isLoaded) return <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy", // Fix for sliding/panning
                zoomControl: true, // Allow zooming
                scrollwheel: true
            }}
        >
            <TrafficLayer autoUpdate />

            {directions && directions.routes.map((route, idx) => {
                const isSelected = idx === routeIndex;
                return (
                    <DirectionsRenderer
                        key={`${origin}-${destination}-${idx}`}
                        options={{
                            directions: directions,
                            routeIndex: idx,
                            suppressMarkers: !isSelected, // Only show markers for selected route
                            preserveViewport: true, // Don't fight for viewport
                            polylineOptions: {
                                strokeColor: isSelected ? '#2563eb' : '#94a3b8', // Blue 600 vs Light Gray
                                strokeOpacity: isSelected ? 1.0 : 0.6,
                                strokeWeight: isSelected ? 8 : 5,
                                zIndex: isSelected ? 50 : 1 // Layering
                            }
                        }}
                    />
                );
            })}

            {/* Bus Agency Markers (Custom Red Badges) */}
            {busAgencies.map((agency, idx) => (
                <OverlayView
                    key={idx}
                    position={agency.geometry.location}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                    <div
                        className="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-full cursor-pointer hover:z-50 z-10"
                        onClick={() => setSelectedAgency(agency)}
                    >
                        {/* Label (Black Text, White Bg) */}
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-lg border border-gray-200 mb-1 whitespace-nowrap overflow-hidden max-w-[150px] text-ellipsis">
                            <span className="text-xs font-bold text-black leading-none">{agency.name}</span>
                        </div>

                        {/* Bus Symbol */}
                        <div className="text-3xl filter drop-shadow-xl hover:scale-110 transition-transform cursor-pointer">
                            🚌
                        </div>
                    </div>
                </OverlayView>
            ))}
        </GoogleMap>
    );
};

export default memo(MapComponent);
