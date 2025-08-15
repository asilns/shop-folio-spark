import React from 'react';
import { cn } from '../utils';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { value, onValueChange } as any)
          : child
      )}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function TabsList({ children, className, value, onValueChange }: TabsListProps) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { value, onValueChange } as any)
          : child
      )}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function TabsTrigger({ value: triggerValue, children, className, value, onValueChange }: TabsTriggerProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        value === triggerValue ? "bg-background text-foreground shadow-sm" : "",
        className
      )}
      onClick={() => onValueChange?.(triggerValue)}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value: contentValue, children, className, ...props }: TabsContentProps & { value?: string }) {
  const { value } = props;
  
  if (value !== contentValue) {
    return null;
  }

  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  );
}