import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  count: number;
  change?: {
    percentage: number;
    label: string;
  };
  icon: React.ReactNode;
}

export default function StatsCard({ title, count, change, icon }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-600">{title}</h3>
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <span className="text-2xl font-bold text-primary block mt-2">{count}</span>
        {change && (
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-green-500 flex items-center">
              <ArrowUp className="h-3 w-3 mr-1" />
              {change.percentage}%
            </span>
            {change.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
