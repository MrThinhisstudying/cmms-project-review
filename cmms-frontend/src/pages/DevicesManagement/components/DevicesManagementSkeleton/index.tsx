import React from "react";
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

const DevicesManagementSkeleton: React.FC = () => {
  const columnCount = 11;
  const rowCount = 10;

  return (
    <Box display="flex" sx={{ height: "calc(100vh - 120px)" }}>
      <Box
        width={220}
        p={2}
        bgcolor="#f7f7f7"
        borderRight="1px solid #e0e0e0"
        display="flex"
        flexDirection="column"
        gap={2}
      >
        {Array.from({ length: 2 }).map((_, idx) => (
          <Box
            key={idx}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            p={1.5}
            borderRadius={1}
            sx={{ backgroundColor: "#fff", boxShadow: 1 }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton width={80} height={20} />
            </Box>
            <Skeleton width={16} height={16} />
          </Box>
        ))}
      </Box>

      <Box flex={1} p={2}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Skeleton variant="text" width={250} height={32} />
          <Box display="flex" gap={1}>
            <Skeleton variant="rectangular" width={90} height={36} />
            <Skeleton variant="rectangular" width={110} height={36} />
            <Skeleton variant="rectangular" width={150} height={36} />
          </Box>
        </Box>

        <Box display="flex" gap={1} mb={2}>
          <Skeleton variant="rectangular" width="100%" height={40} />
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>

        <Box sx={{ overflow: "auto" }}>
          <Table>
            <TableBody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      {colIndex >= columnCount - 2 ? (
                        <Skeleton variant="circular" width={30} height={30} />
                      ) : (
                        <Skeleton width={30} height={30} />
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

          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            gap={1}
          >
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
    </Box>
  );
};

export default DevicesManagementSkeleton;
