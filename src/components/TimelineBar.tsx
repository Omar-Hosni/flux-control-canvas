import React from 'react';
import { useTimelineEditingStore } from '@/stores/timelineEditingStore';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export const TimelineBar: React.FC = () => {
    const { entries, currentTime, maxTime, isPlaying, setCurrentTime, setIsPlaying } = useTimelineEditingStore();
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const [viewScale, setViewScale] = React.useState(1); // 1 = normal, 0.5 = zoomed out, 2 = zoomed in
    const [viewOffset, setViewOffset] = React.useState(0); // Offset for panning

    // Calculate visible range based on scale
    const visibleDuration = Math.max(maxTime, 5) / viewScale;
    const viewStart = viewOffset;
    const viewEnd = viewOffset + visibleDuration;

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));

        // Calculate time based on visible range
        const time = viewStart + (percentage * visibleDuration);
        const clampedTime = Math.max(0, Math.min(maxTime, parseFloat(time.toFixed(1))));

        setCurrentTime(clampedTime);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const reset = () => {
        setCurrentTime(0);
        setIsPlaying(false);
        setViewOffset(0);
    };

    const zoomIn = () => {
        setViewScale(prev => Math.min(prev * 1.5, 10));
    };

    const zoomOut = () => {
        setViewScale(prev => Math.max(prev / 1.5, 0.1));
    };

    const expandView = () => {
        setViewScale(prev => Math.max(prev - 0.2, 0.1));
    };

    const shrinkView = () => {
        setViewScale(prev => Math.min(prev + 0.2, 10));
    };

    // Scroll/pan left/right
    const panLeft = () => {
        setViewOffset(prev => Math.max(0, prev - visibleDuration * 0.25));
    };

    const panRight = () => {
        setViewOffset(prev => Math.min(Math.max(0, maxTime - visibleDuration), prev + visibleDuration * 0.25));
    };

    // Playback effect
    React.useEffect(() => {
        if (!isPlaying || currentTime >= maxTime) return;

        const interval = setInterval(() => {
            const nextTime = parseFloat((currentTime + 0.1).toFixed(1));
            if (nextTime > maxTime) {
                setIsPlaying(false);
            } else {
                setCurrentTime(nextTime);
            }
        }, 100); // 100ms = 0.1 second per frame

        return () => clearInterval(interval);
    }, [isPlaying, currentTime, maxTime, setCurrentTime, setIsPlaying]);

    // Keep playhead visible
    React.useEffect(() => {
        if (currentTime < viewStart) {
            setViewOffset(currentTime);
        } else if (currentTime > viewEnd) {
            setViewOffset(currentTime - visibleDuration + 0.5);
        }
    }, [currentTime, viewStart, viewEnd, visibleDuration]);

    const formatTime = (seconds: number): string => {
        const fixedSeconds = parseFloat(seconds.toFixed(1));
        const mins = Math.floor(fixedSeconds / 60);
        const secs = (fixedSeconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    // Generate time markers based on visible range
    const getTimeMarkers = () => {
        const markers = [];
        const step = visibleDuration > 10 ? 1 : visibleDuration > 5 ? 0.5 : 0.1;
        for (let t = Math.floor(viewStart); t <= Math.ceil(viewEnd); t += step) {
            if (t >= 0 && t <= maxTime) {
                markers.push(t);
            }
        }
        return markers;
    };

    const timeToPosition = (time: number): number => {
        return ((time - viewStart) / visibleDuration) * 100;
    };

    return (
        <div className="h-36 border-t border-border bg-[#1a1a1a] flex flex-col">
            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        disabled={entries.length === 0}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={reset}
                        disabled={entries.length === 0}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                    <span className="font-mono text-sm ml-2">
                        {formatTime(currentTime)} / {formatTime(maxTime)}
                    </span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={panLeft} title="Pan Left">
                        <span className="text-xs">◀</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={expandView} title="Show More Seconds">
                        <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">
                        {viewScale.toFixed(1)}x
                    </span>
                    <Button variant="ghost" size="icon" onClick={shrinkView} title="Show Fewer Seconds">
                        <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={panRight} title="Pan Right">
                        <span className="text-xs">▶</span>
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? 'edit' : 'edits'} | View: {formatTime(viewStart)}-{formatTime(Math.min(viewEnd, maxTime))}
                </div>
            </div>

            {/* Timeline Track */}
            <div className="flex-1 relative bg-[#111] overflow-hidden select-none">
                <div
                    ref={timelineRef}
                    className="absolute inset-0 cursor-pointer"
                    onMouseDown={(e) => {
                        setIsScrubbing(true);
                        handleScrub(e);
                    }}
                    onMouseMove={(e) => {
                        if (isScrubbing) handleScrub(e);
                    }}
                    onMouseUp={() => setIsScrubbing(false)}
                    onMouseLeave={() => setIsScrubbing(false)}
                >
                    {/* Time markers */}
                    {getTimeMarkers().map((t) => (
                        <div
                            key={t}
                            className="absolute top-0 bottom-0 w-px bg-white/10"
                            style={{ left: `${timeToPosition(t)}%` }}
                        >
                            <span className="text-[9px] text-muted-foreground ml-1 top-1 absolute">
                                {t.toFixed(1)}s
                            </span>
                        </div>
                    ))}

                    {/* Entry markers */}
                    {entries.map((entry) => {
                        const pos = timeToPosition(entry.time);
                        if (pos < 0 || pos > 100) return null;
                        return (
                            <div
                                key={entry.timestamp}
                                className="absolute top-6 w-2 h-2 rounded-full bg-blue-500 -translate-x-1 hover:bg-blue-400 cursor-pointer"
                                style={{ left: `${pos}%` }}
                                title={`${entry.operation} @ ${entry.time.toFixed(1)}s`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentTime(entry.time);
                                }}
                            />
                        );
                    })}

                    {/* Playhead */}
                    {currentTime >= viewStart && currentTime <= viewEnd && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 pointer-events-none z-10"
                            style={{ left: `${timeToPosition(currentTime)}%` }}
                        >
                            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-500 rounded-full" />
                        </div>
                    )}
                </div>

                {/* Entry labels */}
                <div className="absolute bottom-2 left-0 right-0 px-2 pointer-events-none">
                    <div className="flex flex-wrap gap-1">
                        {entries.slice(0, 10).map((entry) => (
                            <div
                                key={entry.timestamp}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 truncate max-w-[120px]"
                            >
                                {entry.operation}
                            </div>
                        ))}
                        {entries.length > 10 && (
                            <div className="text-[10px] px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground">
                                +{entries.length - 10} more
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
