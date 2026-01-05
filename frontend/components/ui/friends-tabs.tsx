"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

// Custom TabsList specifically for Friends page with fixed grid layout
const FriendsTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [fixedWidth, setFixedWidth] = React.useState<number | null>(null);
  const widthLockedRef = React.useRef(false);

  // Combine refs
  React.useImperativeHandle(ref, () => listRef.current as any);

  // Lock width from Tabs container - measure from the Tabs root element
  React.useEffect(() => {
    if (widthLockedRef.current) return;

    const measureFromTabsContainer = () => {
      if (containerRef.current && !fixedWidth) {
        // Find the Tabs root container (data-radix-tabs-root or closest parent with specific class)
        let tabsContainer = containerRef.current.parentElement;
        let attempts = 0;
        while (tabsContainer && attempts < 10) {
          // Look for Tabs container - it might have a specific attribute or be the direct parent
          if (tabsContainer.getAttribute('data-radix-tabs-root') || 
              tabsContainer.classList.contains('space-y-6') ||
              tabsContainer.offsetWidth > 0) {
            const width = tabsContainer.offsetWidth;
            if (width && width > 0) {
              setFixedWidth(width);
              widthLockedRef.current = true;
              return;
            }
          }
          tabsContainer = tabsContainer.parentElement;
          attempts++;
        }
        
        // Fallback: use containerRef's offsetWidth
        if (containerRef.current && !fixedWidth) {
          const width = containerRef.current.offsetWidth;
          if (width && width > 0) {
            setFixedWidth(width);
            widthLockedRef.current = true;
          }
        }
      }
    };

    // Measure with multiple attempts
    const timer1 = setTimeout(measureFromTabsContainer, 0);
    const timer2 = setTimeout(measureFromTabsContainer, 50);
    const timer3 = setTimeout(measureFromTabsContainer, 150);
    const timer4 = setTimeout(measureFromTabsContainer, 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [fixedWidth]);

  // Continuously enforce fixed width - prevent any shrinking
  React.useEffect(() => {
    if (!fixedWidth || !containerRef.current) return;

    const enforceWidth = () => {
      if (containerRef.current) {
        // Force width using setProperty for higher priority
        containerRef.current.style.setProperty('width', `${fixedWidth}px`, 'important');
        containerRef.current.style.setProperty('min-width', `${fixedWidth}px`, 'important');
        containerRef.current.style.setProperty('max-width', `${fixedWidth}px`, 'important');
        containerRef.current.style.setProperty('flex-shrink', '0', 'important');
      }
      if (listRef.current) {
        listRef.current.style.setProperty('width', `${fixedWidth}px`, 'important');
        listRef.current.style.setProperty('min-width', `${fixedWidth}px`, 'important');
        listRef.current.style.setProperty('max-width', `${fixedWidth}px`, 'important');
        listRef.current.style.setProperty('flex-shrink', '0', 'important');
        listRef.current.style.setProperty('display', 'flex', 'important');
      }
    };

    // Enforce immediately
    enforceWidth();

    // Set up interval to continuously enforce (every 50ms for faster response)
    const interval = setInterval(enforceWidth, 50);

    // Also enforce on any DOM mutations with subtree to catch all changes
    const observer = new MutationObserver(() => {
      enforceWidth();
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true, // Watch subtree to catch changes in children
      });
    }

    // Also observe the list element
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [fixedWidth]);

  return (
    <div 
      ref={containerRef}
      className="w-full" 
      style={{ 
        display: 'block', 
        width: fixedWidth ? `${fixedWidth}px` : '100%',
        minWidth: fixedWidth ? `${fixedWidth}px` : '100%', 
        maxWidth: fixedWidth ? `${fixedWidth}px` : '100%',
        flexShrink: 0,
        flexGrow: 0,
        boxSizing: 'border-box',
      }}
    >
      <TabsPrimitive.List
        ref={listRef}
        className={cn(
          "flex gap-0 h-10 items-center rounded-md bg-muted p-1 text-muted-foreground w-full",
          className
        )}
        style={{
          display: 'flex',
          width: fixedWidth ? `${fixedWidth}px` : '100%',
          minWidth: fixedWidth ? `${fixedWidth}px` : '100%',
          maxWidth: fixedWidth ? `${fixedWidth}px` : '100%',
          flexShrink: 0,
          flexGrow: 0,
          boxSizing: 'border-box',
        }}
        {...props}
      />
    </div>
  );
})
FriendsTabsList.displayName = "FriendsTabsList"

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  
  // Combine refs
  const combinedRef = React.useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref && 'current' in ref) {
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    }
  }, [ref]);
  
  React.useEffect(() => {
    if (triggerRef.current) {
      // Force equal width for all triggers
      const enforceEqualWidth = () => {
        const parent = triggerRef.current?.parentElement;
        if (parent && triggerRef.current) {
          const parentWidth = parent.offsetWidth;
          const triggerWidth = parentWidth / 3; // 3 tabs
          triggerRef.current.style.setProperty('width', `${triggerWidth}px`, 'important');
          triggerRef.current.style.setProperty('min-width', `${triggerWidth}px`, 'important');
          triggerRef.current.style.setProperty('max-width', `${triggerWidth}px`, 'important');
          triggerRef.current.style.setProperty('flex', '0 0 auto', 'important');
          triggerRef.current.style.setProperty('flex-shrink', '0', 'important');
          triggerRef.current.style.setProperty('flex-grow', '0', 'important');
        }
      };
      
      enforceEqualWidth();
      const interval = setInterval(enforceEqualWidth, 50);
      return () => clearInterval(interval);
    }
  }, []);
  
  return (
    <TabsPrimitive.Trigger
      ref={combinedRef}
      className={cn(
        "flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 ease-in-out cursor-pointer",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold",
        className
      )}
      style={{
        flex: '0 0 auto',
        flexShrink: 0,
        flexGrow: 0,
        boxSizing: 'border-box',
      }}
      {...props}
    />
  );
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, FriendsTabsList, TabsTrigger, TabsContent }

