import styled from "styled-components";

export const BoxCard = styled.div`
  display: flex;
  padding: 16px;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid #EAECF0;
  background: #FFF;
  box-shadow: 0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06);
`;

const useStyles = () => ({
  BoxCard: {
    display: 'flex',
    padding: '16px',
    alignItems: 'flex-start',
    gap: '12px',
    flexShrink: 0,
    borderRadius: '12px',
    border: '1px solid #EAECF0',
    background: '#FFF',
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
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: 2,
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
});

export { useStyles };
