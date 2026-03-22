"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
  active?: boolean;
}

export const FloatingDockVertical = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {items.map((item) => (
        <IconItem key={item.title} {...item} />
      ))}
    </div>
  );
};

function IconItem({ title, icon, href, onClick, active }: DockItem) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  // Separador
  if (href === "#" && title === "─") {
    return <div className="w-6 h-px bg-neutral-300 dark:bg-neutral-600 my-1" />;
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip flotante a la derecha */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-white shadow-lg pointer-events-none"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ícono fijo, sin animación de tamaño */}
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
          active
            ? "bg-black ring-2 ring-emerald-400 text-emerald-400"
            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100"
        )}
      >
        <div className="h-5 w-5">{icon}</div>
      </div>
    </a>
  );
}
