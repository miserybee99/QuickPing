"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from "@/components/ui/toast"
import { AnimatePresence, motion } from "framer-motion"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[420px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(function ({ id, title, description, action, variant }) {
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto"
            >
              <Toast variant={variant}>
                <div className="grid gap-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action}
                <ToastClose 
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(id);
                  }} 
                />
              </Toast>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
