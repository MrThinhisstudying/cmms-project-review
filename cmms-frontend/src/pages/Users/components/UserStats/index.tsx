import React from "react";
import { Typography, Grid, Box } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { BoxContent, CardContainer } from "./style";

interface IUserStat {
  label: string;
  value: number;
  change: string;
}

interface UserStatsProps {
  stats: IUserStat[];
}

const getStatStyles = (change: string) => {
  const changeValue = parseFloat(change);
  if (changeValue > 0) {
    return {
      backgroundColor: "#dbf6fd",
      color: "#096c86",
      icon: <TrendingUpIcon sx={{ color: "#096c86" }} />,
    };
  } else if (changeValue < 0) {
    return {
      backgroundColor: "#fee4cb",
      color: "#ff942e",
      icon: <TrendingDownIcon sx={{ color: "#ff942e" }} />,
    };
  }
  return { backgroundColor: "transparent", color: "", icon: null };
};

const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  return (
    <Grid container spacing={2} paddingY={2}>
      {stats.map((stat, index) => {
        const { backgroundColor, color, icon } = getStatStyles(stat.change);
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <CardContainer>
              <BoxContent>
                <Typography variant="subtitle1" color="textSecondary">
                  {stat.label}
                </Typography>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h4">{stat.value}</Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    padding="2px 4px"
                    borderRadius={1}
                    sx={{ backgroundColor }}
                  >
                    {icon}
                    <Typography
                      variant="body2"
                      color={color}
                      sx={{ marginLeft: 1 }}
                    >
                      {stat.change}
                    </Typography>
                  </Box>
                </Box>
              </BoxContent>
            </CardContainer>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default UserStats;
