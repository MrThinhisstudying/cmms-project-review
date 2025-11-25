import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Box,
  ListItemIcon,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import NearMeIcon from "@mui/icons-material/NearMe";
import AssistantIcon from "@mui/icons-material/Assistant";
import { TypographyCustom } from "../../../../components/TypographyCustom";
import { IconCustom } from "../../../../components/IconCustom";

interface StatusFilterProps {
  status: { value: string; label: string }[];
  selectedStatus: string;
  onChangeStatus: (status: string) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  status,
  selectedStatus,
  onChangeStatus,
}) => {
  const [expanded, setExpanded] = React.useState<boolean>(false);

  const handleChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      sx={{
        margin: "0 !important",
      }}
    >
      <AccordionSummary
        expandIcon={
          expanded ? (
            <IconCustom component={RemoveIcon} sx={{ color: "#6512c2" }} />
          ) : (
            <IconCustom component={AddIcon} sx={{ color: "#6512c2" }} />
          )
        }
        sx={{
          padding: "8px",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f5f5f5",
          minHeight: "auto !important",
          "& .MuiAccordionSummary-content": {
            margin: "0 !important",
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          sx={{
            gap: {
              sm: "4px",
              lg: 2,
            },
          }}
        >
          <IconCustom component={AssistantIcon} sx={{ color: "#6512c2" }} />
          <TypographyCustom customcolor="#6512c2">Trạng thái</TypographyCustom>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          padding: "0",
        }}
      >
        <Box>
          <List>
            {status.map((statusItem) => (
              <ListItem
                button
                key={statusItem.value}
                selected={selectedStatus === statusItem.value}
                onClick={() => onChangeStatus(statusItem.value)}
                sx={{
                  padding: "4px 8px",
                  alignItems: "center",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                  color: "#6512c2",
                }}
              >
                <ListItemIcon sx={{ minWidth: "32px", color: "#6512c2" }}>
                  <IconCustom
                    component={NearMeIcon}
                    sx={{ color: "#6512c2" }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <TypographyCustom customcolor="#6512c2">
                      {statusItem.label}
                    </TypographyCustom>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default StatusFilter;
