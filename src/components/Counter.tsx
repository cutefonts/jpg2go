import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

const BASE_CONVERSIONS = 2345678;
const START_DATE = new Date('2022-01-01T00:00:00Z');
const RATE_PER_SECOND = 0.5; // 1 conversion every 2 seconds

function getElapsedTimeBreakdown(startDate: Date) {
  const now = new Date();
  let diff = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 1000));
  const days = Math.floor(diff / (3600 * 24));
  diff -= days * 3600 * 24;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  return { days, hours, minutes, seconds };
}

const ConversionCounter: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total conversions
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - START_DATE.getTime()) / 1000));
  const conversions = Math.floor(BASE_CONVERSIONS + elapsedSeconds * RATE_PER_SECOND);
  const { days, hours, minutes, seconds } = getElapsedTimeBreakdown(START_DATE);

  const boxClass =
    'flex-1 flex flex-col items-center justify-center w-full h-40 bg-white rounded-[2.5rem] m-0';
  const numberClass = 'text-5xl sm:text-6xl font-extrabold text-violet-700 mb-2 font-sans';
  const labelClass = 'text-xl sm:text-2xl text-violet-600 font-semibold tracking-wide';

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 px-2">
      <div className="w-full max-w-6xl rounded-[3rem] bg-gradient-to-r from-violet-600 to-blue-500 px-4 sm:px-16 py-10 sm:py-16 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <TrendingUp className="h-10 w-10 text-white" />
            <span className="text-5xl sm:text-7xl md:text-8xl font-extrabold text-white tracking-tight font-sans">
              {conversions.toLocaleString()}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-white tracking-wide text-center">Total Conversions</div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
          <div className={boxClass}>
            <span className={numberClass}>{days}</span>
            <span className={labelClass}>Days</span>
          </div>
          <div className={boxClass}>
            <span className={numberClass}>{String(hours).padStart(2, '0')}</span>
            <span className={labelClass}>Hours</span>
          </div>
          <div className={boxClass}>
            <span className={numberClass}>{String(minutes).padStart(2, '0')}</span>
            <span className={labelClass}>Minutes</span>
          </div>
          <div className={boxClass}>
            <span className={numberClass}>{String(seconds).padStart(2, '0')}</span>
            <span className={labelClass}>Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionCounter; 