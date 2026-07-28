import type { PluginListenerHandle } from '@capacitor/core';
export interface StockfishNativePlugin {
    start(): Promise<void>;
    cmd(options: {
        cmd: string;
    }): Promise<void>;
    exit(): Promise<void>;
    getMaxMemory(): Promise<{
        value: number;
    }>;
    getCPUArch(): Promise<{
        value: string;
    }>;
    getDistribution(): Promise<{
        channel: string;
    }>;
    addListener(eventName: 'output', listenerFunc: (data: {
        line: string;
    }) => void): Promise<PluginListenerHandle>;
    removeAllListeners(): Promise<void>;
}
