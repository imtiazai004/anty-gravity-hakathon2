import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AgentTraceView({ traces, isProcessing }) {
  if (traces.length === 0 && !isProcessing) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}
      >
        Submit a report to see Agent reasoning.
      </motion.div>
    );
  }

  return (
    <div className="agent-trace">
      <AnimatePresence>
        {traces.map((trace, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="trace-step active"
          >
            <div className="trace-title">{trace.title}</div>
            <div className="trace-content">{trace.content}</div>
          </motion.div>
        ))}
        {isProcessing && (
          <motion.div 
            key="processing-loader"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="trace-step"
          >
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="trace-title" 
              style={{ color: 'var(--accent-blue)' }}
            >
              Agent is thinking...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentTraceView;
