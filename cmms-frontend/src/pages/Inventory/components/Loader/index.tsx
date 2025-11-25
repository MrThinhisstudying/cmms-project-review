import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { useStyles } from "./styles";

const Loader: React.FC<{ rows?: number }> = ({ rows }) => {
  const classes = useStyles();
  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={{ xs: 2, md: 3 }}
        columns={{ xs: 12, sm: 12, md: 12, lg: 12 }}
      >
        {[...Array(rows ?? 9)].map((item, index) => (
          <Grid item sm={12} md={6} lg={4} key={index}>
            <Box className={classes.BoxCard}>
              <Skeleton variant="rectangular" className={classes.Img} />
              <Box className={classes.BoxDetails}>
                <Box className={classes.BoxTitle}>
                  <Typography
                    fontSize={16}
                    lineHeight={"24px"}
                    className={classes.FoodName}
                  >
                    <Skeleton variant="text" width={100} />
                  </Typography>
                  <Typography
                    fontSize={14}
                    fontWeight={500}
                    lineHeight={"20px"}
                    color={"var(--Primary-500, #3D9F4A)"}
                  >
                    <Skeleton variant="text" width={50} />
                  </Typography>
                </Box>
                <Box className={classes.BoxAction}>
                  <Skeleton variant="rectangular" width={24} height={24} />
                  <Skeleton variant="rectangular" width={24} height={24} />
                </Box>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Loader;
