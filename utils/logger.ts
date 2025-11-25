/**
 * Development-only logger that only logs in development environment
 */
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    } else {
      // In production, still log errors but only the error message
      console.error(...args.filter(arg => typeof arg === 'string' || arg instanceof Error));
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
  
  // For console.time and console.timeEnd
  time: (label?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label);
    }
  },
  
  timeEnd: (label?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label);
    }
  },
  
  // For console.group and console.groupEnd
  group: (...label: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(...label);
    }
  },
  
  groupEnd: () => {
    if (process.env.NODE_ENV === 'development') {
      console.groupEnd();
    }
  },
  
  // For console.table
  table: (tabularData: any, properties?: readonly string[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.table(tabularData, properties);
    }
  }
};

export default logger;
