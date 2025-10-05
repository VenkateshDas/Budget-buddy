'use client';

interface ExtractionPerformanceProps {
  extractionLog: {
    prompt?: string;
    response?: string;
    error?: string;
    success?: boolean;
    timings?: {
      optimization?: number;
      upload?: number;
      generation?: number;
      total?: number;
    };
  };
}

export default function ExtractionPerformance({ extractionLog }: ExtractionPerformanceProps) {
  const timings = extractionLog?.timings;

  if (!timings || !timings.total) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚡</span>
        <h3 className="text-sm font-semibold text-gray-700">Performance Metrics</h3>
      </div>

      <div className="space-y-2">
        {timings.optimization !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Image Optimization:</span>
            <span className="font-mono text-green-700">{formatTime(timings.optimization)}</span>
          </div>
        )}

        {timings.upload !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">File Upload:</span>
            <span className="font-mono text-blue-700">
              {timings.upload === 0 ? 'Cached ✓' : formatTime(timings.upload)}
            </span>
          </div>
        )}

        {timings.generation !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">AI Processing:</span>
            <span className="font-mono text-purple-700">{formatTime(timings.generation)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-300">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-gray-800">Total Time:</span>
            <span className="font-mono text-green-800">{formatTime(timings.total)}</span>
          </div>
        </div>
      </div>

      {timings.upload === 0 && (
        <div className="mt-3 text-xs text-blue-600 bg-blue-50 rounded p-2">
          💡 Using cached upload - reprocessing is faster!
        </div>
      )}
    </div>
  );
}
