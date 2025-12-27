import React from 'react';
import { usePresence } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface OnlineStatusBadgeProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({ 
  userId, 
  size = 'sm',
  className 
}) => {
  const isOnline = usePresence(userId);

  const sizeClasses = {
    sm: 'w-2.5 h-2.5 border-2',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-[3px]',
  };

  return (
    <span 
      className={cn(
        'absolute bottom-0 right-0 rounded-full border-background',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-muted-foreground',
        className
      )} 
    />
  );
};

export default OnlineStatusBadge;
