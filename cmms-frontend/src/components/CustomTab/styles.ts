import { makeStyles } from '@mui/styles';

const useStyles = makeStyles(() => ({
  Box: {
    display: 'flex',
    borderRadius: '6px',
    padding: '10px 14px',
    alignItems: 'center',
    gap: '8px',
  },
  BoxCustomTab: {
    display: 'flex',
    padding: '2px 10px',
    alignItems: 'center',
    borderRadius: '16px',
  },
}));

export { useStyles };
