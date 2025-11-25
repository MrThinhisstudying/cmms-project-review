import React from "react";
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

const MaintenanceSkeleton: React.FC = () => {
  const columnCount = 7;
  const rowCount = 10;

  return (
    <Box flex={1} p={2} sx={{ height: "calc(100vh - 120px)" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Skeleton variant="text" width={250} height={32} />
        <Box display="flex" gap={1}>
          <Skeleton variant="rectangular" width={150} height={36} />
        </Box>
      </Box>

      <Box sx={{ overflow: "auto" }}>
        <Table>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    {colIndex === columnCount - 1 ? (
                      <Skeleton variant="circular" width={30} height={30} />
                    ) : (
                      <Skeleton width={80} height={20} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box mt={2} display="flex" justifyContent="center" gap={1}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} variant="rectangular" width={40} height={40} />
        ))}
      </Box>
    </Box>
  );
};

export default MaintenanceSkeleton;
