import { Alert, Snackbar } from '@mui/material';
import React from 'react';

const Toast: React.FC<{
  open: boolean;
  onClose: () => void;
  variant: 'success' | 'error' | 'info';
  content: string;
  vertical?: 'top' | 'bottom';
  horizontal?: 'center' | 'left' | 'right';
  duration?: number;
}> = ({ open, onClose, variant, content, vertical = 'top', horizontal = 'center', duration }) => (
  <Snackbar open={open} anchorOrigin={{ vertical, horizontal }} autoHideDuration={duration || 1000} onClose={onClose}>
    <Alert onClose={onClose} severity={variant} variant="filled">
      {content}
    </Alert>
  </Snackbar>
);

export default Toast;
