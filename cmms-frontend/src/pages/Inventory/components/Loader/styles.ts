import { makeStyles } from '@mui/styles';

const useStyles = makeStyles(() => ({
  BoxCard: {
    display: 'flex',
    padding: '16px',
    alignItems: 'flex-start',
    gap: '12px',
    flexShrink: 0,
    borderRadius: '12px',
    border: '1px solid var(--Gray-200, #EAECF0)',
    background: 'var(--Base-White, #FFF)',
    boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
  },
  Img: {
    width: '100px',
    height: '100px',
    flexShrink: 0,
    borderRadius: '8px',
  },
  BoxDetails: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flex: '1 0 0',
    alignSelf: 'stretch',
  },
  BoxTitle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    alignSelf: 'stretch',
  },
  FoodName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    '-webkit-box-orient': 'vertical',
    '-webkit-line-clamp': 2,
    alignSelf: 'stretch',
  },
  BoxAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  Currency: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}));

export { useStyles };
