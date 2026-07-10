"use client";

import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid
} from "recharts";

const data = [
  { time: "9 AM", revenue: 4200 },
  { time: "11 AM", revenue: 8400 },
  { time: "1 PM", revenue: 12500 },
  { time: "3 PM", revenue: 15300 },
  { time: "5 PM", revenue: 19800 },
  { time: "7 PM", revenue: 22100 },
  { time: "9 PM", revenue: 24350 },
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          tickFormatter={(value) => `₹${value}`}
          dx={-10}
        />
        <Tooltip 
          contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fafafa' }}
          formatter={(value: any) => [`₹${value}`, 'Revenue']}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#10b981" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorRevenue)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
