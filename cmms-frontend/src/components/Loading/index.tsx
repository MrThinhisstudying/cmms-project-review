import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = () => {
  return (
    <Box
      sx={{
        boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
      }}
      height="100vh"
      maxWidth="1024px"
      margin="auto"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box display="flex" flexDirection="column" alignItems="center" gap="16px">
        <CircularProgress color="success" />
        <Typography>Loading</Typography>
      </Box>
    </Box>
  );
};

export default Loading;
