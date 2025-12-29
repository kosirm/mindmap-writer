/**
 * Global error handler for MindScribble
 * Handles unhandled promise rejections and uncaught errors
 */

import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import { MindScribbleError } from '../core/errors';

export default boot(() => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);

    const error = event.reason;
    const message = error instanceof MindScribbleError
      ? error.message
      : error?.message || 'An unexpected error occurred';

    Notify.create({
      type: 'negative',
      message,
      timeout: 5000,
      position: 'top',
      actions: [{ label: 'Dismiss', color: 'white' }]
    });

    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    event.preventDefault();
  });
});
