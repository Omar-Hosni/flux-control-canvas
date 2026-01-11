/**
 * Frame utilities for timeline operations
 * Handles conversion between time (seconds) and frame numbers
 */

/**
 * Convert time in seconds to frame number
 * @param time Time in seconds
 * @param framerate Frames per second (e.g., 24, 30, 60)
 * @returns Frame number (integer)
 */
export const timeToFrame = (time: number, framerate: number): number => {
    return Math.round(time * framerate);
};

/**
 * Convert frame number to time in seconds
 * @param frame Frame number
 * @param framerate Frames per second (e.g., 24, 30, 60)
 * @returns Time in seconds
 */
export const frameToTime = (frame: number, framerate: number): number => {
    return frame / framerate;
};

/**
 * Format frame as timecode (MM:SS:FF)
 * @param frame Frame number
 * @param framerate Frames per second
 * @returns Formatted timecode string
 */
export const formatFrameAsTimecode = (frame: number, framerate: number): string => {
    const totalSeconds = Math.floor(frame / framerate);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frameInSecond = frame % framerate;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frameInSecond.toString().padStart(2, '0')}`;
};

/**
 * Format as simple frame number with "f" suffix
 * @param frame Frame number
 * @returns Formatted string (e.g., "120f")
 */
export const formatFrameNumber = (frame: number): string => {
    return `${frame}f`;
};

/**
 * Snap time to nearest frame boundary
 * @param time Time in seconds
 * @param framerate Frames per second
 * @returns Time snapped to nearest frame
 */
export const snapToFrame = (time: number, framerate: number): number => {
    const frame = timeToFrame(time, framerate);
    return frameToTime(frame, framerate);
};

/**
 * Common framerate presets
 */
export const FRAMERATES = {
    FILM: 24,
    NTSC: 30,
    PAL: 25,
    SMOOTH: 60,
} as const;

export type FrameratePreset = typeof FRAMERATES[keyof typeof FRAMERATES];
