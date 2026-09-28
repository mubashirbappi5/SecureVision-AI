"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DetectionEvent } from '@securevision/shared-types';

export default function ActivityGraph({ events }: { events: DetectionEvent[] }) {
  // Group events by time (mock or real)
  const data = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { time: '10:00', alerts: 0 },
        { time: '11:00', alerts: 0 },
        { time: '12:00', alerts: 0 },
      ];
    }
    
    // Group events by minute for better visualization of recent activity
    const counts: Record<string, number> = {};
    
    events.forEach(ev => {
      const date = new Date(ev.timestamp || Date.now());
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      counts[timeStr] = (counts[timeStr] || 0) + 1;
    });

    // Convert to array and sort by time
    const chartData = Object.keys(counts)
      .sort()
      .map(time => ({ time, alerts: counts[time] }))
      .slice(-10); // Show last 10 time slots

    return chartData;
  }, [events]);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: '#334155' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
          />
          <Bar dataKey="alerts" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
