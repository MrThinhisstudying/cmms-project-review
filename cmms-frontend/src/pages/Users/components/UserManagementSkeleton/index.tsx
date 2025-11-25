import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Skeleton,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

const UserManagementSkeleton: React.FC = () => {
  const statCount = 4;
  const rowCount = 10;
  const colCount = 8;

  return (
    <Box
      p={2}
      sx={{
        height: "calc(100vh - 150px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        mb={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" width={200} height={40} />
      </Box>

      <Grid container spacing={2} paddingY={2}>
        {Array.from({ length: statCount }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Skeleton width="60%" height={20} />
                <Skeleton width="40%" height={40} sx={{ mt: 1 }} />
                <Skeleton width="30%" height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box display="flex" gap="12px" paddingBottom={2}>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </Box>

      <Box flex={1} overflow="auto" mt={2}>
        <Table>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: colCount }).map((_, j) => (
                  <TableCell key={j}>
                    {j === 0 ? (
                      <Box display="flex" alignItems="center">
                        <Skeleton variant="circular" width={30} height={30} />
                        <Skeleton width={80} height={20} sx={{ ml: 1 }} />
                      </Box>
                    ) : (
                      <Skeleton width="80%" height={20} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box mt={2} display="flex" justifyContent="space-between" gap={1}>
        <Box display="flex" justifyContent="flex-end">
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>

        <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              width={40}
              height={40}
            />
          ))}
        </Box>
        <Box display="flex" justifyContent="flex-end">
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>
      </Box>
    </Box>
  );
};

export default UserManagementSkeleton;
