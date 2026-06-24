import React, { useEffect, useState } from 'react';

interface TimeAgoProps {
  sectionEnteredAt?: string;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ sectionEnteredAt }) => {
  const [text, setText] = useState('NEW');

  useEffect(() => {
    const calculateTime = () => {
      if (!sectionEnteredAt) {
        setText('NEW');
        return;
      }
      const parsed = new Date(sectionEnteredAt).getTime();
      if (isNaN(parsed)) {
        setText('NEW');
        return;
      }
      const diffMs = Date.now() - parsed;
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));

      if (diffSec < 60) {
        setText('NEW');
      } else {
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
          setText(`${diffMin} min ago`);
        } else {
          const diffHr = Math.floor(diffMin / 60);
          if (diffHr < 24) {
            setText(`${diffHr} ${diffHr === 1 ? 'hr' : 'hrs'} ago`);
          } else {
            const diffDays = Math.floor(diffHr / 24);
            setText(`${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`);
          }
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [sectionEnteredAt]);

  const isNew = text === 'NEW';

  return (
    <span className={`font-semibold whitespace-nowrap ${isNew ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider' : 'text-slate-500 font-mono text-[11px]'}`}>
      {text}
    </span>
  );
};
